---
title: '`@antfu/ni` - 一个简单又好用的工具'
date: '2022-07-14'
tags: 
 - Node
 - ni
 - Source Code
categories:
 - FrontEnd
words: 2000
duration: 5min
description: '[`ni`](https://github.com/antfu/ni) 是由 antfu 开源的一个工具，能让开发者使用正确的包管理工具(npm, yarn, pnpm, bun)，非常简单易用。其源码实现也不是太困难，让我们来一起研究一下。'
---

[[toc]]

## 什么是 `ni`

[`ni`](https://github.com/antfu/ni) 是为了能让开发者使用正确的包管理而诞生的，它的原理是检测你的 lockfile ,即(`yarn.lock` / `pnpm-lock.yaml` / `package-lock.json` / `bun.lockb`)，或者根据 `package.json` 里的 `packageManager` 字段来检测你用的是哪个包管理。比如一个 pnpm 项目，在终端下敲 `ni`，就会执行 `pnpm install`; 敲 `nr dev`，就会执行 `pnpm run dev`。

> 很巧的是，就在本文开始撰写的当天，`ni` 发布了新版本，支持了 [`bun`](https://bun.sh/) 这个新兴的 js 运行时

它一共有这么些命令可供使用

+ `ni` - install
+ `nr` - run
+ `nx` - execute
+ `nu` - upgrade
+ `nun` - uninstall
+ `nci` - clean install
+ `na` - agent alias

## 为什么要用 `ni`

因为懒！相信 antfu 开发这款工具时一定也是抱着相同的心态。每次 `clone` 一个项目之后，都要先去看一看作者用的是什么包管理工具，再去跑 `scripts`，太麻烦了。而且 `ni` 提供的命令十分简短、易记，实在是太香了！

~~*`npm i` in a yarn project, again? F\* \* k!*~~

## `ni` 是如何实现的

其核心逻辑如下

1. 解析输入的命令
2. 检测包管理工具
3. 将其执行

命令的源码都在 src/commands 下，大多数源码，都形如以下形式

```typescript
// src/commands/ni.ts
import { parseNi } from '../parse'
import { runCli } from '../runner'

runCli(parseNi)
```

`runCli` 函数的源码是

```typescript
// src/runner.ts
export type Runner = (agent: Agent, args: string[], ctx?: RunnerContext) => Promise<string | undefined> | string | undefined

export async function runCli(fn: Runner, options: DetectOptions = {}) {
  const args = process.argv.slice(2).filter(Boolean)
  try {
    await run(fn, args, options)
  }
  catch (error) {
    process.exit(1)
  }
}
```

其通过 `process.argv` 拿到用户在命令行所输入的附带的参数，然后执行 `run(fn, args, options)`

可以看到核心就是 `run` 函数了，让我们来分析分析。

```typescript
export async function run(fn: Runner, args: string[], options: DetectOptions = {}) {
  // 01  是否开启debug模式
  const debug = args.includes(DEBUG_SIGN)
  if (debug)
    remove(args, DEBUG_SIGN)

  let cwd = process.cwd()
  let command

  // 02 -C option, 表示Change directory
  if (args[0] === '-C') {
    cwd = resolve(cwd, args[1])
    args.splice(0, 2)
  }

  // 03 处理 带有-g 的命令 
  const isGlobal = args.includes('-g')
  if (isGlobal) {
    command = await fn(await getGlobalAgent(), args)
  }
  else {
    // 04 检测包管理工具
    let agent = await detect({ ...options, cwd }) || await getDefaultAgent()
    if (agent === 'prompt') {
      agent = (await prompts({
        name: 'agent',
        type: 'select',
        message: 'Choose the agent',
        choices: agents.filter(i => !i.includes('@')).map(value => ({ title: value, value })),
      })).agent
      if (!agent)
        return
    }
    // 05 生成相应命令
    command = await fn(agent as Agent, args, {
      hasLock: Boolean(agent),
      cwd,
    })
  }

  if (!command)
    return

  // 06 针对 volta 做特殊处理
  const voltaPrefix = getVoltaPrefix()
  if (voltaPrefix)
    command = voltaPrefix.concat(' ').concat(command)

  if (debug) {
    // eslint-disable-next-line no-console
    console.log(command)
    return
  }
	
  // 07 执行相应命令
  await execaCommand(command, { stdio: 'inherit', encoding: 'utf-8', cwd })
}
```

笔者将逻辑剖析成了7部分

### 01 debug模式

在同文件下，有一个 `DEBUG_SIGN` 变量

```typescript
// src/runner.ts
const DEBUG_SIGN = '?'
```

见 `run()` 函数的49-53行

```typescript
if (debug) {
  // eslint-disable-next-line no-console
  console.log(command)
  return
}
```

即在 debug 模式下，会在控制台打印解析出来的命令，不会执行。我们可以试试，以 `ni` 本身项目为例子

<img src="/images/ni-1-dark.png" rounded-lg img-dark />
<img src="/images/ni-1-light.png" rounded-lg img-light />

### 02 -C option

`-C` 代表 change directory,即更换相应的目录。 

```typescript
if (args[0] === '-C') {
  // resolve是从node的path包中导入的
  // 在这里，cwd更新为新的目录,并把-C [name]从args中删除
  cwd = resolve(cwd, args[1])
  args.splice(0, 2)
}
```

同样的，举个例子

<img src="/images/ni-2-dark.png" rounded-lg img-dark />
<img src="/images/ni-2-light.png" rounded-lg img-light />

`-C ni` 代表我们切换到了 `projects/ni` 目录

### 03 -g

既然带有 `-g` 参数，那么策略就是试图去寻找全局的包管理。反映在代码中，可以看到给 fn 的第一个参数是 `await getGlobalAgent()`。antfu 采用的逻辑是，先看 `package.json` 中是否存在 `packageManager`，若没有的话，则采用 `ni` 的全局配置(在 `.nirc` 文件中)，还是没有，那么就给默认值(`npm`)

其实现如下

```typescript
import { findUp } from 'find-up'
import ini from 'ini'

interface Config {
  defaultAgent: Agent | 'prompt'
  globalAgent: Agent
}

const defaultConfig: Config = {
  defaultAgent: 'prompt',
  globalAgent: 'npm',
}

let config: Config | undefined

export async function getConfig(): Promise<Config> {
  // 这个条件相当于做了“缓存“处理，优化了细节，学习了
  if (!config) {
    // 这里的findUp是从find-up中导入的。find-up是一个不错的包，用于寻找某文件
    const result = await findUp('package.json') || ''
    let packageManager = ''
    if (result)
      packageManager = JSON.parse(fs.readFileSync(result, 'utf8')).packageManager ?? ''
    
    // 利用正则的()去做捕获组，捕获出agent和version，学习了
    // Object.values(LOCKS)的结果是["npm", "pnpm", "yarn@berry","yarn","pnpm@6","bun"]
    const [, agent, version] = packageManager.match(new RegExp(`^(${Object.values(LOCKS).join('|')})@(\d).*?$`)) || []
    if (agent)
      config = Object.assign({}, defaultConfig, { defaultAgent: (agent === 'yarn' && parseInt(version) > 1) ? 'yarn@berry' : agent })
    else if (!fs.existsSync(rcPath))
      config = defaultConfig
    else
      config = Object.assign({}, defaultConfig, ini.parse(fs.readFileSync(rcPath, 'utf-8')))
  }
  return config
}

export async function getGlobalAgent() {
  const { globalAgent } = await getConfig()
  return globalAgent
}
```

那么，`command = await fn(await getGlobalAgent(), args)`中，`fn` 的实现又是怎么样的？别急，在[05](###05 生成相应命令)会讲

### 04 检测包管理工具

核心在这一行

```typescript
let agent = await detect({ ...options, cwd }) || await getDefaultAgent()
```

`getDefaultAgent()` 的实现和 `getGlobalAgent()` 十分类似

```typescript
export async function getDefaultAgent() {
  const { defaultAgent } = await getConfig()
  // process.env.CI又是一个细节
  // 这里的CI就是我们老生常谈的CI/CD中的CI
  // 像Github Actions, Netlify这种做CI的工具，会将process.env.CI设置成true
  if (defaultAgent === 'prompt' && process.env.CI)
    return 'npm'
  return defaultAgent
}
```

`detect()` 实现如下

```typescript
export interface DetectOptions {
  autoInstall?: boolean
  cwd?: string
}

// LOCKS 定义如下
LOCKS: Record<string, Agent> = {
  'bun.lockb': 'bun',
  'pnpm-lock.yaml': 'pnpm',
  'yarn.lock': 'yarn',
  'package-lock.json': 'npm',
  'npm-shrinkwrap.json': 'npm',
}

export async function detect({ autoInstall, cwd }: DetectOptions) {
  let agent: Agent | null = null

  const lockPath = await findUp(Object.keys(LOCKS), { cwd })
  let packageJsonPath: string | undefined

  if (lockPath)
    packageJsonPath = path.resolve(lockPath, '../package.json')
  else
    packageJsonPath = await findUp('package.json', { cwd })

  // read `packageManager` field in package.json
  if (packageJsonPath && fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
      if (typeof pkg.packageManager === 'string') {
        const [name, version] = pkg.packageManager.split('@')
        if (name === 'yarn' && parseInt(version) > 1)
          agent = 'yarn@berry'
        else if (name === 'pnpm' && parseInt(version) < 7)
          agent = 'pnpm@6'
        else if (name in AGENTS)
          agent = name
        else
          console.warn('[ni] Unknown packageManager:', pkg.packageManager)
      }
    }
    catch {}
  }

  // detect based on lock
  if (!agent && lockPath)
    agent = LOCKS[path.basename(lockPath)]

  // auto install
  if (agent && !cmdExists(agent.split('@')[0])) {
    if (!autoInstall) {
      console.warn(`[ni] Detected ${agent} but it doesn't seem to be installed.\n`)

      if (process.env.CI)
        process.exit(1)

      const link = terminalLink(agent, INSTALL_PAGE[agent])
			// prompts包用于命令行交互
      // 即用户未下载该包管理时，提示其是否需要下载
      const { tryInstall } = await prompts({
        name: 'tryInstall',
        type: 'confirm',
        message: `Would you like to globally install ${link}?`,
      })
      if (!tryInstall)
        process.exit(1)
    }

    // 从execa包中导入的，用于执行命令
    await execaCommand(`npm i -g ${agent}`, { stdio: 'inherit', cwd })
  }

  return agent
}
```

可以看到，`packageManager` 字段拥有最高的优先级，其次是根据 `lockfile` 获取相应的包管理。

如果都没取到结果，那么轮到 `getDefaultAgent()` 执行，它的结果是 `prompt`

结合代码可知，是让用户自己选择一款包管理

### 05 生成相应命令

```typescript
// 05 生成相应命令
command = await fn(agent as Agent, args, {
  hasLock: Boolean(agent),
  cwd,
})
```

到这里，就要回头看看 `fn` 是如何实现的。以 `parseNi` 为例

```typescript
// AGENTS	这一结构存储了相应的包管理以及其命令
// 如
/* AGENTS = {
  'npm': {
    // ...
    'install': 'npm i {0}',
    // ...
  },
  // ...
}
*/
export function getCommand(
  agent: Agent,
  command: Command,
  args: string[] = [],
) {
  if (!(agent in AGENTS))
    throw new Error(`Unsupported agent "${agent}"`)

  // 取出相应的原始命令
  const c = AGENTS[agent][command]

  if (typeof c === 'function')
    return c(args)

  if (!c)
    throw new Error(`Command "${command}" is not support by agent "${agent}"`)
  // 替换成可执行的命令
  return c.replace('{0}', args.join(' ')).trim()
}

export const parseNi = <Runner>((agent, args, ctx) => {
  if (args.length === 1 && args[0] === '-v') {
    // eslint-disable-next-line no-console
    console.log(`@antfu/ni v${version}`)
    process.exit(0)
  }

  // bun use `-d` instead of `-D`, #90
  if (agent === 'bun')
    args = args.map(i => i === '-D' ? '-d' : i)

  if (args.includes('-g'))
    return getCommand(agent, 'global', exclude(args, '-g'))

  if (args.includes('--frozen-if-present')) {
    args = exclude(args, '--frozen-if-present')
    return getCommand(agent, ctx?.hasLock ? 'frozen' : 'install', args)
  }

  if (args.includes('--frozen'))
    return getCommand(agent, 'frozen', exclude(args, '--frozen'))

  if (args.length === 0 || args.every(i => i.startsWith('-')))
    return getCommand(agent, 'install', args)

  return getCommand(agent, 'add', args)
})
```

逻辑：替换成相应包管理的相应命令（提前写好的常量），并将参数置入，得到一个可执行的命令

### 06 针对 volta 做特殊处理

[volta](https://volta.sh/) 是一款JS工具管理器，本文不过多介绍

### 07 执行相应命令

用到了 `execa` 包的 `execaCommand` 来执行



## 小结

这回读了源码，了解到了Node的些许知识，以及`fast-glob`，`execa`, `unbuild` 这些很不错的第三方库，收获不少

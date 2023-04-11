---
title: '从零开始，写一个 mini-Vue3 —— 第零章：准备工作'
date: '2022-08-19'
tags:
 - Vue
words: 1000
duration: 3min
description: "*'What I cannot create, I do not understand' - Richard Feynman*。写一个 mini Vue3，是为了更好地理解 Vue3！Let's go!"
---

[[toc]]

# 前言

阅读了[霍春阳](https://github.com/HcySunYang)大佬所著的《Vue.js 设计与实现》一书后，学到了 Vue3 中很多的技术细节。因此，笔者尝试基于该书与 Vue 源码，写一个 mini-vue3。笔者会尽量尝试兼顾对 Vue 源码的讲解与对 mini-vue3 的编写，并把思路尽可能直白地摆出来，毕竟从零到一的过程才是最难能可贵的

> 真的是写得非常棒的一本书，很建议想学习研究 Vue 源码的朋友们购买

# workspace

[Vue3](https://github.com/vuejs/core) 整体是采用了 [`pnpm workspace`](https://pnpm.io/zh/workspaces) 这样一种结构。那我们也来照葫芦画瓢一下。新建一个名为 mini-vue3 的文件夹，然后执行`pnpm init`，这时候项目根目录下就有了一个 package.json 文件。读者可以根据自己的需求改一下默认的 package.json。随后根目录下新建 pnpm-workspace.yaml，写入

```yaml
packages:
  - 'packages/*'
```

即可。这样我们就完成了 workspace 的搭建。

# ESLint

[ESLint](https://eslint.org/) 当然也是不可或缺的开发利器，我们用它来纠正简单的语法错误和统一代码风格。不过嘛，反正我们是自己写着玩的，可以不和 [Vue3 的 ESLint](https://github.com/vuejs/core/blob/main/.eslintrc.js) 一致，而且可以看到 Vue3 是以 [ES2015](https://github.com/vuejs/core/blob/main/.eslintrc.js#L20) 作为一个基准的支持的，相对来说还是蛮老的。笔者这里就直接执行  `pnpm create @eslint/config`，按自己喜欢的来配置了。 

# Prettier

[Prettier](https://prettier.io/) 也被用来统一代码风格使用。笔者直接挪用了 Vue 的 Prettier 配置

根目录新建 `.prettierrc.yaml` 如下

```yaml
semi: false
singleQuote: true
printWidth: 80
trailingComma: 'none'
arrowParens: 'avoid'

```

> 关于 ESLint 与 Prettier 在实际使用的抉择，其实是个见仁见智的问题。但是有一点要求是不变的：遵循其配置

# Vitest

测试框架当然也是必不可少的。Vue3 是应用了 Jest 作为测试框架的，笔者是想用 [Vitest](https://cn.vitest.dev/) 来替代，应该问题不大。Vue3 的 Jest 配置了全局变量，setup file，coverage 规则等等，笔者先将 Jest 的 moduleNameMapper 迁移过来，其他的配置，等需要了再添加上

> 现在 Vue 也迁移到 Vitest 了！

vitest.config.ts 如下

```typescript
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

function resolvePath(path: string) {
  return resolve(__dirname, path)
}

export default defineConfig({
  test: {
    environment: 'jsdom'
  },
  resolve: {
    alias: [
      {
        find: /^@mini-vue3\/(.*?)$/,
        replacement: resolvePath('./packages/$1/src')
      },
      {
        find: 'mini-vue3',
        replacement: resolvePath('./packages/vue/src')
      }
    ]
  }
})

```

# Typescript

稍微更改一下 tsconfig.json 即可

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "outDir": "dist",
    "sourceMap": false,
    "target": "es2016",
    "useDefineForClassFields": false,
    "module": "esnext",
    "moduleResolution": "node",
    "allowJs": false,
    "strict": true,
    "noUnusedLocals": true,
    "experimentalDecorators": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "removeComments": false,
    "jsx": "preserve",
    "lib": ["esnext", "dom"],
    "types": ["node"],
    "rootDir": ".",
    "paths": {
      "@mini-vue3/*": ["packages/*/src"],
      "mini-vue3": ["packages/vue/src"]
    }
  },
  "include": [
    "packages/*/src",
    "packages/*/__tests__"
  ]
}

```



# 调试相关

经过笔者的实践，[Vitest 官网](*https://cn.vitest.dev/guide/debugging.html*) 所提供的 launch.json 已经足够调试使用。在 **.test.ts 文件下，在希望调试的地方加一个 debugger ，按 F5 即可进行调试。调试对研究源码的运作是非常有益的。

新建 .vscode 文件夹，添加 launch.json 文件，写入如下内容

```json
{
  // see https://cn.vitest.dev/guide/debugging.html
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Current Test File",
      "autoAttachChildProcesses": true,
      "skipFiles": ["<node_internals>/**", "**/node_modules/**"],
      "program": "${workspaceRoot}/node_modules/vitest/vitest.mjs",
      "args": ["run", "${relativeFile}"],
      "smartStep": true,
      "console": "integratedTerminal",

      "env": {
        "NODE_ENV": "development"
      },
      "sourceMaps": true
    }
  ]
}
```

贴个例子

<img src="/images/mini-vue3-0-p1-dark.png" img-dark rounded-lg />

<img src="/images/mini-vue3-0-p1-light.png" img-light rounded-lg />

# CI

使用 Github Actions 帮助我们完成 CI 流程。先写一个单测的 CI，对 push 与 PR 都检查其是否能覆盖每个单测

项目根目录下新建 .github/workflows/ci.yml，写入

```yaml
name: 'ci'
on:
  push:
    branches:
      - '**'
  pull_request:
    branches:
      - main
jobs:
  unit-test:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest]
        node: [16.x, 18]

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v2

      - name: Install pnpm
        uses: pnpm/action-setup@v2

      - name: Set node ${{ matrix.node }}
        uses: actions/setup-node@v2
        with:
          node-version: ${{ matrix.node }}
          cache: 'pnpm'

      - run: pnpm i

      - name: Run unit tests
        run: pnpm test
```



#  小结

Done！仓库在[这里](https://github.com/GODLiangCY/mini-vue3)，后续的更新也会同步到仓库，欢迎点个 star 支持笔者！

# 系列指路

[从零开始，写一个mini-vue3——第零章：准备工作]()

[从零开始，写一个mini-vue3——第一章：响应性系统Ⅰ](./mini-vue3-1)


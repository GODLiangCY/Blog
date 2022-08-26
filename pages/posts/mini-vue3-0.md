---
title: '从零开始，写一个mini-vue3——第零章：准备工作'
date: '2022-08-23'
tags:
 - Vue
words: 420
duration: 1min
description: "*'What I cannot create, I do not understand' - Richard Feynman*。写一个 mini Vue3，是为了更好地理解 Vue3！Let's go!"
---

# workspace

[Vue3](https://github.com/vuejs/core) 整体是采用了 `pnpm` + `monorepo` 这样一种结构。那我们也来照葫芦画瓢一下。新建一个名为 mini-vue3 的文件夹，然后执行`pnpm init`，这时候项目根目录下就有了一个 package.json 文件。读者可以根据自己的需求改一下默认的 package.json，并在 `packageManager` 字段下指定 pnpm 以及其版本。随后根目录下新建 pnpm-workspace.yaml，写入

```yaml
packages:
  - 'packages/*'
```

即可。这样我们就完成了 workspace 的搭建。

# ESLint

ESLint 当然也是不可或缺的开发利器，我们用它来纠错和统一代码风格，这样就不需要 prettier 了。关于用 ESLint 来统一代码风格，还需要手动设置一下。若读者使用的是 VS Code，建议在用户的 settings.json 下写入

```json
"editor.codeActionsOnSave": {
  "source.fixAll": false,
  "source.fixAll.eslint": true,   // this allows ESLint to auto fix on save
  "source.organizeImports": false  // if set to true, this will add a semi to the end of the line, mdzz
},
"eslint.validate": [
  "javascript",
  "typescript",
  "javascriptreact",
  "typescriptreact",
  "vue",
  "html",
  "yaml"
],
"eslint.probe": [
  "javascript",
  "typescript",
  "javascriptreact",
  "typescriptreact",
  "vue",
  "html",
  "yaml"
],
```

以确保 ESLint 能正确工作。

不过嘛，反正我们是自己写着玩的，可以不和 [Vue3 的 ESLint](https://github.com/vuejs/core/blob/main/.eslintrc.js) 一致，而且可以看到 Vue3 是以 [ES2015](https://github.com/vuejs/core/blob/main/.eslintrc.js#L20) 作为一个基准的支持的。笔者认为直接按自己喜欢的来就好。执行 `pnpm create @eslint/config` ，配置自己想要的即可。

# Vitest

测试框架当然也是必不可少的。Vue3 是应用了 Jest 作为测试框架的，笔者是想用 Vitest 来替代，应该问题不大。反正后面出问题了还能改。

# Typescript

抄一下 tsconfig.json

#  小结

Done！现在项目[长这样](https://github.com/GODLiangCY/mini-vue3/tree/c1abfc95c8b1eeff622dbf8b0a4595b79a5182cf)

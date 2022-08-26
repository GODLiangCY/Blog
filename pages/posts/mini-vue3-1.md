---
title: '从零开始，写一个mini-vue3——第一章：响应性系统'
date: '2022-08-26'
tags:
  - Vue
description: "写一个响应性系统！实现 `@vue/reactivity` && '@vue/reactivity-transform'"
words:
duration:
---

# reactivity

让我们先从如何实现 `@vue/reactivity` 开始讲起。

首先，关于什么是响应性系统，响应性系统是如何工作、实现的，[官方文档](https://cn.vuejs.org/guide/extras/reactivity-in-depth.html)都给出了十分优秀的回答。通过阅读，我们得知了其大致的逻辑就是：

+ 把响应性的数据包装成一个响应性对象，利用 `getter/setter` or `Proxy` 追踪其属性的读/写
+ 当属性被读取时，存储相应的<span id="effect">副作用函数</span>
+ 当属性值变化时，触发所有相应的副作用函数

那么，再推进一步，响应性系统的本质是，通过追踪属性的**变化**，在属性与副作用函数之间建立起一个桥梁，是*发布 —— 订阅 模式* 的一种实现

事实上，对官网给出的 demo 稍微做些改变，就能得到一个基本的很简单的响应性系统

## reactive

以 `reactive()` API 为例，它接受一个值类型为对象的值作为其参数，利用 `Proxy` 实现一个深层的响应性代理。任何对于响应性数据的更改，都会触发 `Proxy` 中与其对应的 `handler`。`handler` 中会去做 `track()` 和 `trigger()`，以保证响应性



我们可以先从最简单的值类型为object的普通 JS 对象去考虑，代理一个普通对象需要哪些 `handler`？

- `get()`，代理属性的读取操作，场景：`const propVal = obj.key`

- `set()`，代理属性的设置操作，场景：`obj.key = 'foo'`

- `has()`，代理 `in` 操作符，场景：`key in obj`

- `deleteProperty`，代理 `delete` 操作符，场景：`delete obj.key`

- `ownKeys()`，代理 `Object.getOwnPropertyNames` 方法和 `Object.getOwnPropertySymbols` 方法，场景：`for (const key in obj)`。

  > 为什么 `for-in` 循环是由 `ownKeys()` handler 代理的？这似乎有些不太直观。 不过可以从 ECMAScript 规范的角度去阐述。
  >
  > 1. ECMA-262规范的[10.5节](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#table-proxy-handler-methods)有一个 Proxy Handler Methods 表，列出了 Proxy 对象所部署的内部方法以及对应的 handler，其中 `ownKeys()` 对应着 `[[OwnPropertyKeys]]` 内部方法。
  >
  > 2. ECMA-262规范的[14.7.5.6节](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-runtime-semantics-forinofheadevaluation)定义了 `for-in`，`for-of` 的实现标准，注意看第6步的 c. Let iterator be [EnumerateObjectProperties](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-enumerate-object-properties)(obj). 阅读该方法的规范，其中有提到：
  >
  >    EnumerateObjectProperties must obtain the own [property keys](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-object-type) of the target object by calling its **[[OwnPropertyKeys]]** internal method.
  >
  > 这说明 `for-in` 循环头部，是要执行 `[[OwnPropertyKeys]]` 内部方法的，而 `ownKeys()` 能代理该内部方法，也就是说能够处理 `for-in` 循环

接下来要做的，就是编写这些 handler 的逻辑。

### get() && set() handler

先从这两个 handler 入手。我们需要做的，就是在 `get()` 中追踪依赖，在 `set()` 中触发依赖。上文有谈到过[副作用函数](#effect)一词，其作用是，把对响应性对象的属性的修改操作，全部作为一个副作用函数。这样的话，我们就可以编写一个 `effect(fn)` 函数，`fn` 是副作用函数，我们用 `effect(fn)` 去控制执行副作用函数的过程。

到这里，我们就要不可避免地涉及到 ``

[文档](https://cn.vuejs.org/guide/extras/reactivity-in-depth.html#how-reactivity-works-in-vue)提到了，副作用订阅将被存储在一个全局的 `WeakMap<target, Map<key, Set<effect>>>` 数据结构中。如果在第一次追踪时没有找到对相应属性订阅的副作用集合，它将会在这里新建。

# reactivity-transform

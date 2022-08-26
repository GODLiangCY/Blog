---
title: 阅读Koa源码小记
date: '2022-05-20'
tags: 
 - Node
 - Koa
 - Source Code
categories:
 - BackEnd
words: 1600
duration: '4min'
description: 'Koa向来以小而美著称，简洁且易于上手，是小项目开发的不二选择。

笔者旨在学习Koa2.13.1源码的设计与实现'
---

[[toc]]

## 前置工作

上Github找到相应的[Koa版本](https://github.com/koajs/koa/releases/tag/2.13.1)，下载过来并解压



## 初窥全貌

浏览Koa的 `package.json` 文件，发现

```json
{
  "main": "lib/application.js",
  "exports": {
    ".": {
      "require": "./lib/application.js",
      "import": "./dist/koa.mjs"
    }
  }
}

```

由此不难看出，lib 文件夹下的 `application.js` 正是 Koa 的主体所在。此外，Koa 的源码全部在 lib 文件夹下，而 lib 文件夹十分简洁，只有四个文件

+ application.js       Koa 主体
+ context.js           Koa 上下文
+ request.js           封装request
+ response.js         封装response

总的来看 `application.js` 的代码，能发现 Koa 的实现其实并不复杂。其核心部分如下

```js
const Emitter = require('events')

module.exports = class Application extends Emitter {
    constructor(options) {
        super()
        
        // initalize...
    }
    
    // 起一个服务器
    listen(...args) { }
    
    // 注册middleware
    use(fn) { }
}
```

是的，就是这么简单，和我们使用 Koa 一样简单！

整个 Koa 应用是一个基于 Node 里面的事件触发器的类。它在 Node 中有着相当重要的地位，我们看看[官网](http://nodejs.cn/api/events.html)是怎么说的

> Node.js 的大部分核心 API 都是围绕惯用的异步事件驱动架构构建的，在该架构中，某些类型的对象（称为"触发器"）触发命名事件，使 `Function` 对象（"监听器"）被调用。
>
> 例如：[`net.Server`](http://nodejs.cn/api/net.html#class-netserver) 对象在每次有连接时触发事件；[`fs.ReadStream`](http://nodejs.cn/api/fs.html#class-fsreadstream) 在打开文件时触发事件；[流](http://nodejs.cn/api/stream.html)在每当有数据可供读取时触发事件。
>
> 所有触发事件的对象都是 `EventEmitter` 类的实例。这些对象暴露了 `eventEmitter.on()` 函数，允许将一个或多个函数绑定到对象触发的命名事件。

> 以下示例展示了使用单个监听器的简单的 `EventEmitter` 实例。 `eventEmitter.on()` 方法用于注册监听器，`eventEmitter.emit()` 方法用于触发事件。
>
> ```js
> const EventEmitter = require('node:events');
> 
> class MyEmitter extends EventEmitter {}
> 
> const myEmitter = new MyEmitter();
> myEmitter.on('event', () => {
>   console.log('an event occurred!');
> });
> myEmitter.emit('event');
> ```

这种经典的 `.on` 式的回调写法，在 Node 中无处不在，如 http.Server 等。可以说 `EventEmitter` 是 Node 异步 IO 机制的基石。



## 中间件模式

提到 Koa，就免不了要提到其中间件模式。它正是 Koa 设计上的精髓所在。请求到了服务器，依次按序被注册的中间件所处理。其相关实现并不复杂

```js
class Application extends Emitter {
    constructor(options) {
        super()
        this.middleware = []    // 存放中间件
        // ...
    }
    
    use(fn) {
        if (typeof fn !== 'function') throw new TypeError('middleware must be a function!')
        debug('use %s', fn._name || fn.name || '-')
        this.middleware.push(fn)
        return this        // 提供链式调用的能力
    }
}
```

处理中间件模式的 `Server` 结构是这样的

```js
const compose = require('koa-compose')
const onFinished = require('on-finished')

class Application extends Emitter {
    listen (...args) {
        debug('listen')
        const server = http.createServer(this.callback())   // 通过原生的http.createServer创建
        return server.listen(...args)
    }
    
    // 为Node的原生http server返回一个request handler
    callback() {
        // 将所有的中间件组合成一个函数，该函数返回一个Promise
        const fn = compose(this.middleware)

        // 如果没有注册error回调，则注册默认的onerror
        if (!this.listenerCount('error')) this.on('error', this.onerror)

        const handleRequest = (req, res) => {
          const ctx = this.createContext(req, res)
          return this.handleRequest(ctx, fn)
        }

        return handleRequest
    }
    
    handleRequest (ctx, fnMiddleware) {
        const res = ctx.res
        res.statusCode = 404
        const onerror = err => ctx.onerror(err)
        const handleResponse = () => respond(ctx)
        // on-finished包的作用是
        // Execute a callback when a HTTP request closes, finishes, or errors.
        // 这行代码会在res出错时，执行onerror函数
        onFinished(res, onerror)
        // ctx会作为最初的context，传给中间件
        return fnMiddleware(ctx).then(handleResponse).catch(onerror)
  	}
    
    // 根据请求与响应，创建上下文
    createContext(req, res) {
        
    }
    
    //默认error handler
    onerror(err) {
        
    }
}

// response helper
function respond(ctx) { 
	//...
}
```

### koa-compose

接上，我们先来看 [koa-compose](https://github.com/koajs/compose) 这个工具，它用于将中间件整合起来。其源码只有短短48行，相当精简。直接贴上附带注释的源码

```js
'use strict'

/**
 * Expose compositor.
 */

module.exports = compose

/**
 * Compose `middleware` returning
 * a fully valid middleware comprised
 * of all those which are passed.
 *
 * @param {Array} middleware
 * @return {Function}
 * @api public
 */

function compose (middleware) {
  if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!')
  for (const fn of middleware) {
    if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!')
  }

  /**
   * @param {Object} context
   * @return {Promise}
   * @api public
   */

  return function (context, next) {
    // last called middleware #
    let index = -1
    return dispatch(0)
    function dispatch (i) {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
      index = i
      let fn = middleware[i]
      if (i === middleware.length) fn = next
      if (!fn) return Promise.resolve()
      try {
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)))
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
}
```

其核心就在于 `dispatch` 函数。该函数依次取出 `middleware` 中的函数，并将其通过 `Promise.resolve()` 串联在一起。只要 `middleware` 中的函数执行了 `next()`，下一个函数也将紧跟着执行，直到遍历完整个 `middleware` 数组。得益于 **Event Loop**，`Promise.resolve()` 使所有异步函数依次在微任务队列里执行完。这里还用 `index` 指向上一个被调用的 `middleware function`，所以出现了闭包结构。

## Settings

Koa 还支持[设置实例的一些属性](https://koajs.com/#application)，如 `app.env`, `app.keys` 等。 

这个就比较简单了,其相关实现如下

```js
/**
    *
    * @param {object} [options] Application options
    * @param {string} [options.env='development'] Environment
    * @param {string[]} [options.keys] Signed cookie keys
    * @param {boolean} [options.proxy] Trust proxy headers
    * @param {number} [options.subdomainOffset] Subdomain offset
    * @param {string} [options.proxyIpHeader] Proxy IP header, defaults to X-Forwarded-For
    * @param {number} [options.maxIpsCount] Max IPs read from proxy IP header, default to 0 (means infinity)
    *
    */

  constructor (options) {
    super()
    options = options || {}
    this.proxy = options.proxy || false
    this.subdomainOffset = options.subdomainOffset || 2
    this.proxyIpHeader = options.proxyIpHeader || 'X-Forwarded-For'
    this.maxIpsCount = options.maxIpsCount || 0
    this.env = options.env || process.env.NODE_ENV || 'development'
    if (options.keys) this.keys = options.keys
  }
```

## request，response，context

在 Node 的原生 http 模块中，[`http.createServer`](http://nodejs.cn/api/http.html#httpcreateserveroptions-requestlistener) 接受 `requestListener` 回调函数作为其参数。该函数的两个参数 `request` 和 `response`，是分别基于 `http.IncomingMessage` 类和 `http.ServerResponse` 类的。在 Koa 中，为了简化、方便开发者对其的处理，Koa 自己封装了 `request` 和 `response`，可以理解为对原生 `IncomingMessage` 和 `ServerResponse` 的一层抽象。

`context` 则是将 `request` 和 `response` 对象封装成一个对象，为开发提供了很多有用的属性与 API

lib 文件夹的三个相应的文件，正是书写了这三者的 `Prototype`，在 Koa 主体中以 `Object.create(proto)` 的方式使用。

`context.js` 中还利用了 `delegates` 这个年久失修的包，凭借委托的设计模式来控制 `context` 上的 `request` 和 `response` 的行为。

例如

```js
const delegate = require('delegates')

const proto = module.exports = { }

delegate(proto, 'response')
  .method('attachment')
  .method('redirect')
  .method('remove')
  .method('vary')
```

其[源代码](https://github.com/tj/node-delegates/blob/master/index.js#L107)里居然还出现了用 `proto.__defineGetter__` 来改写[[ Get ]]行为的写法。17年有位老哥提了个用 `Object.defineProperty` 代替的 [PR](https://github.com/tj/node-delegates/pull/20)，也没人管...    

详细内容，读者若有兴趣可自行查阅，文档与源码照着一起看。

## 小结

这应该是笔者首次尝试去阅读一个开源项目的源码，受益良多。希望日后能不断地阅读优秀源码，不断变强


---
title: '从零开始，写一个mini-vue3——第一章：响应性系统Ⅰ'
date: '2022-08-26'
tags:
  - Vue
description: "写一个响应性系统！实现 `@vue/reactivity`"
words: 6500
duration: 17min
---

[[toc]]

# 前言

写一个 mini vue3 的第一步：从响应性系统开始写起！关于 Vue 的响应性系统，相关的 packages 有 `@vue/reactivity` 与 `@vue/reactivity-transform`，本文讲述如何实现前者。后者是目前 Vue 仍在实验性的[功能](https://cn.vuejs.org/guide/extras/reactivity-transform.html)，是在编译时的转换步骤，在阅读完编译相关源码之后，再去研究其实现。

首先，关于什么是响应性系统，响应性系统是如何工作、实现的，[官方文档](https://cn.vuejs.org/guide/extras/reactivity-in-depth.html)都给出了十分优秀的回答。通过阅读，我们得知了其大致的逻辑就是：

+ 把数据包装成一个响应性对象，利用 `getter/setter` or `Proxy` 追踪其属性的读/写
+ 当属性被读取时，存储相应的<span id="effect">副作用函数</span>
+ 当属性值变化时，触发所有相应的副作用函数

那么，再推进一步，响应性系统的本质是，通过追踪属性的**变化**，在属性与副作用函数之间建立起一个桥梁，是*发布 —— 订阅 模式* 的一种实现

事实上，对官网给出的 demo 稍微做些改变，就能得到一个基本的很简单的响应性系统

# reactive()

以 `reactive()` API 为例，它接受一个值类型为对象的值作为其参数，利用 `Proxy` 实现一个深层的响应性代理。任何对于响应性数据的更改，都会触发 `Proxy` 中与其对应的 `handler`。`handler` 中会去做 `track()` 和 `trigger()`，以保证响应性

## 代理对象

读者可以上 [GitHub 仓库](https://github.com/GODLiangCY/mini-vue3)查看[本次提交](https://github.com/GODLiangCY/mini-vue3/commits/ad0c653c)，或者 clone 到本地看。为了节省篇幅，笔者贴出简化后的关键代码如下

```typescript
// reactive.ts
import { track, trigger } from './effect.ts'
export function reactive(target: object) {
	return new Proxy(target, {
    get(target, key) {
      track(target, key)
      return target[key]
    },
    set(target, key, value) {
      trigger(target, key)
      target[key] = value
      return true
    }
  })
}
```

```typescript
//effect.ts
type Dep = Set<ReactiveEffect>
type KeyToDepMap = Map<any, Dep>
const targetMap = new WeakMap<any, KeyToDepMap>()

export interface ReactiveEffect<T = any> {
  (): T
  deps: Dep[]
}

export let activeEffect: ReactiveEffect | undefined
// stores all effects, which allow nested effects to work
const effectStack: ReactiveEffect[] = []

export function effect<T = any>(fn: () => T): ReactiveEffect<T> {
  const effect = createReactiveEffect(fn)
  effect()
  return effect
}

function createReactiveEffect<T = any>(fn: () => T): ReactiveEffect<T> {
  const effect = function() {
    return run(effect, fn)
  } as ReactiveEffect
  effect.deps = []
  return effect
}

function run(effect: ReactiveEffect, fn: () => void): unknown {
  // avoid recursively calling itself
  if (!effectStack.includes(effect)) {
    cleanup(effect)
    try {
      effectStack.push(effect)
      activeEffect = effect
      // when executing this.fn()
      // set() && get() handler of Proxy will be triggered
      // and deps will be automatically collected
      return fn()
    } finally {
      effectStack.pop()
      activeEffect = effectStack[effectStack.length - 1]
    }
  }
}

function cleanup(effect: ReactiveEffect) {
  const { deps } = effect
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect)
    }
    deps.length = 0
  }
}

export function track(target: object, key: unknown) {
  if (activeEffect) {
    let depsMap = targetMap.get(target)
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if (!dep) {
      depsMap.set(key, (dep = createDep()))
    }
    if (!dep.has(activeEffect)) {
      dep.add(activeEffect)
      activeEffect.deps.push(dep)
    }
  }
}

export function trigger(target: object, key: unknown) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  const effects = depsMap.get(key)
  if (effects) {
    [...effects].forEach(effect => effect())
  }
}
```

终端运行 `pnpm test`，所有单测也都成功通过了。当然，单测是从 Vue3 的仓库直接 copy 过来的。可以看到，我们利用 `Proxy` 和 `WeakMap<Target, <Map<any, Dep>>>` 数据结构，实现了基本的响应能力，而且是”自动“的，只要对一个响应性对象进行读写，`track()` 与 `trigger()` 就会被触发，使得 `effect` 自动执行。在执行副作用函数之前，`cleanup()` 函数清理了它与 `Dep` 之间的依赖关系，这使响应性系统能够应付分支切换( e.g. 三元表达式)的情况。`effectStack` 存储 `effect` ，使嵌套 `effect` 能够运行。

整个响应性系统，都离不开 `effect()`，正确理解 `effect`，也能更好地更快地吸纳响应性系统的原理。可以认为 `effect` 是支撑响应性系统运作的基石，它接受一个 `fn` 函数参数，将其包裹成一个能够自动收集依赖的副作用函数。[下文](#Computed())还将拓展目前的 `effect`，让使用者能够调度执行 `effect`。

### 完善代理

但是，目前的代码并不完善。对于一个值类型为object的普通 JS 对象，要代理它，还缺失了以下 `handler`

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

`has()` 的逻辑其实十分简单。因为 `in` 操作符是用来访问属性的，在访问时，只需执行 `track()`

```typescript
has(target, key) {
  const result = Reflect.has(target, key)
  track(target, key)
  return result
}
```

`deleteProperty()` 和 `ownKeys()` 的编写就要稍微涉及到 `track()` 与 `trigger()` 逻辑的变动了，因为我们不再只需要简单地追踪或触发相关依赖了。

先来看看`ownKeys()`。我们只能通过`ownKeys()` 拿到 `target` 这一个参数，这意味着我们无法和之前一样，通过一个具体的 key 值，去创建/读取 Map，存储 `ReactiveEffect`。因此，Vue 的策略是创建了一个专门的 key，即 `Symbol('iterate')`，给 `for-in` 迭代使用。

```typescript
ownKeys(target) {
  track(target, ITERATE_KEY)
  return Reflect.ownKeys(target)
}
```

什么时候需要触发和 `ITERATE_KEY` 相关的依赖呢？答案是当属性增加或者减少时。属性减少自然是通过 `deleteProperty()` 得知的，增加则是在 `set()` 中，为 target 设置一个自身没有的属性，这也是前面做的不完善的一个点。

此外，我们在 `trigger()` 和 `track()` 中也带上表示相应的操作类型的参数，让逻辑更加缜密。

修补后的部分关键代码如下：

```typescript
// operations.ts

// using literal strings instead of numbers so that it's easier to inspect
// debugger events

export const enum TrackOpTypes {
  GET = 'get',
  HAS = 'has',
  ITERATE = 'iterate'
}

export const enum TriggerOpTypes {
  SET = 'set',
  ADD = 'add',
  DELETE = 'delete'
}

```



```typescript
// effect.ts
export function track(
  target: object,
  type: TrackOpTypes,
  key: unknown
) {
  /** */
  trackEffects()
}

export function trackEffects() { /** */ }

export function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown
) {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    // never been tracked
    return
  }

  let deps: (Dep | undefined)[] = []

  // schedule runs for SET | ADD | DELETE
  if (key !== undefined) {
    deps.push(depsMap.get(key))
  }

  // also run for iteration key on ADD | DELETE
  if (type === TriggerOpTypes.ADD || type === TriggerOpTypes.DELETE) {
    deps.push(depsMap.get(ITERATE_KEY))
  }

  const effects: ReactiveEffect[] = []
  for (const dep of deps) {
    if (dep) {
      effects.push(...dep)
    }
  }
  triggerEffects(createDep(effects))
}

export function triggerEffects(dep: Dep | ReactiveEffect[]) {
  // spread into array for stabilization
  const effects = isArray(dep) ? dep : [...dep]
  effects.forEach(effect => effect())
}

```

```typescript
// baseHandler.ts
get(target: Target, key, receiver: object) {
  // this works with `isReactive()` API
  if (key === ReactiveFlags.IS_REACTIVE) {
    return true
  } else if ( // return the raw target, works with 'toRaw()' API
    key === ReactiveFlags.RAW &&
    receiver === reactiveMap.get(target)
  ) {
    return target
  }

  const res = Reflect.get(target, key, receiver)

  track(target, TrackOpTypes.GET, key)

  // make nested properties to be reactive
  if (isObject(res)) {
    return reactive(res)
  }

  return res
},
set(target, key, value: unknown, receiver: object) {
  // get old value first
  let oldVal = (target as any)[key]

  // value should be the original object rather Proxy
  oldVal = toRaw(oldVal)
  value = toRaw(value)

  const hadKey = hasOwn(target, key)
  const res = Reflect.set(target, key, value, receiver)
  // don't trigger if target is something up in the
  // prototype chain of original
  if (target === toRaw(receiver)) {
    if (!hadKey) {
      trigger(target, TriggerOpTypes.ADD, key)
    } else if (!Object.is(oldVal, value)) {
      trigger(target, TriggerOpTypes.SET ,key)
    }
  }
  return res
},
has(target, key) {
  const res = Reflect.has(target, key)
  track(target, TrackOpTypes.HAS, key)
  return res
},
deleteProperty(target, key) {
  // determine whether the key is belong to target itself
  // before delete it
  const hadKey = hasOwn(target, key)
  const res = Reflect.deleteProperty(target, key)

  // triggers only if key is belong to target itself
  // and be deleted successfully
  if (res && hadKey) {
    trigger(target, TriggerOpTypes.DELETE, key)
  }
  return res
},
ownKeys(target) {
  track(target, TrackOpTypes.ITERATE, ITERATE_KEY)
  return Reflect.ownKeys(target)
}
```

事实上，`track()` 的 type 参数在我们的 mini-vue3 下并不是必须的，因为并不需要使用它

在 `trigger()` 中，当 type 为 ADD 或者 DELETE 时，把和 ITERATE_KEY 相关的依赖也取出来运行了

不过个人认为，这里还有一个美中不足的点。观察下面这个单测

```typescript
it('should observe delete operations', () => {
  let dummy
  const obj = reactive<{
    prop?: string
  }>({ prop: 'value' })
  effect(() => (dummy = obj.prop))

  expect(dummy).toBe('value')
  delete obj.prop
  expect(dummy).toBe(undefined)
})
```

它的逻辑是这样的

1. `obj` 成为一个 Proxy
2.  `effect` 执行，`dummy` 与 `obj.prop` 建立起连接
3.  `delete obj.prop` 被执行，`deleteProperty()` handler 被触发，接着执行 `trigger()`
4.  在 `trigger()` 执行过程中，`() => (dummy = obj.prop)` 作为相关依赖被执行
5.  第二步产生的依赖联系，由于 `cleanup()` 被删除，但是紧接着，重新执行该副作用函数时，触发 `get()`
6.  `get()` 内部执行 `track()` ，对于 `prop` 这个 `key` 建立了一个空的 `Map<any, Dep>` 依赖
7.  `get()` 返回 `undefined`，即最终 `dummy` 的值为 `undefined`
8.  `effectStack` 清空，`activeEffect` 为 `undefined`，流程正式结束

第6步导致多出一个空的 `Map<any, Dep>` 依赖。不过对于目前相当完善的 Vue 的响应性系统来说，这是完全能接受的开销。好像有点挑刺了，不过由于 ~~写了这么多舍不得删~~ 阐述这个流程能让读者更好地理解响应性系统的运作，因此还是把这部分保留下来了。

OK，补充得差不多了，`reactive()` API 的功能已经较为完善了。

`reactive()` 理应对 `Array`，`Map`，`Set` 等也提供支持，这里只阐述 Vue3 源码的解决思路，就不具体实现了。它们做为特殊的对象，代理其行为的难度也比对象要高。总体的思路都是一致的 —— 代理其相应的行为，编写相应的处理逻辑，并执行 `track()` 或 `trigger()` 。

## 代理数组

先谈谈 `get()`。阅读 [Vue 源码](https://github.com/vuejs/core/blob/main/packages/reactivity/src/baseHandlers.ts#L111)，可以看到对于数组的处理，主要集中在这些语句

```typescript
const targetIsArray = isArray(target)

if (!isReadonly && targetIsArray && hasOwn(arrayInstrumentations, key)) {
  return Reflect.get(arrayInstrumentations, key, receiver)
}
```

如果 target 是一个数组，并且 key 包含于 `arrayInstrumentations` 本身之中，则返回 `Reflect.get(arrayInstrumentations, key, receiver)` 的结果。这么设计的原因是，对 `const arr = reactive([])` 而言，执行一些原型方法，如 `arr.concat(1)` 等，也是会被 `get()` handler 所处理的。但是某些方法的执行是不符合预期的。`arrayInstrumentations` 就是用来解决这个问题的，它的值类型为 `Record<string, Function>`，里面重写了一些数组原型上的方法

```typescript
const arrayInstrumentations = /*#__PURE__*/ createArrayInstrumentations()

function createArrayInstrumentations() {
  const instrumentations: Record<string, Function> = {}
  // instrument identity-sensitive Array methods to account for possible reactive
  // values
  ;(['includes', 'indexOf', 'lastIndexOf'] as const).forEach(key => {
    instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
      const arr = toRaw(this) as any
      for (let i = 0, l = this.length; i < l; i++) {
        track(arr, TrackOpTypes.GET, i + '')
      }
      // we run the method using the original args first (which may be reactive)
      const res = arr[key](...args)
      if (res === -1 || res === false) {
        // if that didn't work, run it again using raw values.
        return arr[key](...args.map(toRaw))
      } else {
        return res
      }
    }
  })
  // instrument length-altering mutation methods to avoid length being tracked
  // which leads to infinite loops in some cases (#2137)
  ;(['push', 'pop', 'shift', 'unshift', 'splice'] as const).forEach(key => {
    instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
      pauseTracking()
      const res = (toRaw(this) as any)[key].apply(this, args)
      resetTracking()
      return res
    }
  })
  return instrumentations
}
```

`includes`，`indexOf`，`lastIndexOf` 这三个原型上的方法，对于值与值之间的比较，要求严格。但是被 `reactive()` 包裹后的对象，是和自身不全等的，因为 `reactive()` 的返回值是一个 `Proxy`。为了处理这种情况，会先尝试使用原始值匹配，若无，再尝试 `toRaw()` 后的值，即被 `Proxy` 所代理的原始对象。而且，为了让“查找”也具有响应性，要对每一个元素都 `track()` 一次

`push`，`pop`，`shift`，`unshift`，`splice` 这些会改变原数组长度的方法，在执行原方法期间，禁止任何副作用相关函数追踪依赖。这里的 `pauseTracking()` 和 `resetTracking()` 是从 `effect.ts` 中导出的，给我们提供了控制追踪的能力。其原理是

```typescript
export let shouldTrack = true
const trackStack: boolean[] = []

export function pauseTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = false
}

export function enableTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = true
}

export function resetTracking() {
  const last = trackStack.pop()
  shouldTrack = last === undefined ? true : last
}

export function track(target: object, type: TrackOpTypes, key: unknown) {
  if (shouldTrack && activeEffect) {
    /** */
  }
}
```

> Vue 的响应性系统不仅为使用者提供了便利，也为其渲染工作提供了强大的支持。在组件相关的源码上，也利用了这些 API 来控制正确的渲染、更新等。所以不妨待会儿把这些逻辑也加到我们的 mini-vue3 上

不过，为什么这些方法要禁止任何副作用相关函数追踪依赖呢？考虑以下情形

```typescript
const arr = reactive([])
effect(() => arr.push(1))
effect(() => arr.push(2))
```

若不加以禁止，会造成无限循环调用。因为 `arr.push()` 会引起 `length` 属性更改，使副作用函数与 `length` 属性建立连接。当第二个 `effect` 开始运行时，同样引起 `length` 更改，从而使第一个 `effect` 执行，两个副作用函数就会开始循环执行了。

还有值得注意的一个地方是，如果 `key` 为内置的 `Symbol` ，则不会去执行 `track()`

```typescript
const builtInSymbols = new Set(
  /*#__PURE__*/
  Object.getOwnPropertyNames(Symbol)
    // ios10.x Object.getOwnPropertyNames(Symbol) can enumerate 'arguments' and 'caller'
    // but accessing them on Symbol leads to TypeError because Symbol is a strict mode
    // function
    .filter(key => key !== 'arguments' && key !== 'caller')
    .map(key => (Symbol as any)[key])
    .filter(isSymbol)
)

if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
  return res
}
```

我们可以在浏览器的控制台下，看看 builtInSymbols 都有哪些值

<img src="/images/mini-vue3-1-p1-dark.png" img-dark rounded-lg />

<img src="/images/mini-vue3-1-p1-light.png" img-light rounded-lg />

为了避免意外错误，以及出于性能上的考虑，并没有选择让副作用函数与这些 `Symbol` 建立连接。以 [`Symbol.isConcatSpreadable`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Symbol/isConcatSpreadable) 为例，其定义了对象作为 [`Array.prototype.concat()`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/concat) 方法的参数时是否展开其数组元素。参阅 `Array.prototype.concat()` 的 [ECMA 规范](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.concat)

<img src="/images/mini-vue3-1-p2-dark.png" img-dark rounded-lg />

<img src="/images/mini-vue3-1-p2-light.png" img-light rounded-lg />

可以看到，其默认行为就会对 `length` 属性进行修改，因此不用额外对该 Symbol 执行 `track()`

经笔者的调试，如果有这么一段代码

```typescript
let arr = reactive([])
effect(() => {
  arr = arr.concat([1, 2])
})
```

它的执行逻辑是：

1. 由于 `effect()`，副作用函数 `arr.concat([1, 2])` 执行
2. `concat` 被 `get()` 代理，key 为 `concat`，该 `key` 与副作用函数 `arr.concat([1, 2])` 建立连接
3. `get()` handler 又被触发了，这次的 `key` 为 `constructor`，原因参见 ECMA 规范第二步，该步骤会生成一个新数组，调用了 Array 构造函数。所以，`constructor` 也与副作用函数 `arr.concat([1, 2])` 建立了连接
4. `get()` handler 又又被触发了，`key` 为 `Symbol(Symbol.isConcatSpreadable)`，根据上文所述，其不应该与副作用函数建立连接
5. `get()` handler 又又又被触发了，`key` 为 `length`，参见 ECMA 规范 5.b，在 `Array.prototype.concat` 执行过程中，`length` 会被读取，与副作用函数建立连接
6. Done

因此，不需要对这些 Symbol 执行 `track`，也不会影响正常使用。反倒是代理 Symbol 还有可能会引起不必要的行为与错误等，因为 Symbol 大多数都与引擎实现的内部方法相关。

其他 handler 的逻辑不难理解，读者可参照 [Vue3 源码](https://github.com/vuejs/core/blob/main/packages/reactivity/src/baseHandlers.ts)

## 代理集合类型

集合类型包括 `Map`，`WeakMap`，`Set`，`WeakSet`。读者可参照 reactivity 包下的 [collectionsHandlers.ts](https://github.com/vuejs/core/blob/main/packages/reactivity/src/collectionHandlers.ts) 与[相关单测](https://github.com/vuejs/core/tree/main/packages/reactivity/__tests__/collections)，以及 `trigger()` 的相关逻辑，理解其设计

类似与对数组的代理，对于集合类型的代理，同样也重写了非常多的方法

```typescript
// collectionHandlers.ts
function createInstrumentationGetter(isReadonly: boolean, shallow: boolean) {
  const instrumentations = shallow
    ? isReadonly
      ? shallowReadonlyInstrumentations
      : shallowInstrumentations
    : isReadonly
    ? readonlyInstrumentations
    : mutableInstrumentations

  return (
    target: CollectionTypes,
    key: string | symbol,
    receiver: CollectionTypes
  ) => {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (key === ReactiveFlags.RAW) {
      return target
    }

    return Reflect.get(
      hasOwn(instrumentations, key) && key in target
        ? instrumentations
        : target,
      key,
      receiver
    )
  }
}

export const mutableCollectionHandlers: ProxyHandler<CollectionTypes> = {
  get: /*#__PURE__*/ createInstrumentationGetter(false, false)
}
```

由于 ~~作者懒~~ 项目是 mini-vue3，所以并没有实现 `shallow` 相关的逻辑。这里我们也着重看 `mutableInstrumentations`

```typescript
const mutableInstrumentations: Record<string, Function> = {
  get(this: MapTypes, key: unknown) {
    return get(this, key)
  },
  get size() {
    return size(this as unknown as IterableCollections)
  },
  has,
  add,
  set,
  delete: deleteEntry,
  clear,
  forEach: createForEach(false, false)
}
```

以 `forEach` 为例，为了让开发者从 `forEach` 中拿到的 key 与 value 都是响应性的，对其做了一层 `wrap()` 包裹，让其也能“响应”，符合要求

```typescript
function createForEach(isReadonly: boolean, isShallow: boolean) {
  return function forEach(
    this: IterableCollections,
    callback: Function,
    thisArg?: unknown
  ) {
    const observed = this as any
    const target = observed[ReactiveFlags.RAW]
    const rawTarget = toRaw(target)
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
    !isReadonly && track(rawTarget, TrackOpTypes.ITERATE, ITERATE_KEY)
    return target.forEach((value: unknown, key: unknown) => {
      // important: make sure the callback is
      // 1. invoked with the reactive map as `this` and 3rd arg
      // 2. the value received should be a corresponding reactive/readonly.
      return callback.call(thisArg, wrap(value), wrap(key), observed)
    })
  }
}
```

对 `[Symbol.iterator]()` 的处理也类似，不再赘述

# readonly()

`readonly()` 实现一个只读的、深层的代理。代理只会对 `get()` 做必要的操作，不对 `set()` 与 `deleteProperty()` 做出任何操作，即

```typescript
export const readonlyHandlers: ProxyHandler<object> = {
  set() {
    return true
  },
  deleteProperty() {
    return true
  }
}
```

这样子，所代理的数据就不会被更改。

其 `get()` 的逻辑与 `reactive()` 十分相似，因此考虑把逻辑封装提出出来。

```typescript
export const mutableHandlers: ProxyHandler<object> = {
  get: createGetter()
}

export const readonlyHandlers: ProxyHandler<object> = {
  get: createGetter(true)
}

function createGetter(isReadonly = false) {
  return function get(target: Target, key: string | symbol, receiver: object) {
    // this works with `isReactive()` API
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if ( // return the raw target, works with 'toRaw()' API
      key === ReactiveFlags.RAW &&
      receiver === (isReadonly ? readonlyMap : reactiveMap).get(target)
    ) {
      return target
    }

    const res = Reflect.get(target, key, receiver)

    if (!isReadonly) {
      track(target, TrackOpTypes.GET, key)
    }

    // make nested properties to be reactive or readonly
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res)
    }

    return res
  }
}
```

修改过后的代码，对 `isReadonly(), toRaw()` 等 API 也提供了支持，都对 target 做了深层的转换，并只对 `reactive()` 执行 `track()`

# ref()

在已经实现了 `reactive()` 与 `effect()` 的基础上，实现 `ref()` 就并不困难了。相信读者还记得，`ref()` 的实现是基于 `getter/setter` 的，这让它能够使任何类型的变量都具有响应性，因为 `Proxy` 只作用于对象。同样的，让 `ref()` 做到在 `get()` 时执行 `track()`，在 `set()` 时执行 `trigger()`

```typescript
export function ref(value?: unknown) {
  return new RefImpl(value)
}

class RefImpl<T> {
  private _value: T
  private _rawValue: T

  public dep?: Dep = undefined
  public readonly __v_isRef = true

  constructor(value: T) {
    this._rawValue = toRaw(value)
    this._value = toReactive(value)
  }

  get value() {
    trackRefValue(this)
    return this._value
  }

  set value(newVal) {
    const useDirectiveValue = isReadonly(newVal)
    newVal = useDirectiveValue ? newVal : toRaw(newVal)
    if (hasChanged(newVal, this._rawValue)) {
      this._rawValue = newVal
      this._value = useDirectiveValue ? newVal : toReactive(newVal)
      triggerRefValue(this)
    }
  }
}
```

对于 `trackRefValue` 和 `triggerRefValue` ，其实也是调用了在 `effect.ts` 里实现的 `trackEffects()` 与 `triggerEffects()` 

```typescript
export function trackRefValue(ref: any) {
  if (activeEffect && shouldTrack) {
    trackEffects(ref.dep || (ref.dep = createDep()))
  }
}

export function triggerRefValue(ref: any) {
  if (ref.dep) {
    triggerEffects(ref.dep)
  }
}
```

当一个 `ref` 被嵌套在一个响应式对象中，作为属性被访问或更改时，它还应自动解包。让我们来更新一下代理的逻辑

```typescript
function get(target: Target, key: string | symbol, receiver: object) {
  /** */
  const res = Reflect.get(target, key, receiver)
	/** */
  if (isRef(res)) {
    // ref unwrapping
    return res.value
  }
  /** */
}
```

此外，对响应式对象内的 `ref` 属性做修改时，也应特殊处理

```typescript
function set(target, key, value, receiver) {
  let oldVal = target[key]
  if (isRef(oldVal) && !isRef(value)) {
    oldVal.value = value
    return true
  }
}
```

这样做，就实现了一个最简单的 `ref()`！

## 类型体操

目前还没有编写相关 TS 代码对类型做推导，其使用体验还不怎么好，因此需要简单实现一下类型方面的工作

```typescript
export interface Ref<T = any> {
  value: T
}

export function ref<T extends object>(value: T): [T] extends [Ref] ? T : Ref<UnwrapRef<T>>
export function ref<T>(value: T): Ref<UnwrapRef<T>>
export function ref<T = any>(): Ref<T | undefined>
export function ref(value?: unknown) {
  return new RefImpl(value)
}

export type UnwrapRef<T> = T extends Ref<infer V>
  ? UnwrapRefSimple<V>
  : UnwrapRefSimple<T>

export type UnwrapRefSimple<T> = T extends
  | Function
  | string
  | number
  | boolean
  | Ref
  ? T
  : T extends object
    ? { [P in keyof T]: P extends symbol ? T[P] : UnwrapRef<T[P]> }
    : T
```

我们提供了不同的重载，来应对不同的使用场景

+ 当 `ref()` 接收到的参数为 object 时，判断类型 T 是否*严格相等*于 Ref，若不是，则返回 `UnwrapRef<T>`

  > T extends Ref 与 [T] extends [Ref] 并不相同，表现在对于联合类型(即 `union`)的处理上。后者不会分发 union,而是将整个 union 作为一个整体。可参考 [TS 文档](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types)的解释。并提供一个 [clench](https://juejin.cn/user/536217406415102) 大佬当时在掘金沸点为我解惑时，使用的[例子](https://www.typescriptlang.org/play?#code/C4TwDgpgBAcg9gJwLYEMA2AeAggGigIQD4oBeKLKCAD2AgDsATAZwKgH5yoAuKAM3SYQAUKEhQAysAQBLAMbBseIqSgBtLAF1KNeszX4tHCj35pBQkeGh0V8ZOgwBGKAB8oAJldQAzHkfEoAHpAvgFoN0dLMTpnMkkZeScvTzdfKH8gkNNzKOgAJQheFQBvKAA3dABXCB46SqQAIwgEKABfC1FoFFtEVExSirRq2vqmltavUroUJBqoJilpOgBzNrwC3mJg0LNwqAGqucd3AG423KgUWIlFxIOhubrG5rbJqGnZngWZFbWoDa2WTCFm2gAJ5QCmioAQt0An9qAQxjAKP6gG8MwCHdoBm2MAoYqAC4TAJDmgAA5QBUcuVDiNnggLihPHFbgp7sN3qMXhM3FMZnNvktlnhBnSnmM-gCgA)。
  这么做的意义是，若 `ref()` 的参数也是一个 `ref`，那么就将子 ref 的类型提供给父 ref 使用，否则将参数类型深层解包(和 `ref` 在 `reactive` 下的解包相匹配，因为对象类型的值会经 `reactive` 处理)，再作为 value 的类型

+ 当 `ref()` 接收到的参数值类型为普通类型时，自然就直接返回 `Ref<UnwrapRef<T>>`

+ 允许 `ref()` 不带初始值

相应的，将 `reactive` 的类型也做了优化，原理类似

```typescript
export type UnwrapNestedRefs<T> = T extends Ref ? T : UnwrapRefSimple<T>

export function reactive<T extends object>(target: T): UnwrapNestedRefs<T>
```

## 其他 `ref` 相关 

`toRef()`，`toRefs()` 等也是十分常用且好用的 API，但是其实现相当简单。给出 [GitHub 上的链接](https://github.com/GODLiangCY/mini-vue3/commit/eab7cb8d9a1921ad39f69bd12d72851e820dcaa5#diff-81475b10580b705fb8421b8c430ac63220938646c0e09141be79c85b0ea392ff)，读者有兴趣可去查看

# computed()

`computed` 其实就是一个 “可计算的” `ref`，只不过它实现了一个**缓存**功能，它的源码也和 `ref` 十分类似。只有当其内部的依赖更新时，其值才会更新。一个十分直接的思路时，用一个逻辑变量来标识是否需要更新缓存。只有当它为 `true` 时，才去计算 `ref` 的值。这里就需要对 `effect` 做一些修改，让它变得可调度，因为目前我们只能通过 `trigger` 去简单直接地执行 `effect`，并不能比较‘自定义化“地去调度它。因此，给 `effect` 添加第二个参数，接收一个选项，让其能够按照开发者想要的方式被调度。

```typescript
// effect.ts
export function effect(fn, options) { /** */ }
export function triggerEffects(dep: Dep | ReactiveEffect[]) {
  // spread into array for stabilization
  const effects = isArray(dep) ? dep : [...dep]
  effects.forEach(effect => {
    const { scheduler } = effect.options
    if (scheduler) {
      scheduler(effect)
    } else {
      effect()
    }
  })
}
```

```typescript
//computed.ts
export function computed<T>(
  getter: ComputedGetter<T>
): ComputedRef<T> {
  return new ComputedRefImpl(getter)
}

export class ComputedRefImpl<T> {
  private _value!: T
  // if _dirty is true, it means that something outsides
  // have been changed so we need to compute it again
  public _dirty = true

  public dep?: Dep = undefined
  public readonly effect: ReactiveEffect<T>

  public readonly __v_isRef = true
  public readonly [ReactiveFlags.IS_READONLY] = true

  constructor(getter: ComputedGetter<T>) {
    const that = this
    this.effect = effect(getter, {
      lazy: true,
      scheduler() {
        if (!that._dirty) {
          that._dirty = true
          triggerRefValue(that)
        }
      }
    })
  }

  get value() {
    trackRefValue(this)
    if (this._dirty) {
      this._value = this.effect()
      this._dirty = false
    }
    return this._value
  }
}
```

+ 传了一个 `lazy: true` 的 option，表示需要懒计算，有助于减少开销
+ `scheduler` 允许我们代替原始的 `effect`，我们利用它去做 `trigger` 和 `dirty` 标记

若要实现一个可读写的 `computed`，只需稍微改动逻辑，支持调用参数中传入的 `set()` 即可

# 小结

实现了简单的响应性系统！但是比起 Vue 的响应性系统来，还有很多不足与可优化之处。下面笔者简单讲讲

+ 事实上，整个 `effect` 的实现借鉴了早期的实现。并且我们也没有提供 `stop` 去手动中止一个 `effect`。目前 Vue 也 class 语法糖优化了 `effect` 的代码，并且优化了追踪过程 —— 取代了用  `effectStack` 来解决嵌套 `effect` 的方案，转而使用了 `parent` 这一类成员来表示其父级 `effect`

  ```typescript
  export class ReactiveEffect<T = any> {
    parent: ReactiveEffect | undefined = undefined
    
    run() {
      let parent: ReactiveEffect | undefined = activeEffect
      while (parent) {
        if (parent === this) {
          return
        }
        parent = parent.parent
      }
      
      try {
        this.parent = activeEffect
        /** */
      } finally {
        /** */
        this.parent = undefined
      }
    }
  }
  ```

  可以看到，上述的 while 语句相当于之前的 `!effectStack.includes(effect)`，而 `this.parent = activeEffect` 与 `this.parent = undefined` 也模拟了栈行为

+ 对于重新追踪依赖 —— 即执行 `effect` 之前的 `cleanup`，Vue 使用了二进制相关的技巧将其做了一些优化。更多细节可以参见该 [PR](https://github.com/vuejs/core/pull/4017)，这里只简单讲讲其思路。先贴出相关的代码

  ```typescript
  // The number of effects currently being tracked recursively.
  let effectTrackDepth = 0
  
  export let trackOpBit = 1
  
  /**
   * The bitwise track markers support at most 30 levels of recursion.
   * This value is chosen to enable modern JS engines to use a SMI on all platforms.
   * When recursion depth is greater, fall back to using a full cleanup.
   */
  const maxMarkerBits = 30
  
  export class ReactiveEffect {
    run() {
      /** */
      try {
        /** */
        trackOpBit = 1 << ++effectTrackDepth
        
        if (effectTrackDepth <= maxMarkerBits) {
          initDepMarkers(this)
        } else {
          cleanupEffect(this)
        }
        return this.fn()
      } finally {
        if (effectTrackDepth <= maxMarkerBits) {
          finalizeDepMarkers(this)
        }
  
        trackOpBit = 1 << --effectTrackDepth
        
        /** */
      }
    }
  }
  
  export function trackEffects(dep) {
    let shouldTrack = false
    if (effectTrackDepth <= maxMarkerBits) {
      if (!newTracked(dep)) {
        dep.n |= trackOpBit // set newly tracked
        shouldTrack = !wasTracked(dep)
      }
    } else {
      // Full cleanup mode.
      shouldTrack = !dep.has(activeEffect!)
    }
  
    if (shouldTrack) {
      dep.add(activeEffect!)
      activeEffect!.deps.push(dep)
    }
  }
  ```
  
  ```typescript
  /**
   * wasTracked and newTracked maintain the status for several levels of effect
   * tracking recursion. One bit per level is used to define whether the dependency
   * was/is tracked.
   */
  type TrackedMarkers = {
    /**
     * wasTracked
     */
    w: number
    /**
     * newTracked
     */
    n: number
  }
  
  export const createDep = (effects?: ReactiveEffect[]): Dep => {
    const dep = new Set<ReactiveEffect>(effects) as Dep
    dep.w = 0
    dep.n = 0
    return dep
  }
  
  export const wasTracked = (dep: Dep): boolean => (dep.w & trackOpBit) > 0
  
  export const newTracked = (dep: Dep): boolean => (dep.n & trackOpBit) > 0
  
  export const initDepMarkers = ({ deps }: ReactiveEffect) => {
    if (deps.length) {
      for (let i = 0; i < deps.length; i++) {
        deps[i].w |= trackOpBit // set was tracked
      }
    }
  }
  
  export const finalizeDepMarkers = (effect: ReactiveEffect) => {
    const { deps } = effect
    if (deps.length) {
      let ptr = 0
      for (let i = 0; i < deps.length; i++) {
        const dep = deps[i]
        if (wasTracked(dep) && !newTracked(dep)) {
          dep.delete(effect)
        } else {
          deps[ptr++] = dep
        }
        // clear bits
        dep.w &= ~trackOpBit
        dep.n &= ~trackOpBit
      }
      deps.length = ptr
    }
  }
  ```
  
  一个核心的思路是，对当前的 `effect`，用一个二进制位去“标识”其依赖的状态 —— 是否被追踪过以及是不是新增的依赖。这样的二进制位有30个，这能让现代 JS 引擎使用 SMI 优化。关于什么是 SMI 优化，可参考这篇[文章](https://juejin.cn/post/7088160174493401101#heading-3)。当嵌套的 `effect` 超过30层时，仍使用之前的全量清理策略。否则，新的方案是：
  
  + 在 `fn` 被执行前，其所有依赖都被打上相应的标记，即 `initDepMarkers()` 所做的工作
  + 执行 `fn` 时，由于响应性系统所做的工作，`trigger()` 被触发。在此过程中，所有本次 `effect` 执行需要的依赖，都会被打上 `dep.n |= trackOpBit` 的标记。并且，把没有追踪过的依赖，添加进 `deps`。这部分依赖也就是比较灵活的、受外部条件影响的依赖
  + 执行结束后， 对于已经追踪过并且不是新的依赖——这部分依赖自然就是上一次执行 `effect` 需要，但是本次执行 `effect` 不需要的——将其删除。并且，清除本次执行 `effect` 的所有标记
  
  总的来说，这样子优化的意义在于，稳定的那部分依赖不会受到影响，并且新增的依赖会替换掉老旧的依赖

# 系列指路

[从零开始，写一个mini-vue3——第零章：准备工作](./mini-vue3-0)

[从零开始，写一个mini-vue3——第一章：响应性系统Ⅰ]()

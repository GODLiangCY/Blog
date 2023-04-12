---
title: JS 之原型篇
date: '2022-05-11'
tags: 
 - JavaScript
categories:
 - FrontEnd
words: 2200
duration: '8 min'
description: '深入浅出，揭开 **Prototype** 的神秘面纱！'
---

[[toc]]

## 原型与原型链

一言以蔽之：**原型，是一种机制，对象的存在与行为正是建立于这种机制之上的;对象之间基于原型建立起来的联系，就是原型链**

### Prototype-based VS Class-based

原型和对象是紧密关联的。笔者希望从对象来入手，剖析原型。作为程序员的你，对于**对象**这个词一定不会陌生。然而，JS 里的对象不同于 C++, Java 里的。前者是基于原型的，后者是基于类的

来点硬核的，我们直接上 [ECMAScript 标准](https://262.ecma-international.org/12.0/#sec-objects)，看看这两者的区别是什么

> In a class-based object-oriented language, in general, state is carried by instances, methods are carried by classes, and inheritance is only of structure and behaviour. In ECMAScript, the state and methods are carried by objects, while structure, behaviour, and state are all inherited
>
> 译：在基于类的面向对象语言中，一般情况下，(对象的)状态保存在实例中，方法保存在类中，继承只是结构和行为。在 ECMAScript 中，状态和方法由对象承载，而结构、行为和状态都是继承的

[MDN上的解释](https://developer.mozilla.org/zh-CN/docs/Learn/JavaScript/Objects/Object_prototypes#%E5%9F%BA%E4%BA%8E%E5%8E%9F%E5%9E%8B%E7%9A%84%E8%AF%AD%E8%A8%80%EF%BC%9F)是

> 在传统的 OOP 中，首先定义“类”，此后创建对象实例时，类中定义的所有属性和方法都被复制到实例中。在 JavaScript 中并不如此复制——而是在对象实例和它的构造器之间建立一个链接（它是__proto__属性，是从构造函数的 `prototype` 属性派生的），之后通过上溯原型链，在构造器中找到这些属性和方法

对比了两者的解释，个人对 Class-based 方式在此存疑。上文所述 ECMA 标准中，如果 *carried* 的意思是"对内存持有引用"，那么实例中的方法是对类中方法的引用而非复制，这和MDN上的解释是冲突的。咨询了[血小板](https://github.com/CodingPlatelets)学长之后，个人倾向于 ECMA 标准的解释

上面两段话十分深奥，难以理解。不过没关系，读者只需要知道JS里的对象是特殊的、不同于传统OOP的即可

回到正题，在 JS 中，通常我们有两种方式去声明一个对象

+ 字面量声明形式

    ```js
    const a = {
      name: 'zhangsan'
    }
    ```

+ 构造形式（**new** 操作符调用 constructor 函数）

  ```js
  function b() {
    this.name = 'zhangsan'
  }
  
  const a = new b()
  ```
  

事实上，字面量声明形式可以看作是一种语法糖。我们可以这样子等价改写成构造形式

```js
const a = new Object()
a.name = 'zhangsan'
```

所以说不论是哪种形式的声明，都可以看作是 **new** + **constructor 函数**这种形式。在这种形式下，`new` 操作符会让 JS 引擎做如下事情

1. 创建（或者说构造）一个全新的对象

2. 这个新对象会被执行 [[ Prototype ]] 连接

3. 这个新对象会绑定到函数调用的 this

4. 如果函数没有返回其他对象，那么 new 表达式中的函数调用会自动返回这个新对象

上个图:
<img src="/images/prototype1.png" rounded-lg />

### 内部插槽

对不熟悉[[ ]]它的朋友们，让笔者先来解释一下第二步的[[ Prototype ]]是什么意思
[[ ]]这个东西怎么叫它无所谓，笔者比较喜欢叫它内部插槽。内部插槽是由 JS 引擎来实现的，是 JS 语言“内部”的属性或者实现。通常来说作为开发者，是接触不到这些底层的实现的。但是现在有相当多的浏览器都把它给暴露出来了，在 Chrome 下就可以通过 `__proto__` 这一属性来访问[[ Prototype ]]链接所指向的原型对象。注意了，`__proto__` 不是 JS 所拥有的东西，它只是引擎为了让我们能够访问[[ Prototype ]]而做出的某种实现

> 而且据笔者发现，很多诸如__prop__这样的属性，其实都是引擎通过某种方法暴露了内部插槽

> 另外，`Object.getPrototypeOf()` 这个API也给我们提供了访问[[ Prototype ]]的能力。推荐使用

到这里，我们已经明白了 `new` 操作符做了一些什么事情。接着看图，我们会发现 constructor 函数有一个 **prototype 属性**，同样指向原型对象

事实上，**所有的函数，都有一个 prototype 属性**。它的值是相应的原型对象。原型对象也是一个对象，包含一些属性和方法，这些属性和方法可以被所有对象实例共享

### constructor 属性

原型对象默认只会拥有一个不可枚举的 constructor 属性，它的值是对构造函数的引用

更新一下上图
<img src="/images/prototype2.png" rounded-lg />

举个例子直观地理解一下

```js
function Proto() {
  this.name = 'zhangsan'
}
const obj = new Proto()
console.log(Object.getPrototypeOf(obj).constructor === Proto) // true
```



但是，注意了，**这里有个坑！**

```js
function Proto() {
  this.name = 'zhangsan'
}

function Parent() { }
Parent.prototype = new Proto()

console.log(Parent.prototype.constructor) // Proto
```

按图来说，`Parent.prototype.constructor === Parent` 才是我们想要的结果。这是因为我们手动将整个 `Parent.prototype` 改写了，破坏了默认行为



再衍生一下，所有对象（使用 Object.create(null) 创建的对象除外）都将具有 constructor 属性。在**没有显式使用构造函数的情况**下，创建的对象（例如对象和数组文本）将具有 constructor 属性，这个属性指向该对象的基本对象构造函数类型。(这段话是我从 [MDN](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/constructor) 上抄的)
```js
const o = {}
o.constructor === Object // true

const o = new Object
o.constructor === Object // true

const a = []
a.constructor === Array // true

const a = new Array
a.constructor === Array // true

const n = new Number(3)
n.constructor === Number // true
```
### 原型链

读者可能已经想到了，如果一个对象实例的构造函数封装了其他的构造函数，会怎么样呢？恭喜你，这就是原型链最大的秘密所在！

<img src="/images/prototype3.png" rounded-lg />

原型对象通过[[ Prototype ]]串联起来，形成一个原型链

### [[ Get ]]

在访问一个对象的属性时，会发生什么事情？
```js
const obj = {
  name: 'zhangsan'
}

obj.name // 'zhangsan'
```
不就是搜索作用域，找到 obj，再访问其内存吗？

对也不对。事实上，JS 引擎做了一个[[ Get ]]操作。它是这么做的

1. 查找对象中是否有相同名称属性，有则返回
2. 如果没有，则遍历[[ Prototype ]]链上的所有对象，执行第一步
3. 遍历完了还是没有？返回 undefined

```js
const arr = [3, 2, 1]
arr.sort((a, b) => a - b)
```
看上述代码。调用 `arr.sort` 实际上是找到了 `Array.prototype` 对象上的 `sort` 属性，再加以调用

## ES6 Class

注意了，ES6 新增的 `class` 关键字所声明的对象，**仍然是基于原型的，`class` 事实上只是一个语法糖**。当然，`super`, `extends` 这些和 class 搭配的关键字同样也是一个语法糖。所以说，不需要对 JS 中的 class 参杂一些其他的理解，它仅仅是一个语法糖而已，而且严格来说，作为一个动态语言，不存在 "class" 这个概念

当然，`class` 语法糖也有其设计上的优点

1. `extends` 给了我们轻松继承父类的能力，也能轻松扩展 `Array`, `RegExp` 等内置对象，在 ES6 之前想要实现这个功能是比较困难繁琐的
2. `super` 引用父类的原型，这样就可以访问父类的属性和方法了，也能轻松给父类构造函数传参

## ES6 Proxy

代理事实上针对内部插槽做了拦截,比如 `get()` 拦截了`[[ Get ]]`，`defineProperty(..)` 拦截了`[[ DefineOwnProperty ]]`，然后执行相应的逻辑。因此代理的 `get()` 操作对原型链追溯有一定影响

## 设计模式： 组合胜过继承
诚然，原型机制赋予了 JS 继承的能力，但是其弊端也很让人头疼

1. 原型中包含的引用值在所有实例间共享

   举个简单的例子：

   ```js
   function Proto() {
     this.nums = [1, 2, 3]
   }
   
   function Parent() {}
   Parent.prototype = new Proto()
   
   const child1 = new Parent()
   const child2 = new Parent()
   
   child1.nums.push(4)
   console.log(child1.nums, child2.nums) // [1, 2, 3, 4], [1, 2, 3, 4]
   ```

2. 子类型在实例化时不能给父类型的构造函数传参

   举个例子

   ```js
   function Proto() {
     this.nums = [1, 2, 3]
   }
   
   function Parent(name) {
     this.name = name || 'zhangsan'
   }
   Parent.prototype = new Proto()
   ```

   如果想给子类设置 age 属性的值，只能在其实例化后手动设置

   于是，前人经过总结，得出以下几种实现

### 盗用构造函数

这种技术名字听起来似乎很复杂，但它其实只是借助了 `call()` (或者 `apply()` )的能力，将 `this` 绑定到实例上

```js
function Proto(name) {
  this.nums = [1, 2, 3]
  this.name = name
}
Proto.prototype.hello = function () {
  return `hello, ${this.name}!`
}

function Parent(name) {
  Proto.call(this, name ?? 'zhangsan')
}

const child1 = new Parent()
const child2 = new Parent('luoxiang')

console.log(child1.name, child2.name) // "zhangsan", "luoxiang"

child1.nums.push(4)
console.log(child1.nums, child2.nums) // [1, 2, 3, 4], [1, 2, 3]

console.log(child1.hello()) // TypeError: child1.hello is not a function
```

它虽然解决了原型机制的两个痛点，但从这个例子中我们也能看出来它的缺点。它人为破坏了原型链， `child1` 无法访问 `Proto` 的原型对象中的属性。另外，如果我们在 `Proto` 中书写方法，如 `this.func = function() { }`，那么在内存中，每个实例都会开辟一块空间去存储 `func`，极大消耗了内存，这点是不如原型链机制下的继承的

### 组合继承

它结合了上述两种思路，保留了两者的优点。即利用盗用构造函数来继承属性，利用原型链继承方法

```js
function Proto(name) {
  this.nums = [1, 2, 3]
  this.name = name
}
Proto.prototype.hello = function () {
  return `hello, ${this.name}!`
}

function Parent(name) {
  Proto.call(this, name ?? 'zhangsan') // 第二次调用Proto
}
Parent.prototype = new Proto() // 第一次调用Proto
Parent.prototype.constructor = Parent

const child1 = new Parent()
const child2 = new Parent('luoxiang')

console.log(child1.hello()) // "hello, zhangsan!"
console.log(child2.hello()) // "hello, luoxiang!"

child1.nums.push(4)
console.log(child1.nums, child2.nums) // [1, 2, 3, 4], [1, 2, 3]
```

然而其也有一个效率问题，它调用了两次 `Proto`，这带来了一个小小的问题

以 `child2` 对象为例，它拥有 `nums` 和 `name` 属性，它通过`[[ Prototype ]]`所关联的原型对象也拥有这两个属性

```js
console.log(child2)
console.log(Object.getPrototypeOf(child2))
```

<img src="/images/prototype4-light.png" img-light rounded-lg />
<img src="/images/prototype4-dark.png" img-dark rounded-lg />

这个问题出现的关键点在于这一行代码

```js
Parent.prototype = new Proto()
```

我们在这里也调用了 `new` 操作符。因此 `Parent.prototype` 不是一个纯粹的原型对象。我们期望原型对象上只存在方法

### 寄生组合继承

这应该是继承方案的最优解了

只需要改一行代码即可

```js
// Parent.prototype = new Proto()
Parent.prototype = Object.create(Proto.prototype)
```

再看看控制台

<img src="/images/prototype5-light.png" img-light rounded-lg />
<img src="/images/prototype5-dark.png" img-dark rounded-lg />

`Object.create()` 干了什么事？看看它的简易 `Polyfill` 代码，相信你就明白了

```js
Object.create = function (proto, propertiesObject) {
  // ...

  function F() {}
  F.prototype = proto

  return new F()
}
```

没错，我们“绕过了” `Proto` 函数，只提供了它的 `prototype`

### 组合

固然我们实现了优异的继承，但是从设计模式的理念出发，组合是胜过继承的。组合能带来更优雅的代码结构、更低的耦合程度

## 写在最后

希望通过笔者的阐述，初学 JS 的读者们能够对原型有一个大致清晰的认知。笔者刚接触 JS 时，遇到的第一个难关就是原型，到处查资料、翻书，花了好大功夫

参考:
+ 《你不知道的JavaScript》
+ 《JavaScript高级程序设计》
+ [MDN](https://developer.mozilla.org/zh-CN/)
+ [神三元 —— 原生JS灵魂之问(上)](https://juejin.cn/post/6844903974378668039)


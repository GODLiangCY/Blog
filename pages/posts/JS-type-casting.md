---
title: JS之类型转换篇
date: '2021-11-03'
words: '2200'
duration: '6min'
tags: 
 - JavaScript
categories:
 - FrontEnd
description: '主要对JS的类型转换规则进行了大体阐述，以经典图片*Thanks for inventing JavaScript*为例讲述了一些例子。'
---

[[toc]]

## JS中有哪些数据类型？		

&emsp;&emsp;在JS中，有以下7种内置的基本类型，也叫做原始类型：

- `number`

- `boolean`

- `string`

- `symbol`

- `null`

- `undefined`

- `bigint`

  

&emsp;&emsp;和一个引用类型，也叫做复杂数据类型或者复合类型：

- `object`

&emsp;&emsp;像由`Function()`, `Array()`, `RegExp()`, `Date()`, `Math()`, `Number()`, `String()`, `Boolean()`, `Proxy()`, `Promise()`,`Map()`等等这些内置的构造函数所产生的对象，都可以将其归于引用类型的范畴。

  ```js
  // example
  const date = new Date()
  console.log(typeof date)   // object
  console.log(date instanceof Object)  // true
  ```



## 类型转换

&emsp;&emsp;需要注意的一点是，JS作为一门动态语言，它在编译时不会检查你所声明的变量的值和类型是否匹配，当运行时，我们才知道变量的值和类型。换句话说，**变量可以持有任何值， 值持有其类型。**这就涉及到类型转换这个十分令人头疼的问题。

&emsp;&emsp;当对不同类型的变量之间做运算和比较时，都会涉及到类型转换。

> 事实上，JS引擎有着十分复杂的编译、执行流程，它甚至会采用一些延迟编译、重编译等手段来优化执行效率。

&emsp;&emsp;附上经典图片一张：

<img alt="thanks for inventing javascript" src="/images/thanks-for-inventing-javascript.jpg" rounded-lg >

> 简单讲解一下不涉及到类型转换的坑
>
> 1. `typeof NaN === 'number'`, `NaN`是一个全局对象的属性，不可写、不可配置、不可枚举
>
>    `console.log(Object.getOwnPropertyDescriptor(window, NaN))`在Chrome控制台下结果是：
>
>    <img src="/images/type-casting1-dark.png" rounded-lg img-dark />
>    <img src="/images/type-casting1-light.png" rounded-lg img-light />
>    `NaN`意为*not a number*，但其实ES标准将其归于Number的范畴，所以不用过于纠结这个问题。<a src="https://262.ecma-international.org/5.1/#sec-4.3.23" target="_blank">可参考这里</a>
>
> 2. 关于好几个9变成10的n次方，是由于绝对值大于或等于2^53的数值文本过大，无法用整数准确表示。
>
>    为什么是2^53？因为IEEE754标准规定了浮点数由64位二进制数表示，有效数字由52位二进制数表示。但有效数字第一位总是1且不保存在64位之中，所以有53位数用来表示一个浮点数，那么大于2^53就会导致精度缺失，没有多余的位来描述这个数了。
>
> 3. ```js
>    console.log(0.5 + 0.1 === 0.6) // true
>    console.log(0.1 + 0.2 === 0.3) // false
>    ```
>
>    事实上，浮点数类型的值精度最高可达到小数点后17位（也和IEEE754标准有关喔）。这样子会带来一定精度上误差，是无法避免的。0.1转化为二进制的结果是0.0001100110011...，是个无限循环的数。它和0.2转化为二进制的结果相加，再转化为十进制，结果是0.300 000 000 000 000 04。如果想做到在允许误差范围内比较，可以利用`Number.EPSILON`，它代表了1和从1的左边最趋近于1的数的差值。
>
>    ```js
>    const a = 0.1 + 0.2
>    const b = 0.3
>    console.log(Math.abs(a - b) < Number.EPSILON) // true，可以认为a和b相等
>    ```
>
> 
>
> 4. ```js
>    console.log(Math.max()) // -Infinity
>    console.log(Math.min()) // Infinity
>    ```
>
>    其实`Math.max()`的默认值就是-Infinity。`Math.max()`接受若干个数字作为参数，并且返回其中的最大值。
>

&emsp;&emsp;接下来让我们简单了解类型转换的规则：

### 基本类型相关

  + 其他类型转化为`Boolean`(使用Boolean()，表格基于《JavaScript高级程序设计第4版》，做了些许删改)
   
     | 数据类型  | 转换为true的值         | 转换为false的值 |
     | --------- | ---------------------- | --------------- |
     | String    | 非空字符串             | ""（空字符串）  |
     | Number    | 非零数值（包括无穷值） | 0、NaN          |
     | Undefined |                        | undefined       |
     | Null      |                        | null            |
     | Symbol    | 都是true               |                 |
     | BigInt    | 非零数值（包括无穷值） | 0n、NaN         |

   > tips: JS的假值只有以下几个：
   >
   > + null
   > + undefined
   > + 0
   > + ""
   > + NaN
   > + 0n
   > + false

  + 其他类型转化为`Number`(讨论使用`Number()`的情况)
   
    - `String`： 
    
      - 如果字符串包含数值字符，包括数值字符前面带加、减号的情况，则转换为一个十进制数值。
    
      因此，Number("1")返回 1，Number("123")返回 123，Number("011")返回 11（忽略前面
    
      的零）。
    
      - 如果字符串包含有效的浮点值格式如"1.1"，则会转换为相应的浮点值（同样，忽略前面的零）。
    
      - 如果字符串包含有效的十六进制格式如"0xf"，则会转换为与该十六进制值对应的十进制整
    
      数值。
    
      - 如果是空字符串（不包含字符），则返回 0。 
    
      - 如果字符串包含除上述情况之外的其他字符，则返回 NaN。
    
    - `Boolean`:  true转化为1， false转化为0
    
    - `null`： 0
    
    - `undefined`： `NaN`
    
    - `BigInt`:  转化成相应的数值或者无穷，超过“安全范围”会出现精度缺失
    
    - `Symbol`： 无法转换为`Number`
    
+ 其他类型转化为`String`（讨论使用`String()`的情况）

     - `Number`: 直接转化为字符串，但是十六进制数和二进制数会先转化为十进制数。
     - `null`: "null"
     - `undefined`: "undefined"
     - `Boolean`: true转化为"true"，false转化为"false"
     - `Symbol`:  比如`Symbol('foo')`为转化成字符串字面量“Symbol(foo)”
     - `BigInt`: 同`Number`

### 复杂类型相关

&emsp;&emsp;对于任何转换，Object会优先调用内置的`[[ToPrimitive]]`，可以通过给对象添加`[Symbol.toPrimitive]`属性，改写内置的`[[ToPrimitive]]`。需要注意的是，`[Symbol.toPrimitive]() {}`只允许返回一个基本类型值。

```js
const obj = {
    valueOf() {
        return 123
    },
    toString() {
        return 'I am an Object'
    },
    [Symbol.toPrimitive]() {
        return true
    }
}
console.log(String(obj))  // 'true'
console.log(obj == 1)  // true
```

&emsp;&emsp;如果没有该属性，其次是调用`valueOf()`，如果`valueOf()`不存在或者不返回一个基本类型值，最后再调用`toString()`。`toString()`也不返回呢？那么转换就失败了，会出现error。

&emsp;&emsp;这是对一个对象做转换所调用方法的顺序

### 操作符相关

1. **==**

&emsp;&emsp;`==`仅仅比较等号两边的值是否相等，故其允许对两边的值在比较过程中做隐式转换，这也牵扯到很多类型转换的问题。

+ 布尔值与其他值比较，先将布尔值转换成number类型
+ 对象与基本类型的值比较，先让对象转化为原始值，即按照上文的顺序转换
+ 字符串与数字比较，先将字符串转化为数值
+ `console.log(null == undefined) // true`

2. **+**

+  一元运算符`+`可以让值强制转换为数值

+ 二元运算符`+`，如果一个操作数是字符串（或者是可以转化为字符串的对象），则执行字符串凭借，否则执行加法操作

3. **-**

+ `-`则会尝试让操作数都变成数值

4. **字位操作符（^, | ,~）**

+ 让操作数强制转化为32位整数，再对其进行位运算

5. **!**

+ 强制让操作数转化为真值或者假值

### 解答

&emsp;&emsp;罗列了这么多规则，那现在我们给出*Thanks for inventing JavaScript*一图中的答案了

+ `[] + [];   // ""`

  在`+`的转化规则下，两个空数组都调用`toString()`成为空字符串再进行拼接，答案自然是空字符串

+ ```js
  console.log([] + {})  // "[object Object]"
  console.log({} + [])  // 0
  ```

  在`[] + {}`中，JS引擎解析这条语句，认为它在做空数组+空对象这一操作，而`{}`被转化为字符串的结果是`[object Object]`

  而在`{} + []`中，引擎认为`{}`是一个空的作用域，把它忽略了，所以变成了一元操作符+再跟上一个空数组。所以，`+`把`[]`转化为0

+ ```js
  console.log(true + true + true === 3) // true
  console.log(true - true) // 0
  console.log(true == 1) // true
  console.log(true === 1) // false
  ```

  1. `true + true + true`，true是布尔值，不满足以下两个条件之一：

  	1. 是字符串
  	2. 是可以调用`[[ToPrimitive]]`转化为字符串的对象

  故`+`被解释为数字加法，true转化为1，进行相加

  2. `true - true`，true被转化为1
  3. `==`将true转化为1
  4. `===`是严格相等，同时比较值和类型是否相等
  
+ `(!+[] + [] + ![]).length;  //9`

  第一眼看上去可能比较迷惑，但也不复杂。

  1. `!+[]`，先执行`+[]`操作，结果为0。0是假值，`!0`得到布尔值`true`
  2. 现在式子变成了`true + [] + ![]`，`[]`能够转换为空字符串，故`true + []`结果为`"true"`，式子变为`"true" + ![]`
  3. `[]`是真值，`![]`得到布尔值false。`"true" + false`结果是`"truefalse"`，`length`属性返回其长度9

+ 剩下三个比较简单，就不在此赘述

## 小结

&emsp;&emsp;可以发现，JS所涉及到的类型转换是比较复杂的。应该在经验的累积上，进行记忆。我们在日常开发时，也应该考虑清楚这部分的代码怎么写，力求简洁易读。

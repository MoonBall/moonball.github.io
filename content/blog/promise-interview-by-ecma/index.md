---
# 主题列表：juejin, github, smartblue, cyanosis, channing-cyan, fancy, hydrogen, condensed-night-purple, greenwillow, v-green, vue-pro, healer-readable, mk-cute, jzman, geek-black, awesome-green, qklhk-chocolate

# 贡献主题：https://github.com/xitu/juejin-markdown-themes

# 摘要：为什么「JS 中 Promise 的微任务顺序」和手写 Promise A+ 版本不一致？本文从 ECMA 规范的角度，理清楚规范对 JS 中 Promise 的定义，并将原理和结论阐述清楚。

theme: channing-cyan
highlight:
---

# 从 ECMA 规范掌握 Promise 涉及的微任务

# 前言

最近阅读了 「[从一道让我失眠的 Promise 面试题开始，深入分析 Promise 实现细节](https://juejin.cn/post/6945319439772434469)」这篇文章，但仍然不明白为什么「JS 中 Promise 的微任务顺序」和手写 Promise A+ 版本不一致。

于是决定从 ECMA 规范的角度，理清楚规范对 JS 中 Promise 的定义，并将原理和结论阐述清楚。

**如果读者时间有限，建议只读第一章节即可**。第一章通过画图执行和原理总结的方式，非常清晰地解释了 JS 中 Promise 微任务的注册和执行。

后续章节详细记录了我阅读 ECMA 的过程，通过规范解决心中疑惑。如果读者学会了该方法，以后再遇到其他问题，也可以通过查阅规范进行求解。

# Promise 面试题

以下代码执行后的输出是什么呢？

```js
Promise.resolve()
  .then(() => {
    console.log(0)
    return Promise.resolve(4)
  })
  .then(res => {
    console.log(res)
  })

Promise.resolve()
  .then(() => {
    console.log(1)
  })
  .then(() => {
    console.log(2)
  })
  .then(() => {
    console.log(3)
  })
  .then(() => {
    console.log(5)
  })
  .then(() => {
    console.log(6)
  })
```

## 答案

以上代码输出结果为：**0 1 2 3 4 5 6**。

如果你觉得输出结果是 **0 1 2 4 3 5 6**，那就是**经典错误**。在「[从一道让我失眠的 Promise 面试题开始，深入分析 Promise 实现细节](https://juejin.cn/post/6945319439772434469)」这篇文章中，通过手写 Promise A+ 实现 Promise 时，其结果就是它。

## 命名 Promise

为了后续叙述方便，我们先对代码中生成的所有 Promise 进行命名。

![namedPromise.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b6f132a382b643be97b29d06cb13a8c3~tplv-k3u1fbpfcp-watermark.image)

## 经典错误的原因

如果只看面试代码的前一部分，这份代码共产生了多少个微任务呢？

```js
Promise.resolve()
  .then(() => {
    console.log(0)
    return Promise.resolve(4)
  })
  .then(res => {
    console.log(res)
  })
```

第一个微任务是执行 `promise1.then()` 的回调，其伪代码如下。

```js
function job1() {
  const cb = () => {
    console.log(0)
    return Promise.resolve(4)
  }

  const promise3 = cb()

  // 生成第二个微任务
  resolvePromise2(promise3)
}
```

因为 resolvePromise2 的参数是 promise 对象，所以生成第二个微任务。

**第二个微任务就是这道面试题的核心，我们得出经典错误的原因就是忽略了该微任务。**

第二个微任务将 promise2 和 promise3 关联起来，其伪代码如下。

```js
function job2() {
  // 生成第三个微任务
  promise3.then(resolvePromise2, rejectPromise2)
}
```

在第二个微任务中，因为 promise3 的状态是 fulfilled，所以调用 `.then(resolvePromise2)` 将生成第三个微任务，微任务内容是 resolvePromise2。

第三个微任务的伪代码如下。

```js
function job3() {
  // 生成第四个微任务
  resolvePromise2(4)
}
```

因为 promise2 的状态为 fulfilled 且它还有 then 回调函数，所以将生成第四个微任务。

第四个微任务就是调用 `promise2.then()` 的回调函数。

```js
function job4() {
  const cb = res => {
    console.log(res)
  }

  const result = cb()
  // result 是 undefined
  resolvePromise4(result)
}
```

因为 promise4 后面没有 then 回调，所以不会生成新的微任务。

**因此如果只看面试代码的前一部分，这份代码共产生了四个微任务。**

## 画图理解

下图中会涉及到 PromiseReactionJob 和 PromiseResolveThenableJob 两个名词，它们表示微任务的类型，读者可暂时忽略它们。

### 1. 第一轮执行

![pic-1.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/925aebb6d46d45869e4e191c9d6b029c~tplv-k3u1fbpfcp-watermark.image)

### 2. 执行两个微任务

![pic-2.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ea697c90ea494b8b8979be8d50cff18d~tplv-k3u1fbpfcp-watermark.image)

### 3. 执行两个微任务

![pic-3.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/bf6a7916a2734a09b71d40d6b0f8a689~tplv-k3u1fbpfcp-watermark.image)

### 4. 执行两个微任务

![pic-4.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/de58df3929194838b2891ff420766055~tplv-k3u1fbpfcp-watermark.image)

### 5. 执行两个微任务

![pic-5.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/19478b1d392140d792f8051574509d4b~tplv-k3u1fbpfcp-watermark.image)

### 6. 执行一个微任务

![pic-6.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5bdd9f8f3f934b96a69fed6a9b7a6598~tplv-k3u1fbpfcp-watermark.image)

## 总结并记忆结论

1. `promise.then()` 中的回调，将在 promise 的状态不为 pending 时被加入到微任务队列中。这个微任务在规范中被称为 [PromiseReactionJob](https://262.ecma-international.org/11.0/#sec-newpromisereactionjob)，名称中 Reaction 是指 `then(onFulfilled, onRejected)` 调用时的回调参数 onFulfilled 和 onRejected。
2. 如果 `promise1.then()` 的回调函数的返回值是一个 Promise 对象（不妨将其命名为 promise2），那么会生成一个新微任务。 这个微任务的内容是调用 `promise2.then(resolvePromise1, rejectPromise1)`，将 promise1 和 promise2 相关联。它在规范中被称为 [PromiseResolveThenableJob](https://262.ecma-international.org/11.0/#sec-newpromiseresolvethenablejob)。

---

接下来我们通过阅读 ECMA 规范来一步步将面试题弄清楚。建议打开 [ECMA 官网](https://262.ecma-international.org/11.0/#sec-promise-objects)，跟随本文一起在规范中畅游。

# 1. 第一轮执行

面试题中代码在第一轮执行时，会调用 `Promise.resolve()` 和 `promise.then()` 两个函数。因为调用 `promise.then()` 时 promise 的状态可能是 fulfilled 或 pending，所以可以分为 `fulfilledPromise.then()` 和 `pendingPromise.then()`。

接下来我们根据 ECMA 规范研究下这三类函数调用。

## Promise.resolve(x)

`Promise.resolve(x)` 参考[官方链接](https://262.ecma-international.org/11.0/#sec-promise.resolve)。

![Promise.resolve_x.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/eff172e2d37a4b6f91ef51a4246ee97f~tplv-k3u1fbpfcp-watermark.image)

规范中的 `C` 可理解为 `Promise`，第三步执行 `PromiseResolve(C, x)`。

### PromiseResolve(C, x)

参考[官方链接](https://262.ecma-international.org/11.0/#sec-promise.resolve)。

![PromiseResolve.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e58059e54d114b479962dd46e9f2ee59~tplv-k3u1fbpfcp-watermark.image)

因为我们传入的参数 x 是 `undefined`，所以只需看第三步和第四步。

第三步通过 `NewPromiseCapability(C)` 生成了新的 PromiseCapability 实例记录。

第四步是调用 promiseCapability 的 resolve 方法。

### NewPromiseCapability(C)

参考[官方链接](https://262.ecma-international.org/11.0/#sec-newpromisecapability)。

![NewPromiseCapability.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/37fca46e6b434d59940194522ef78f98~tplv-k3u1fbpfcp-watermark.image)

在规范内部通过 PromiseCapability 类型将 promise 和它的 resolve、reject 方法联系在一起。

这个函数最终返回对象结果如下。

```js
const promiseCapability = {
  Promise: promise,
  Resolve: resolve,
  Reject: reject,
}
```

在第四步中谈到 `GetCapabilitiesExecutor Functions` 算法，这里就不展开谈它了。为了方便理解，`NewPromiseCapability(C)` 算法可被编写成如下伪代码。

```js
// 忽略参数 C，将 C 认为是 Promise
function NewPromiseCapability() {
  // 第三步
  const promiseCapability = {
    Promise: undefined,
    Resolve: undefined,
    Reject: undefined,
  }

  // 第四步和第五步创建一个函数
  const executor = (resolve, reject) => {
    executor.Capability.Resolve = resolve
    executor.Capability.Reject = resolve
  }

  // 第六步
  executor.Capability = promiseCapability

  // 第七步
  const promise = new Promise(executor)

  // 第十步
  promiseCapability.promise = promise

  // 第十一步
  return promiseCapability
}
```

### resolve()

在 `PromiseResolve(C, x)` 的第四步执行了 `promiseCapability.Resolve(x)`，那 `Resolve` 方法怎么定义的呢？

从 `NewPromiseCapability(C)` 我们知道 promiseCapability.Resolve 是 Promise 构造函数调用时的 resolve 参数。

我们看看 Promise 构造函数的定义。

![Promise_executor.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/cd450e6f3560432e919af544408ba6ed~tplv-k3u1fbpfcp-watermark.image)

第八步和第九步就是我们要找的，我们继续进入 `CreateResolvingFunctions(promise)` 方法。

![CreateResolvingFunctions_promise.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c5ca2ac92d0746c68791392303e9148b~tplv-k3u1fbpfcp-watermark.image)

在第二步中 **Promise Resolve Functions** 就是我们要找的 resolve() 算法。

![Promise-Resolve-Functions.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2bf9e5075bb94ab0ad2cf3db28a675f5~tplv-k3u1fbpfcp-watermark.image)

由于我们调用 `Promise.resolve()` 时参数是 `undefined`，所以进入第八步，调用 `FulfillPromise(promise, value)`。

### FulfillPromise(promise, value)

参考[官方链接](https://262.ecma-international.org/11.0/#sec-fulfillpromise)。

![FulfillPromise.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2018f9d30484481999c11ef205cf08b7~tplv-k3u1fbpfcp-watermark.image)

第六步将状态设置为 fulfilled。

第七步，调用 `TriggerPromiseReactions` 方法。在 `TriggerPromiseReactions` 中，由于当前 promise 的 reactions 是空数组，所以直接返回 undefined。

### 结论

Promise.resolve() 返回一个状态为 fulfilled 的 promise。

## fulfilledPromise.then()

根据 Promise.resolve() 的结论可知，promise1 和 promise5 的状态是 fulfilled。

我们需要知道 Promise.then 方法是如何定义的。

### Promise.prototype.then(onFulfilled, onRejected)

参考[官方链接](https://262.ecma-international.org/11.0/#sec-promise.prototype.then)。

![Promise.prototype.then.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/14577ea1350d4bdba54f772c97cfc245~tplv-k3u1fbpfcp-watermark.image)

第四步会创建一个新的 Promise 对象，该对象就是调用 then() 时的返回值。

第五步会执行 `PerformPromiseThen()` 方法。

### PerformPromiseThen(promise, onFulfilled, onRejected)

参考[官方链接](https://262.ecma-international.org/11.0/#sec-performpromisethen)。

![PerformPromiseThen-fulfilled.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2202a7e34e664e4d8c99a9a64a8b735c~tplv-k3u1fbpfcp-watermark.image)

因为当前 promise 的状态是 fulfilled，所以其他步骤都可以不看，我们只看第九步。

在第 9.b 步中，调用 `NewPromiseReactionJob()` 创建一个微任务。在第 9.c 步中，将该微任务添加到微任务队列中。

### NewPromiseReactionJob(reaction, promise)

参考[官方链接](https://262.ecma-international.org/11.0/#sec-newpromisereactionjob)。

![NewPromiseReactionJob-only-job.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c6a6055a14f3423daeb1f0842c2c7594~tplv-k3u1fbpfcp-watermark.image)

在 `NewPromiseReactionJob()` 的定义中，我们只关心返回值中的 `{ Job: job }`。可以将 `job` 理解为一个回调函数，它被放入微任务队列中，然后在将来某个时间从微任务队列中取出来并执行。

该微任务的内容包含两部分。

1. 第 f 步执行 `handler(argument)`，handler 就是 `promise.then(cb)` 中的 cb。
2. 第 i.i 步执行 `resolve()` 将 `promise.then()` 返回的 promise 对象 resolve 掉。

### 结论

状态为 fulfilled 的 promise 调用 `.then(cb)` 会生成一个微任务。该微任务为 `PromiseReactionJob`，其功能是执行 `.then(cb)` 的回调函数 cb，并将 cb 的返回值作为参数，resolve 掉 `.then()` 返回的 promise。

编写伪代码如下。

```js
const fulfilledPromise = Promise.resolve()
const promise2 = fulfilledPromise.then(onFulfilled)

function job() {
  // 第 f 步
  const result = onFulfilled()

  // 第 i.i 步
  resolvePromise2(result)
}
```

## pendingPromise.then()

除了 promise1、promise3 和 promise5 之外，其他 promise 都是通过 `.then()` 生成的，它们的状态都是 pending。

在 `PerformPromiseThen()` 定义中，找到符合该场景的步骤。

![PerformPromiseThen-only-pending.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/dccfc611a6ac4e06a8dbf79b32604765~tplv-k3u1fbpfcp-watermark.image)

### 结论

状态为 pending 的 promise 调用 `then(cb)` 方法时，会将 `cb` 存到 promise 的 `[[PromiseFulfillReactions]]` 数组中。

## 执行后结果

1. promise1 和 promise5 的状态为 fulfill，所以执行 `.then(cb)` 时生成了微任务。
2. promise2、7、8、9 的 `.then()` 回调被存在 `[[PromiseFulfillReactions]]` 数组中。

![pic-1.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/35e1711cab5f43efa00a1f41fa981c3d~tplv-k3u1fbpfcp-watermark.image)

# 2. 执行两个微任务

这两个微任务是由于 fulfillPromise 调用 `.then()` 时生成的。其伪代码如下面的 job 所示。

```js
const promise = Promise.resolve()
const promise2 = promise.then(onFulfilled)

function job() {
  const result = onFulfilled()
  resolvePromise2(result)
}
```

我们继续看 resolve 方法的定义。

![PromiseResolveFunctions-resolve.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9e511fe849f14b3a81f3a954284b97a3~tplv-k3u1fbpfcp-watermark.image)

第 8 ~ 12 步的意思是，当 `result.then` 不可被调用时，就执行 `FulfillPromise()`。

第 13 步的意思是，当 `result.then` 可被调用时，就执行 `NewPromiseResolveThenableJob()` 生成微任务。

如果一个对象的 `.then` 属性可以被调用，那么我们称该对象为 thenable 对象。

接下来分两种情况进行研究，第一种是 `resolve(result)` 调用时，result 不是 thenable 对象，第二种是 result 为 thenable 对象的情况。

## resolve(nonThenable)

根据第 8 ~ 12 步可知，当 resolve 的值不是 thenable 对象时，就会执行 `FulfillPromise()` 方法。

### FulfillPromise()

参考[官方链接](https://262.ecma-international.org/11.0/#sec-fulfillpromise)。

![FulfillPromise.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2eff20b5a5f74396a9a3c6981cc09499~tplv-k3u1fbpfcp-watermark.image)

第七步会执行 `TriggerPromiseReactions(reactions)`。

参数 reactions 是 promise 的 `[[PromiseFulfillReactions]]` 数组，数组中每项就是 `.then(cb)` 调用时的 cb。

### TriggerPromiseReactions()

参考[官方链接](https://262.ecma-international.org/11.0/#sec-triggerpromisereactions)。

![TriggerPromiseReactions.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e0ea4bc698244463a694329a66747965~tplv-k3u1fbpfcp-watermark.image)

在该方法中会为每个 `.then(cb)` 调用生成一个微任务。

### 结论

当调用 `pendingPromise.resolve(nonThenable)` 时，会遍历 `pendingPromise.[[PromiseFulfillReactions]]` 数组，并为每项生成一个微任务 PromiseReactionJob。

## resolve(thenable)

根据 「Promise Resolve Functions」 第 13 步可知，当 resolve 的值是 thenable 对象时，会执行 `NewPromiseResolveThenableJob()` 生成新的微任务。

### NewPromiseResolveThenableJob()

参考[官方链接](https://262.ecma-international.org/11.0/#sec-newpromiseresolvethenablejob)。

![NewPromiseResolveThenableJob-only-job.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8fcbf75a34af466794585198a25ea650~tplv-k3u1fbpfcp-watermark.image)

只看第 b 步，可知该微任务的伪代码如下。

```js
function job() {
  thenable.then(resolveOtherPromise, rejectOtherPromise)
}
```

### Why

为什么需要在微任务中执行 `thenable.then()` 方法呢？

官方解释是为了保证同步代码执行完，才调用 thenable.then()。

我猜测这样做的原因是 thenable 可以为开发者实现的任何对象，所以它不一定是 Promise 实例。如果 `.then()` 的调用存在副作用（比如：console.log），那么将副作用延后到同步代码之后更符合开发者对代码的直观感受。

以下是官方的原文解释。

> This Job uses the supplied thenable and its then method to resolve the given promise. This process must take place as a Job to ensure that the evaluation of the then method occurs after evaluation of any surrounding code has completed.

### 结论

当调用 `pendingPromise.resolve(thenable)` 时，会生成一个微任务，该微任务的目的是通过 thenable 的 `.then()` 方法将 thenable 和 pendingPromise 关联起来。

## 执行后结果

1. 因为 `promise1.then(cb)` 的回调 cb 的返回值是 Promise 对象，所以根据规范生成了 PromiseResolveThenableJob 微任务。
2. 因为 `promise5.then(cb)` 回调的返回值是 undefined，调用 `resolvePromise6(undefined)` 后将 promise6 的状态由 pending 转变为 fulfill。在 promise6 被 fulfill 后，会将 `[[PromiseFulfillReactions]]` 列表中每项都生成一个微任务。

![pic-2.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/687489cc2a5344f2b5149e3f4c48abfe~tplv-k3u1fbpfcp-watermark.image)

# 3. 执行两个微任务

## PromiseResolveThenableJob

该微任务中伪代码为：

```js
function job() {
  promise4.then(resolvePromise2, rejectPromise2)
}
```

因为 promise4 当前的状态是 fulfill，所以根据[第一轮执行结果](#heading-27)可知，`promise4.then()` 会生成一个微任务。

## PromiseReactionJob

这个微任务的内容和 [resolve(nonThenable)](#heading-32) 生成的微任务一致，不再赘述。

## 执行结果

![pic-3.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/de4ae737dea94dde9df8a961bca17ee4~tplv-k3u1fbpfcp-watermark.image)

# 4. 执行两个微任务

两个微任务都是 PromiseReactionJob。

## 执行结果

![pic-4.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9c57a7b249554150b6048d2f97018bd5~tplv-k3u1fbpfcp-watermark.image)

# 5. 执行两个微任务

两个微任务都是 PromiseReactionJob。

因为 promise4 的 `[[PromiseFulfillReactions]]` 是空数组，所以不会生成新的微任务。

## 执行结果

![pic-5.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5804ec398c06445682aceb184e5f2b22~tplv-k3u1fbpfcp-watermark.image)

# 6. 执行一个微任务

最后一个微任务也是 PromiseReactionJob。

因为 promiseA 的 `[[PromiseFulfillReactions]]` 是空数组，所以不会生成新的微任务。

## 执行结果

![pic-6.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/773339990edd4a1ea026ae747d9de987~tplv-k3u1fbpfcp-watermark.image)

# 再来一题

最后再出个题检验下学习效果吧。

```js
Promise.resolve()
  .then(() => {
    console.log("a")
    return Promise.resolve().then(() => {
      console.log("b")
      return "c"
    })
  })
  .then(res => {
    console.log(res)
  })

Promise.resolve()
  .then(() => {
    console.log(1)
  })
  .then(() => {
    console.log(2)
  })
  .then(() => {
    console.log(3)
  })
  .then(() => {
    console.log(4)
  })
  .then(() => {
    console.log(5)
  })
```

答案是：**a 1 b 2 3 c 4 5**

因为下面的代码会生成两个微任务。

```js
.then(() => {
  console.log("a")
  return Promise.resolve().then(() => {
    console.log("b")
    return "c"
  })
})
```

第一个微任务是 PromiseReactionJob，其内容为 `Promise.resolve().then(cb)` 的回调 cb。

第二个微任务是 PromiseResolveThenableJob。

---

**原创不易，别忘了点赞鼓励哦 ❤️**

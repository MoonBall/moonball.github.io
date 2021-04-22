---
# 主题列表：juejin, github, smartblue, cyanosis, channing-cyan, fancy, hydrogen, condensed-night-purple, greenwillow, v-green, vue-pro, healer-readable, mk-cute, jzman, geek-black, awesome-green, qklhk-chocolate

# 贡献主题：https://github.com/xitu/juejin-markdown-themes

# 摘要：React Scheduler 为什么使用 MessageChannel 呢？为什么不使用 setTimeout 或 requestAnimationFrame 实现呢？

theme: channing-cyan
highlight:
---

# React Scheduler 为什么使用 MessageChannel 实现

# TL;DR

本文包括：

1. Scheduler 简介 —— 时间分片
2. 时间分片应选择微任务还是宏任务
3. 为什么不选择 setTimeout(fn, 0)
4. 为什么不选择 requestAnimationFrame(fn)

# Scheduler 简介 —— 时间分片

如果「组件 Render 过程耗时」或「参与调和阶段的虚拟 DOM 节点很多」时，那么一次性完成所有组件的调和阶段就会花费较长时间。

为了避免长时间执行调和阶段而引起页面卡顿，React 团队提出了 Fiber 架构和 Scheduler 任务调度。

Fiber 架构的目的是「能独立执行每个虚拟 DOM 的调和阶段」，而不是每次执行整个虚拟 DOM 树的调和阶段。

Scheduler 的主要功能是时间分片，每隔一段时间就把主线程还给浏览器，避免长时间占用主线程。

## React 和 Scheduler 交互

如果只考虑 React 和 Scheduler 的交互，则组件更新的流程如下：

1. React 组件状态更新，向 Scheduler 中存入一个任务，该任务为 React 更新算法。
2. Scheduler 调度该任务，执行 React 更新算法。
3. React 在调和阶段更新一个 Fiber 之后，会询问 Scheduler 是否需要暂停。如果不需要暂停，则重复步骤 3，继续更新下一个 Fiber。
4. 如果 Scheduler 表示需要暂停，则 React 将返回一个函数，该函数用于告诉 Scheduler 任务还没有完成。Scheduler 将在未来某时刻调度该任务。

在第一步中，Scheduler 需要暴露 `pushTask()` 方法，React 通过该方法存入任务。

在第二步中，Scheduler 需要暴露 `scheduleTask()` 方法，用于调度任务。

在第三步中，Scheduler 需要暴露 `shouldYield()` 方法，React 通过该方法决定是否需要暂停执行该任务。

在第四步中，Scheduler 判断任务执行后的返回值是否是一个函数，如果是则说明任务未完成，将来还需要调度它。

该过程可用如下伪代码表达：

```js
const scheduler = {
  pushTask() {
    // 1. 存入任务
  },

  scheduleTask() {
    // 2. 挑选一个任务并执行
    const task = pickTask()
    const hasMoreTask = task()

    if (hasMoreTask) {
      // 4. 未来继续调度
    }
  },

  shouldYield() {
    // 3. 由调用方调用，调用方判断是否需要暂停
  },
}

// 当用户点击时修改了组件状态，则伪代码如下
const handleClick = () => {
  // React 组件更新时，产生任务
  const task = () => {
    const fiber = root
    while (!scheduler.shouldYield() && fiber) {
      // reconciliation() 对当前的 fiber 执行调和阶段
      // 并返回下一个 fiber
      fiber = reconciliation(fiber)
    }
  }

  scheduler.pushTask(task)

  // React 会在将来某个时间执行 scheduler.scheduleTask()
  // 这里假设立即执行 scheduler.scheduleTask()
  scheduler.scheduleTask()
}
```

## Scheduler 是一种通用设计，不仅仅应用于 React

上一节是 React 与 Scheduler 的交互过程。实际上 Scheduler 是一种通用设计，它可以应用于任何任务调度中。

举个例子（为了举例的例子），假设我们要计算 `1000` 个整数的和，一次性遍历的代码如下：

```js
let sum = 0
for (let i = 0; i < 1000; ++i) {
  sum += arr[i]
}
```

假设执行一次加法操作需要一毫秒，那么整个过程就需要一秒钟，进而导致页面卡顿一秒。如果将该过程改为 Scheduler 调度的任务，则代码如下：

```js
const task = () => {
  let pos = 0
  let sum = 0
  const continuousExec = () => {
    for (; !scheduler.shouldYield() && pos < 1000; ++pos) {
      sum += arr[i]
    }

    if (pos === 1000) {
      return
    }

    return continuousExec
  }

  return continuousExec()
}
```

当 `scheduler.shouldYield()` 返回 `true` 时，就暂停执行任务，此时浏览器便能更新页面，避免页面卡顿。

> 可以将 Scheduler 这种调度方式理解为：当前执行函数返回执行权给调用方，调用方可以在将来继续执行该函数。这种调度方式与生成器函数（Generator Function）的功能一模一样，所以如果使用生成器函数来实现 Scheduler 将变得更简单。但 React 团队并没有使用生成器函数实现，主要原因是生成器函数是有状态的，而 React 希望无状态重新执行该任务。可参考[官方解释](https://github.com/facebook/react/issues/7942#issuecomment-254987818)。

## 与 MessageChannel 的关系

那 Scheduler 和 MessageChannel 有啥关系呢？

关键点就在于当 `scheduler.shouldYield()` 返回 `true` 后，Scheduler 需要满足以下功能点：

1. 暂停 JS 执行，将主线程还给浏览器，让浏览器有机会更新页面
2. 在未来某个时刻继续调度任务，执行上次还没有完成的任务

要满足这两点就需要调度一个宏任务，因为宏任务是在下次事件循环中执行，不会阻塞本次页面更新。而**微任务是在本次页面更新前执行**，与同步执行无异，不会让出主线程。事件循环可参考下图，图片来源于[事件循环的进一步探索](https://www.youtube.com/watch?v=u1kqx6AenYw&t=853s)。

![事件循环代码.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/35f243a119714e87aca99e72d7f9cede~tplv-k3u1fbpfcp-watermark.image)

**使用 MessageChannel 的目的就是为了产生宏任务**。在 Scheduler 中使用 MessageChannel 的代码如下：

```js
const channel = new MessageChannel()
const port = channel.port2

// 每次 port.postMessage() 调用就会添加一个宏任务
// 该宏任务为调用 scheduler.scheduleTask 方法
channel.port1.onmessage = scheduler.scheduleTask

const scheduler = {
  scheduleTask() {
    // 挑选一个任务并执行
    const task = pickTask()
    const continuousTask = task()

    // 如果当前任务未完成，则在下个宏任务继续执行
    if (continuousTask) {
      port.postMessage(null)
    }
  },
}
```

# 为什么不选择 setTimeout(fn, 0)

`setTimeout(fn, 0)` 是我们最常用的创建宏任务的手段，为什么 React 没选择用它实现 Scheduler 呢？

原因是递归执行 `setTimeout(fn, 0)` 时，最后间隔时间会变成 4 毫秒，而不是最初的 1 毫秒。可在浏览器中执行以下代码：

```js
var count = 0

var startVal = +new Date()
console.log("start time", 0, 0)
function func() {
  setTimeout(() => {
    console.log("exec time", ++count, +new Date() - startVal)
    if (count === 50) {
      return
    }
    func()
  }, 0)
}

func()
```

运行结果为：
![setTimeout_0_throttle.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c550a01a07374e4082c35884412be5b9~tplv-k3u1fbpfcp-watermark.image)

如果使用 `setTimeout(fn, 0)` 实现 Scheduler，就会浪费 4 毫秒。因为 60 FPS 要求每帧间隔不超过 16.66 ms，所以 4ms 是不容忽视的浪费。

有兴趣的同学可以试试 `setInterval(fn, 0)` 的效果，其结果与 setTimeout 相同。

```js
// setInterval 0ms 试试
var count = 0
var startVal = +new Date()
var timer = setInterval(() => {
  console.log("exec time", ++count, +new Date() - startVal)
  if (count >= 50) {
    clearInterval(timer)
  }
}, 0)
```

# 为什么不选择 requestAnimationFrame(fn)

我们知道 `rAF()` 是在页面更新之前被调用。

如果第一次任务调度不是由 `rAF()` 触发的，例如直接执行 `scheduler.scheduleTask()`，那么在本次页面更新前会执行一次 `rAF()` 回调，该回调就是第二次任务调度。所以使用 `rAF()` 实现会导致在本次页面更新前执行了**两次**任务。

为什么是两次，而不是三次、四次？因为在 `rAF()` 的回调中再次调用 `rAF()`，会将第二次 `rAF()` 的回调放到下一帧前执行，而不是在当前帧前执行。

另一个原因是 `rAF()` 的触发间隔时间不确定，如果浏览器间隔了 10ms 才更新页面，那么这 10ms 就浪费了。

> 现有 WEB 技术中并没有规定浏览器应该什么何时更新页面，所以通常认为是在一次宏任务完成之后，浏览器自行判断当前是否应该更新页面。如果需要更新页面，则执行 `rAF()` 的回调并更新页面。否则，就执行下一个宏任务。
> ![事件循环代码.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/763d4e32c5474398a269a4215bf9636f~tplv-k3u1fbpfcp-watermark.image)

# 总结

React Scheduler 使用 MessageChannel 的原因为：**生成宏任务**，实现：

1. 将主线程还给浏览器，以便浏览器更新页面。
2. 浏览器更新页面后继续执行未完成的任务。

为什么不使用微任务呢？

1. 微任务将在页面更新前全部执行完，所以达不到「将主线程还给浏览器」的目的。

为什么不使用 `setTimeout(fn, 0)` 呢？

1. 递归的 `setTimeout()` 调用会使调用间隔变为 4ms，导致浪费了 4ms。

为什么不使用 `rAF()` 呢？

1. 如果上次任务调度不是 `rAF()` 触发的，将导致在当前帧更新前进行两次任务调度。
2. 页面更新的时间不确定，如果浏览器间隔了 10ms 才更新页面，那么这 10ms 就浪费了。

# 其他 React 好文推荐

1. [React 性能优化 | 包括原理、技巧、Demo、工具使用](https://juejin.cn/post/6935584878071119885)
2. [聊聊 useSWR，为开发提效 - 包括 useSWR 设计思想、优缺点和最佳实践](https://juejin.cn/post/6943397563114455048)
3. [React 为什么使用 Lane 技术方案](https://juejin.cn/post/6951206227418284063)

---

> **招贤纳士**
>
> 笔者在**成都**-**字节跳动**-**私有云方向**，主要技术栈为 React + Node.js。
> 团队扩张速度快，组内技术氛围活跃。公有云私有云刚刚起步，有很多技术挑战，未来可期。
>
> 有意愿者可通过该链接投递简历：[https://job.toutiao.com/s/e69g1rQ](https://job.toutiao.com/s/e69g1rQ)
>
> 也可以添加我的微信 `moonball_cxy`，一起聊聊，交个朋友。

**原创不易，别忘了点赞鼓励哦 ❤️**

---
# 主题列表：juejin, github, smartblue, cyanosis, channing-cyan, fancy, hydrogen, condensed-night-purple, greenwillow, v-green, vue-pro, healer-readable, mk-cute, jzman, geek-black, awesome-green, qklhk-chocolate

# 贡献主题：https://github.com/xitu/juejin-markdown-themes

# 摘要：React 为什么使用 Lane 模型替代 ExpirationTime 模型？本文将从 ExpirationTime 存在的问题入手，再加上 Demo 的演示和分析，给出答案。

theme: channing-cyan
highlight:
---

# 为什么 React 使用 Lane 模型（技术选型篇，不涉及源码分析）

# TL;DR

本文包括：

1. 使用 ExpirationTime 表示优先级时存在的问题
2. 为什么选择位运算 Lane 模型解决以上问题
3. 使用 Lane 模型前后的 Demo 展示及分析

# 背景，ExpirationTime 存在的问题

## ExpirationTime 原理

在使用 Lane 模型之前，React 内部使用 ExpirationTime 表示任务的优先级。

为任务计算 ExpirationTime 的伪代码如下：

```js
// 忽略了 React 内部复杂的细节处理。
const task;
task.expirationTime = MAX_INT_31 - (currentTime + delayTimeByTaskPriority);
```

其中 `MAX_INT_31` 是 31 位二进制表示的最大整数。`currentTime` 是以毫秒为单位表示当前时间。`delayTimeByTaskPriority` 是当前任务的优先级对应的延时，例如高优先级任务 taskA 和低优先级任务 taskB，它们对应的延时分别为 0 和 500，如果它们的 currentTime 相同，那么 `taskA.expirationTime` 就比 `taskB.expirationTime` 大 500。

调度器每次选出任务中最大的 ExpirationTime 作为执行任务的优先级 `currentExecTaskTime`，交给 React 进入调和阶段，即每次执行优先级最高的任务。

## ExpirationTime 与批量更新

React 实现批量更新的方式很容易理解，只要任务满足 `task.expirationTime >= currentExecTaskTime` 即可。

在事件处理函数或生命周期函数中实现批量更新，就是通过将任务设置为相同的 ExpirationTime。如此一来，这些任务将同时满足 `task.expirationTime >= currentExecTaskTime` 并被执行。

## ExpirationTime 与并发模式

使用 ExpirationTime 的方式是可以实现并发模式的（Concurrent Mode）。例如：当低优先级任务 taskA 还在调和阶段时，用户在 `<input />` 中输入内容将产生高优先级任务 taskB， taskB 负责更新 input，使其展示刚刚输入的内容。尽管 taskA 的调和阶段还没有完成，但由于 `taskB.expirationTime` 大于 `taskA.expirationTime`，所以会优先调度 taskB 进入调和阶段。这种场景下，React 使 taskA 和 taskB 同时执行，也就实现了并发模式。

## 存在不足 - Suspense 的出现

### Demo

先展示 Demo 以便直观感受使用 ExpirationTime 时遇到的问题。该 Demo 可线上访问，请戳[这里](https://codesandbox.io/s/demo-before-using-lane-model-txsnw)。

![demo-before-using-lane-model.gif](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e7e06db0e68c42a08012b8a1cf897eca~tplv-k3u1fbpfcp-watermark.image)

在 Demo 中 count 值和 `App:` 每秒钟都会加 1。关键代码如下：

```js
const Sub = ({ count }) => {
  const [resource, setResource] = useState(undefined)
  // 点击按钮 3 秒后触发 Suspense 的 fallback 逻辑
  const [startTransition, isPending] = useTransition({ timeoutMs: 3000 })

  return (
    <div>
      <button
        onClick={() => {
          // createResource(6000) 返回一个 6 秒后 Fulfill 的 Promise
          // 模拟请求耗时 6 秒
          startTransition(() => {
            setResource(createResource(6000))
          })
        }}
      >
        CLICK ME
      </button>
      <pre>{JSON.stringify({ count, isPending }, null, 2)}</pre>
      {resource === undefined ? "Initial state" : resource.read()}
    </div>
  )
}

const App = props => {
  const [s, setS] = useState(0)
  useEffect(() => {
    const t = setInterval(() => {
      setS(x => x + 1)
    }, 1000)
    return () => {
      clearInterval(t)
    }
  }, [])

  return (
    <>
      <Suspense fallback={<Loading />}>
        <Sub count={s} />
      </Suspense>
      <div>App: {s}</div>
    </>
  )
}
```

在 Demo 中，count 为 2 时点击了 「CLICK ME」按钮，看到的现象为：

1. isPending 立马由 false 变为 true
2. count 值和 `App:` 固定为 2，没有改变
3. 3 秒后 Suspense 挂载 `fallback`，此时 `App:` 为 5
4. 再过 3 秒，Suspense 挂载 `children`，此时 count 值和 `App:` 为 8

第二步现象中，虽然定时器每秒钟都在更新 count 值，但页面上并没有展示新的 count 值，这就是使用 ExpirationTime 方式遇到的问题。

### 原因

导致该现象的根本原因是：**「高优先级 IO 任务」阻塞了「低优先级 CPU 任务」**。

React 中 IO 任务是指 Suspense 机制相关的任务，其他任务都是 CPU 任务。如果一个任务会引起 Suspense 下子组件抛出 thenable 对象，那么它就是 IO 任务。

在本例中，`setResource(createResource(6000))` 将创建一个 IO 任务 taskA，如果 taskA 执行了，就会在调用 Sub 函数组件时抛出 thenable 对象。定时器中的 `setS(x => x + 1)` 将创建一个 CPU 任务 taskB，它的 ExpirationTime 小于 `taskA.expirationTime`。

因为 taskB 的优先级更低，所以执行 taskB 之前一定要执行 taskA。在该规则下，taskA 和 taskB 只有两种调度方式。

1. 先执行 taskA 后执行 taskB。因为 taskA 无法完成，所以不会执行 taskB，结果为：页面卡住。
2. taskA 和 taskB 一起执行。

如果 taskA 和 taskB 一起执行，因为 Sub 组件会抛出 thenable 对象，所以 Sub 组件中 count 仍然为 2。但 `App:` 的值将增加。如此一来，页面上会出现 `App:` 为 3，但 count 值为 2 的 BUG。

React 采用的是 taskA 和 taskB 一起执行，但在 taskA 完成之前，React 不会进入到提交阶段，因此 Demo 中 count 值不会更新。毕竟**在 BUG 面前，性能不值一提**。

> **定义 IO 任务未完成**
>
> 如果触发 IO 任务时设置了 timeout，那么在满足以下两个条件时，该 IO 任务定义为未完成状态。
>
> 1. 在 timeout 时间范围内
> 2. Suspense 下子组件抛出 thenable 对象

> 在 Demo 中调试发现，触发 taskB 后，React 先尝试将 taskA 和 taskB 都执行，即在调和阶段执行 taskA 和 taskB。因为执行过程中 Sub 组件抛出 thenable 对象，所以会在提交阶段前判断当前时间是否在 timeout 时间范围内。如果在 timeout 时间范围内，则忽略本次调和阶段的执行结果，不进入提交阶段，否则才进行提交阶段，最后在提交阶段会判断是展示 children 还是展示 fallback。

### 期望 Demo

接下来看看在该场景下期望的效果。该 Demo 使用 Lane 模型的 React，并可线上访问，请戳[这里](https://codesandbox.io/s/demo-after-using-lane-model-o5wpu?file=/src/index.js)。

![demo-after-using-lane-model.gif](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7e2d9303cd944df6bcf693c2834d9749~tplv-k3u1fbpfcp-watermark.image)

上图中，在 count 为 2 时点击了 「CLICK ME」按钮，看到的现象为：

1. isPending 立马由 false 变为 true
2. count 值和 `App:` 每秒增加 1
3. 3 秒后 Suspense 挂载 `fallback`，此时 `App:` 为 5
4. 再过 3 秒，Suspense 挂载 `children`，此时 count 值和 `App:` 为 8

# 解决问题

## 尝试在 ExpirationTime 上修复

前面提到 ExpirationTime 引起问题场景是：**「高优先级 IO 任务」阻塞了「低优先级 CPU 任务」**。在该场景中，ExpirationTime 机制不能跳过高优先级的 IO 任务，导致低优先级的 CPU 任务（增加 count 值）没有执行，造成页面卡住。

ExpirationTime 机制引起该问题的更深层次原因是，它耦合了任务的**优先级**和**批量更新**。当决定了需要执行的优先级（currentExecTaskTime）时，所有 `task.expirationTime >= currentExecTaskTime` 的任务都将被执行。

显然解决上述问题就需要支持先执行低优先级任务，再执行高优先级任务，在 ExpirationTime 机制下可以有以下两种方式：

1. 使用 Set 维护 ExpirationTime 的集合，如果任务的 `task.expirationTime` 在该集合中，就应该执行该任务。但由于该方式既耗时又耗内存，所以该方式不可行。
2. 使用区间来表示需要执行的任务，如果任务满足 `lowExpirationTime <= task.expirationTime <= highExpirationTime`，就应该执行该任务。但由于该方式不能表达：「只执行 ExpirationTime 为 1 和 3 的任务且不执行 ExpirationTime 为 2 的任务」，所以也不可行。

## 使用 Lane 模型

React 最后选择使用 Lane 来表达任务的优先级，Lane 通过二进制位来表示。优先级最高的 SyncLane 为 1，其次为 2、4、8 等等，所有 Lane 的定义可参考[源码](https://github.com/facebook/react/blob/3d0895557a8c06e8fcab3bebaee368d5bc582337/packages/react-reconciler/src/ReactFiberLane.js#L77-L107)。

通过 Lanes 表达批量更新。Lanes 是一个整数，该整数所有二进制位为 1 对应的优先级任务都将被执行。例如 Lanes 为 17 时，表示将批量更新 SyncLane（值为 1）和 DefaultLane（值为 16）的任务。

## Lane 模式下的 Demo

前面也提到，Lane 模式下的 Demo 运行结果符合预期。该 Demo 可线上访问，请戳[这里](https://codesandbox.io/s/demo-after-using-lane-model-o5wpu?file=/src/index.js)。

![demo-after-using-lane-model.gif](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7e2d9303cd944df6bcf693c2834d9749~tplv-k3u1fbpfcp-watermark.image)

点击「CLICK ME」按钮后，执行 `setResource(createResource(6000))` 将生成优先级为 8192 的任务，该优先级对应 [TransitionShortLanes](https://github.com/facebook/react/blob/3d0895557a8c06e8fcab3bebaee368d5bc582337/packages/react-reconciler/src/ReactFiberLane.js#L93)。执行 `setS((x) => x + 1)` 将生成优先级为 512 的任务，该优先级对应 [DefaultLanes](https://github.com/facebook/react/blob/3d0895557a8c06e8fcab3bebaee368d5bc582337/packages/react-reconciler/src/ReactFiberLane.js#L90)。

每次定时器触发时，会先行优先级为 512 的任务，引起 count 值和 `App:` 增加 1。随后执行优先级为 8192 的任务，但由于该任务是未完成的 IO 任务，所以不会进入提交阶段。

事实上使用 Lane 模型后，IO 任务的优先级始终低于 CPU 任务（增加 count 值）的优先级，所以该机制并没有利用“先执行低优先级任务，再执行高优先级”的方式来解决问题。

ExpirationTime 就达不到这种效果，理论上可以每次产生新的 CPU 任务时就给所有 IO 任务的 ExpirationTime 做减法，来降低 IO 任务的优先级。但这种方式时间复杂度高，容易导致数值溢出，显然是不可行的。

# 使用 Lane 的不足

## 1. 饥饿任务

使用 Lane 而不是 ExpirationTime 可能会导致饥饿任务（starvation），目前 React 通过在调度器中为任务实现 timeout 机制。

> 参考 [Initial Lanes implementation](https://github.com/facebook/react/pull/18796) 中 「Stuff I intentionally omitted from this initial PR」 一节。

## 2. 可读性差

调试时要将 Lanes 转换为对应的优先级是在是太难了 😭。

# 参考文档

1. [Initial Lanes implementation](https://github.com/facebook/react/pull/18796)
2. [Some questions about lanes](https://github.com/facebook/react/issues/19804)

---

> **招贤纳士**
>
> 笔者在**成都**-**字节跳动**-**私有云方向**，主要技术栈为 React + Node.js。
> 团队扩张速度快，组内技术氛围活跃。公有云私有云刚刚起步，有很多技术挑战，未来可期。
>
> 有意愿者可通过该链接投递简历：https://job.toutiao.com/s/e69g1rQ
>
> 也可以添加我的微信 `moonball_cxy`，一起聊聊，交个朋友。

**原创不易，别忘了点赞鼓励哦 ❤️**

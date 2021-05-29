<!--
  摘要：从 Facebook 在 14 年提出 Flux 到现在，已经有 7 年了。本文考古了 Flux 架构的背景、解决的问题以及解决方式，同时也解释了单向数据流和层叠更新。Flux 是 React 数据管理的鼻祖，Redux 就是基于它而生的，理解它对数据管理的发展非常有帮助。
-->

# React 数据管理之 Flux

# 背景

在 2014 年的[Rethinking Web App Development at Facebook](https://www.youtube.com/watch?v=nYkdrAPrdcw&t=18s)会议上，Facebook 首次公开了 Flux 和 React。当时 Facebook 团队需要解决问题：“如何在产品的快速迭代中，保证产品的高质量？”。
![少时间但是高质量.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0b5322fa35d54d88a7141005f31f87f8~tplv-k3u1fbpfcp-watermark.image)

因此，Facebook 团队使用了 Flux 和 React 两套技术架构。通过 Flux 和 React，Facebook 团队提升了项目代码的可预测性，以便新来的工程师可以快速跟上节奏、完成功能开发和问题修复。
![flux-result.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9e0b1717aa8840848c97f2314621ec27~tplv-k3u1fbpfcp-watermark.image)

# MVC 问题

在使用 Flux 之前，Facebook 团队使用的 MVC 架构。在 MVC 架构下，Facebook 项目的数据流转过程如下所示：
![MVC-view和model交互.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/985c520a595f49b0b7372dfcfe2bf717~tplv-k3u1fbpfcp-watermark.image)
在该数据流中，View 会直接更新 Model。

看到这个架构图时，总感觉它不是常规的 MVC 架构，于是用 Google 查了下。在 wikipedia 中 MVC 架构是这样的：
![MVC-wikipedia.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9a92a2d4d92440f88e885b90e1641f22~tplv-k3u1fbpfcp-watermark.image)

在常规的 MVC 架构中，View 并不会直接更新 Model。那为什么 Facebook 给出的数据流如此不同呢？

## 为什么 View 会直接更新 Model

考虑如下 React 组件。线上 Demo [请戳这里](https://codesandbox.io/s/react-mvc-data-flow-02x4c)。

```js
// list 和 total 是两个 Model 层
// 当数据发生更改时，通过 forceUpdate 通知组件进行更新
let list = []
let total = 0

function useForceUpdate() {
  const setV = useState({})[1]
  return () => setV({})
}

export default function App() {
  const forceUpdate = useForceUpdate()
  const handleClick = useCallback(() => {
    // 使用 setTimeout，跳过 React 的批量更新机制
    setTimeout(() => {
      // 更新 list Model，更新后框架自动触发 forceUpdate
      // 这里手动触发进行模拟
      // order 1
      list.push(Math.random() >= 0.5 ? "item" : "moon")
      forceUpdate()

      // 更新 total Model，更新后框架自动触发 forceUpdate
      // 这里手动触发进行模拟
      // order 4
      total = total + 1
      forceUpdate()
    }, 0)
  }, [forceUpdate])

  useLayoutEffect(() => {
    // 删除 list Model 中的存在 moon 数据项
    if (list.includes("moon")) {
      // order 2
      list = list.filter(it => it !== "moon")
      forceUpdate()

      // order 3
      total = list.length
      forceUpdate()
    }
  }, [list, total, forceUpdate])

  return (
    <div className="App">
      <button onClick={handleClick}>添加一项数据</button>
      <div>共{total}项数据</div>
      <div>
        {list.map(it => (
          <div>{it}</div>
        ))}
      </div>
    </div>
  )
}
```

如果点击按钮后生成的数据是 `"moon"`，那么页面就会出现数据不一致的现象。
![flux-mvc-demo.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b1c419fc03504289811f793aebdf3914~tplv-k3u1fbpfcp-watermark.image)

引起数据不一致的原因是：

1. 向 list Model 中添加数据项 "moon"，触发组件重新 Render。
2. 在 `useLayoutEffect` 更新了 list Model 和 total Model。
3. 回到 `handleClick` 函数中执行 `total = total + 1`，此时 `total` 比 `list.length` 大 1。

这就是 Facebook 使用 MVC 框架时的数据流。在 `handleClick` 回调中，期望 `list.push(...)` 和 `total = total + 1` 一起执行。但万万没想到，中间被插了一脚，导致 Model 值已经不符合预期了。

上述例子中没有 MVC 中的 Controller。即使我们把更新 Model 的代码封装成函数，并封装到 Controller 对象中，让它完全符合 MVC 架构，它和上述例子仍然没有本质区别。只是通过 Action 通知 Controller 对 Model 进行更新罢了。

## 层叠更新（Cascading Updates）

在 Action1 中更新 Model 后（参考例子中的 handleClick 回调），引起页面重新渲染，同时又触发 Action2（参考例子中 useLayoutEffect 的回调）。**在 Action2 执行时，Action1 并没有结束。即同时存在两个 Action 被处理。** 这就是 Facebook 团队所说的层叠更新（Cascading Updates）。也可以理解为更新一个 Model 引起了另一个 Model 发生更新。
![MVC-jing-多-View.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ff0e1d979c744d6c859b3f169724b1f5~tplv-k3u1fbpfcp-watermark.image)

# Flux

![flux-data-flow.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/dab2258b183c477b9abaf6cbe1aa8484~tplv-k3u1fbpfcp-watermark.image)

与 MVC 对比，Flux 将 Controller 命名为 Dispatcher，将 Model 命名为 Store。View 中不会直接更新 Model，而是通过向 Dispatcher 发起 Action 通知 Store 更新。

只看图的话，Flux 数据流和 MVC 数据流只有命名上的区别。我们还是看看 Flux 架构更多的设计思想吧。

## 避免层叠更新

Flux 通过 Dispatcher 避免层叠更新问题。**一个 Action 必须被所有 Store 处理完之后，才能发起下一个 Action，否则 Dispatcher 将报错。**

在上面的例子中，需要将 `handleClick` 定义为一个 Action `"addItem"`。list Store 和 total Store 都需要对该 Action 进行处理。当点击按钮后，如果添加的数据项是 `"moon"`，代码执行的流程如下：

1. 发起 `"addItem"` Action，item 为 "moon"。
2. 执行 list.push("moon")` 更新了 list Store，触发 React 组件重新渲染。
3. 在 `useLayoutEffect` 中向 Dispatcher 发起另一个 Action `"removeMoon"`。
4. Dispatcher 检查到前一个 Action `"addItem"` 没有结束，报错。

从上述流程中可以看出，Flux 是在运行时避免层叠更新的。如果开发过程中没有发现层叠更新问题，那么该问题就会在线上环境暴露出来。

## 单向数据流

单向数据流是指状态更新由 Action 到 Dispatcher，再到 Store，最后到 Container View 和 View 组件。通过单向数据流，我们将轻松地由 Action 推理出 Store 数据，最后得出 View 界面。

单向数据流的另一面是双向绑定，即更新一个 Store 将引起另一个 Store 发生更新（也是层叠更新）。在 Flux 中，多个 Store 可以存在依赖关系，但它们必须有严格的层级，并且通过 Dispatcher 同步更新它们。

> 参考[原文](https://facebook.github.io/flux/docs/in-depth-overview/)。
> We found that two-way data bindings led to cascading updates, where changing one object led to another object changing, which could also trigger more updates. As applications grew, these cascading updates made it very difficult to predict what would change as the result of one user interaction. When updates can only change data within a single round, the system as a whole becomes more predictable.

## Dispatcher API

本节代码出自[Flux Dispatcher](https://facebook.github.io/flux/docs/dispatcher)。

### register(fn)

`register(fn)` 是将更新 Store 的代码都塞进 `fn` 中。其返回值可用于 `unregister(id)` 和 `waitFor(id[])`。

```js
CountryStore.dispatchToken = flightDispatcher.register(function(payload) {
  if (payload.actionType === "country-update") {
    CountryStore.country = payload.selectedCountry
  }
})
```

### unregister(id)

取消注册。

### waitFor(id[])

当 Action 触发后，Store1 和 Store2 都要更新状态，并且 Store1 依赖 Store2 最新的状态。此时，需要在 Store1 的更新方法中调用 `waitFor`，让 Store2 先进行更新。`waitFor` 是按照 Action 粒度划分的，不同的 Action，Store 之间的依赖关系可能不同。如果 `waitFor` 存在循环依赖，则 Dispatcher 将报错。

```js
CityStore.dispatchToken = flightDispatcher.register(function(payload) {
  if (payload.actionType === "country-update") {
    // `CountryStore.country` may not be updated.
    flightDispatcher.waitFor([CountryStore.dispatchToken])
    // `CountryStore.country` is now guaranteed to be updated.

    // Select the default city for the new country
    CityStore.city = getDefaultCityForCountry(CountryStore.country)
  }
})
```

### dispatch(...)

派发事件。如果在 `isDispatching()` 返回 true 时，执行 `dispatch()` 将报错。这种机制是为了避免层叠更新。

### isDispatching()

判断当前是否在派发事件的过程中。

# 总结

从 Facebook 在 14 年提出 Flux 到现在，已经有 7 年了。本文考古了 Flux 架构的背景、解决的问题以及解决方式，同时也解释了单向数据流和层叠更新。Flux 是 React 数据管理的鼻祖，Redux 就是基于它而生的，理解它对数据管理的发展非常有帮助。

# 推荐更多 React 文章

1. [React 性能优化 | 包括原理、技巧、Demo、工具使用](https://juejin.cn/post/6935584878071119885)
2. [聊聊 useSWR，为开发提效 - 包括 useSWR 设计思想、优缺点和最佳实践](https://juejin.cn/post/6943397563114455048)
3. [React 为什么使用 Lane 技术方案](https://juejin.cn/post/6951206227418284063)
4. [React Scheduler 为什么使用 MessageChannel 实现](https://juejin.cn/post/6953804914715803678)
5. [为什么「不变的虚拟 DOM」可以避免组件重新 Render](https://juejin.cn/post/6956397155363848228)
6. [深入理解 useEffect 和 useLayoutEffect 中回调函数的执行时机](https://juejin.cn/post/6959372766114119688)

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

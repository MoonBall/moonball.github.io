---
# 主题列表：juejin, github, smartblue, cyanosis, channing-cyan, fancy, hydrogen, condensed-night-purple, greenwillow, v-green, vue-pro, healer-readable, mk-cute, jzman, geek-black, awesome-green, qklhk-chocolate

# 贡献主题：https://github.com/xitu/juejin-markdown-themes

# 摘要：本文将从 JSX 和虚拟 DOM 说起，讲述什么是「不变的虚拟 DOM」。再根据 React 调和阶段的伪代码，将底层原理呈现出来。

theme: channing-cyan
highlight:
---

# 为什么「不变的虚拟 DOM」可以避免组件重新 Render

# TL;DR

本文包括：

1. 使用「不变的虚拟 DOM」避免组件 Render 的两个例子
2. 什么是「不变的虚拟 DOM」
3. React 调和阶段伪代码
4. 「不变的虚拟 DOM」避免组件 Render 的原因

# 例一

代码如下，Parent 组件每秒更新状态后，Child 组件会重新 Render 吗？线上 Demo [请戳这里](https://codesandbox.io/s/goofy-shirley-06gm2?file=/src/App.js)。

```js
function Child() {
  return <div>子组件</div>
}

// 该 Hook 用于每秒更新状态
function useUpdateStateEverySecond() {
  const [, setState] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => {
      setState(v => v + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [setState])
}

function Parent({ children: child }) {
  useUpdateStateEverySecond()

  return (
    <div>
      父组件
      {child}
    </div>
  )
}

function App() {
  return (
    <Parent>
      <Child />
    </Parent>
  )
}
```

乍一看肯定会认为 Child 组件会重新 Render。但实际上：每秒更新状态后，虽然 Parent 组件会再次 Render，但 Child 组件不会。

> 该例子优化技巧对应[React 性能优化](https://juejin.cn/post/6935584878071119885)之[状态下放，缩小状态影响范围](https://juejin.cn/post/6935584878071119885#heading-8)。

# 例二

代码如下，通过 useMemo 实现「不变的虚拟 DOM」。线上 Demo [请戳这里](https://codesandbox.io/s/infallible-shaw-qp8vu?file=/src/App.js)。

```js
function Child() {
  return <div>子组件</div>
}

function Parent() {
  useUpdateStateEverySecond()

  const child = useMemo(() => <Child />, [])

  return (
    <div>
      父组件
      {child}
    </div>
  )
}
```

> 该例子优化技巧对应 [React 性能优化](https://juejin.cn/post/6935584878071119885)之「[useMemo 返回虚拟 DOM](https://juejin.cn/post/6935584878071119885#heading-10)」，是一种常用的性能优化手段。

# 例三（优化前）

为了与前面两例做对比，将优化前的组件写法也列在这里，代码如下。线上 Demo [请戳这里](https://codesandbox.io/s/determined-shockley-7ytce?file=/src/App.js)。

```js
function Child() {
  return <div>子组件</div>
}

function Parent() {
  useUpdateStateEverySecond()

  return (
    <div>
      父组件
      <Child />
    </div>
  )
}
```

该例子中，每秒更新状态后，Parent 组件和 Child 组件都会再次 Render。

---

尽管例一和例二的代码组织方式和优化思路不同，但对 React 来说，它们对应的底层原理是相同的。

为了将原理讲清楚，我们需要先从 JSX 和虚拟 DOM 说起，了解什么是「不变的虚拟 DOM」。再结合 React 调和阶段的伪代码，将优化背后的原理陈诉清楚。

# 不变的虚拟 DOM

JSX 是一种描述虚拟 DOM 的语法。我们编写的 JSX 代码 `<Child />` 最终会被转换成 `React.createElement(Child, {}, null)`。参考 [React Without JSX](https://reactjs.org/docs/react-without-jsx.html) 了解更多转换 JSX 后的代码。

在例一和例二中，Parent 函数的返回值可以用 `createElement` 表达为：

```js
function Parent() {
  return createElement(div, {}, ["父组件", child])
}
```

而例三中，Parent 函数的返回值为：

```js
function Parent() {
  return createElement(div, {}, ["父组件", createElement(Child, {}, null)])
}
```

两份代码的区别非常明显。优化前，Parent 函数执行时，会重新生成 Child 组件对应的虚拟 DOM。而优化后 Child 组件对应的虚拟 DOM 并没有改变，它始终是 child。

# React 调和阶段（简化版）

为了说明优化背后原理，将 React 调和阶段简化为以下伪代码：

```js
/**
 * current 表示状态更新前的虚拟 DOM
 * next 表示状态更新后的虚拟 DOM
 */
function reconcile(current, next) {
  let needRender = false
  if (current.props !== next.props) {
    // 虚拟 DOM 的 Props 是新的，则需要执行 Render 过程
    needRender = true
  } else if (current.stateHasChanged) {
    // 该虚拟 DOM 的状态发生了更新，则需要执行 Render 过程
    needRender = true
  } else if (current.descendantStateHasChanged) {
    // 该虚拟 DOM 的子孙存在状态更新，不会执行该组件的 Render 过程
    // 但是将递归对子孙虚拟 DOM 执行调和阶段
    reconcile(current.child, current.child)
  }

  if (needRender) {
    // current.func 表示虚拟 DOM 对应的组件函数，比如：例子中 Parent、Child
    nextChild = current.func(current.props)
    reconcile(current.child, nextChild)
  }
}

// 调和阶段的起点为：
reconcile(currentRoot, currentRoot)
```

> 以上伪代码对应的 React 源码[请戳这里](https://github.com/facebook/react/blob/4a8deb08367d93d51912871b6d0e62852d0e981a/packages/react-reconciler/src/ReactFiberBeginWork.new.js#L3228-L3237)。

# 水到渠成

在例三中，更新 Parent 组件状态后，Child 组件对应的虚拟 DOM 是新生成的。因此，**`current.props` 将不等于 `next.props`**，所以 Child 组件将重新 Render。

在例二中，更新 Parent 组件状态后，Parent 组件重新 Render。但由于 `child` 使用了 useMemo 进行缓存，所以 Child 组件对应的虚拟 DOM 不变，则 `current.props` 等于 `next.props`。又由于该虚拟 DOM 没有状态更新，所以不需要重新 Render。

在例一中，更新 Parent 组件状态后，Parent 组件重新 Render。但由于 App 组件不会重新 Render，所以 Parent 组件收到的 `children` 属性值不变。因此，对于 Child 组件对应的虚拟 DOM，`current.props` 等于 `next.props`。又由于该虚拟 DOM 没有状态更新，所以不需要重新 Render。

# 总结

尽管以上三个例子对应的 JSX 代码相同，它们都是：

```js
<Parent>
  <Child />
</Parent>
```

但在例三（优化前）中，每次状态更新都会重新生成 `<Child />` 对应的虚拟 DOM。而在优化后的例一和例二中，`<Child />` 对应的虚拟 DOM 始终不变。

在调和阶段，如果虚拟 DOM 不变（即 `props` 引用值相等），且没有状态更新，那么就跳过该虚拟 DOM 的调和阶段。

以上便是可使用不变的虚拟 DOM 进行性能优化的原因。

# 推荐更多 React 文章

1. [React 性能优化 | 包括原理、技巧、Demo、工具使用](https://juejin.cn/post/6935584878071119885)
2. [聊聊 useSWR，为开发提效 - 包括 useSWR 设计思想、优缺点和最佳实践](https://juejin.cn/post/6943397563114455048)
3. [React 为什么使用 Lane 技术方案](https://juejin.cn/post/6951206227418284063)
4. [React Scheduler 为什么使用 MessageChannel 实现](https://juejin.cn/post/6953804914715803678)

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

---
# 主题列表：juejin, github, smartblue, cyanosis, channing-cyan, fancy, hydrogen, condensed-night-purple, greenwillow, v-green, vue-pro, healer-readable, mk-cute, jzman, geek-black, awesome-green, qklhk-chocolate

# 贡献主题：https://github.com/xitu/juejin-markdown-themes

# 摘要：或许你知道 useLayoutEffect 的回调函数是在提交阶段同步执行，但 useEffect 的回调函数是何时执行呢？在虚拟 DOM 树中它们的执行顺序又是怎样的呢？本文将回答这些问题，详细解释它们的执行时机。

theme: channing-cyan
highlight:
---

# 深入理解 useEffect 和 useLayoutEffect 中回调函数的执行时机

# TL;DR

`useEffect` 和 `useLayoutEffect` 的使用方式相同。例如，使用 `useEffect` 的代码如下所示：

```js
useEffect(
  function create() {
    // 创建副作用的回调函数
    return function destroy() {
      // 清理副作用的回调函数
    }
  },
  // 副作用对应的依赖
  [...deps]
)
```

那么问题来了，React 何时执行上述 `create` 函数和 `destroy` 函数呢？

为了回答该问题，本文包括：

1. 在虚拟 DOM 树中，两种回调函数的执行顺序。
2. useLayoutEffect 的回调何时触发？
3. useEffect 的回调何时触发？

# 在虚拟 DOM 树中的执行顺序

在虚拟 DOM 树结构中，`useEffect` 和 `useLayoutEffect` 的回调函数执行顺序是相同的。因此，只要掌握了 useEffect，也就掌握了 useLayoutEffect。例如当虚拟 DOM 结构如下图时：

![组件结构.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ccbe63cc0497497cbad7f60626e7c824~tplv-k3u1fbpfcp-watermark.image)

无论使用的 Hook 是 `useEffect` 还是 `useLayoutEffect`，`create` 函数的执行顺序都是：

```
2-1
2-2
1-1
2-3
1-2
```

## 先 destroy 再 create

在组件状态更新后，React 将先调用所有 `destroy` 函数，再调用所有 `create` 函数。

## destroy 顺序

destroy 分为两类：

1. 从组件树中删除虚拟 DOM 时，引起的 `destroy` 函数被调用。
2. 组件内 Hook 的依赖发生改变，引起的 `destroy` 函数被调用。

### 删除时

React 使用[先序遍历](https://baike.baidu.com/item/%E5%85%88%E5%BA%8F%E9%81%8D%E5%8E%86)，处理删除时的虚拟 DOM，并执行它们的 destroy 函数。

线上 Demo 请戳[这里](https://codesandbox.io/s/uselayouteffect-zhixingshunxu-h5gg2?file=/src/App.js:489-1049)。本节内容对应 Demo 中的 Show1。

```js
const useEffectFunc = React.useEffect
// const useEffectFunc = React.useLayoutEffect;

function Comp({ name, children, v }) {
  useEffectFunc(
    function create() {
      console.log("create effect", name)
      return function destroy() {
        console.log("destroy effect", name)
      }
    },
    [v]
  )
  return (
    <ul>
      <li>
        <div>{name}</div>
        {children}
      </li>
    </ul>
  )
}

function App() {
  const [showComp, setShowComp] = useState(true)

  return (
    <div>
      <div>
        <button onClick={() => setShowComp(v => !v)}>
          点击{showComp ? "隐藏" : "展示"}
        </button>
      </div>
      {showComp && (
        <div>
          <Comp name="1-1">
            <Comp name="2-1" />
            <Comp name="2-2" />
          </Comp>
          <Comp name="1-2">
            <Comp name="2-3" />
          </Comp>
        </div>
      )}
    </div>
  )
}
```

点击按钮后，所有 Comp 组件对应的虚拟 DOM 都会被删除，此时 `destroy` 的调用顺序为：

```
1-1
2-1
2-2
1-2
2-3
```

### 更新时

React 使用[后序遍历](https://baike.baidu.com/item/%E5%90%8E%E5%BA%8F%E9%81%8D%E5%8E%86)，处理更新时的虚拟 DOM，并执行它们的 destroy 回调。

线上 Demo 请戳[这里](https://codesandbox.io/s/uselayouteffect-zhixingshunxu-h5gg2?file=/src/App.js:1050-1585)。本节内容对应 Demo 中的 Show2。

```js
function App() {
  const [showComp, setShowComp] = useState(true)

  return (
    <div>
      <div>
        <button onClick={() => setShowComp(v => !v)}>点击更新</button>
      </div>
      <div>
        <Comp name="1-1" v={showComp}>
          <Comp name="2-1" v={showComp} />
          <Comp name="2-2" v={showComp} />
        </Comp>
        <Comp name="1-2" v={showComp}>
          <Comp name="2-3" v={showComp} />
        </Comp>
      </div>
    </div>
  )
}
```

点击按钮后，传给 Comp 组件的 `v` 发生改变。因为 Comp 中 Hook 依赖于 `v`，所以会执行 `destroy` 函数。此时 `destroy` 的调用顺序为：

```
2-1
2-2
1-1
2-3
1-2
```

### 同时存在删除和更新时

当组件的 children 既存在被删除的虚拟 DOM，也存在更新的虚拟 DOM 时，会先处理被删除的虚拟 DOM，再处理更新的虚拟 DOM。

线上 Demo 请戳[这里](https://codesandbox.io/s/uselayouteffect-zhixingshunxu-h5gg2?file=/src/App.js:1586-2138)。本节内容对应 Demo 中的 Show3。

```js
function App() {
  const [showComp, setShowComp] = useState(true)

  return (
    <div>
      <div>
        <button onClick={() => setShowComp(v => !v)}>点击更新</button>
      </div>
      <div>
        <Comp name="1-1" v={showComp}>
          <Comp name="2-1" v={showComp} />
          <Comp name="2-2" v={showComp} key={showComp ? "1" : "0"} />
        </Comp>
        <Comp name="1-2" v={showComp}>
          <Comp name="2-3" v={showComp} />
        </Comp>
      </div>
    </div>
  )
}
```

点击按钮后，因为 `<Comp name="2-2" key={} />` 的 key 发生改变，所以它会被删除，然后重新创建。此时 `destroy` 的调用顺序为：

```
2-2
2-1
1-1
2-3
1-2
```

### 伪代码

`destroy` 回调在虚拟 DOM 树中的执行顺序伪代码如下：

```js
function execDestroy(node) {
  // 执行该虚拟 DOM 相关的 destroy 回调
}

function travelDestroy(node) {
  for (const deletedChild of node.deletions) {
    // 如果该虚拟 DOM 的 children 存在删除，则处理每个被删除的虚拟 DOM
    travelDeletion(deletedChild)
  }

  for (const child of node) {
    travelDestroy(child)
  }

  execDestroy(node)
}

function travelDeletion(node) {
  execDestroy(node)
  for (const child of node.children) {
    travelDeletion(child)
  }
}

// React 最初调用
travelDestroy(root)
```

## create 顺序

React 使用[后序遍历](https://baike.baidu.com/item/%E5%90%8E%E5%BA%8F%E9%81%8D%E5%8E%86)虚拟 DOM 树的方式，执行它们的 `create` 回调。

线上 Demo 请戳[这里](https://codesandbox.io/s/uselayouteffect-zhixingshunxu-h5gg2?file=/src/App.js)。Demo 中所有例子的 create 回调执行顺序是相同的。其结果为：

```
2-1
2-2
1-1
2-3
1-2
```

### 伪代码

`create` 回调在虚拟 DOM 树中的执行顺序伪代码如下：

```js
function execCreate(node) {
  // 执行该虚拟 DOM 相关的 create 回调
}

function travelCreate(node) {
  for (const child of node) {
    travelCreate(child)
  }

  execCreate(node)
}

// React 最初调用
travelCreate(root)
```

# useEffect vs useLayoutEffect

useLayoutEffect 的回调是在提交阶段同步执行的，而 useEffect 是在提交阶段完成后的未来某时刻执行。因此，在 useEffect 的回调中更新组件状态或修改 DOM，往往会引起页面闪一下的 bug。当遇到这类问题时，应使用 useLayoutEffect 代替 useEffect，因为同步执行的代码一定在浏览器重绘之前执行。

# 何时触发 useEffect 的回调函数

上面谈到 useEffect 的回调会在未来某时刻执行，那具体是什么时候呢？

[React 源码](https://github.com/facebook/react/blob/master/packages/react-reconciler/src/ReactFiberWorkLoop.old.js#L1797)将 useEffect 回调的处理交给了 Scheduler 进行调度。React 源码如下：

```js
if (
  (finishedWork.subtreeFlags & PassiveMask) !== NoFlags ||
  (finishedWork.flags & PassiveMask) !== NoFlags
) {
  if (!rootDoesHavePassiveEffects) {
    rootDoesHavePassiveEffects = true
    scheduleCallback(NormalSchedulerPriority, () => {
      flushPassiveEffects()
      return null
    })
  }
}
```

因为调度的优先级是 `NormalSchedulerPriority`，所以该任务最快也要在下个宏任务中才会执行。根据以上代码，我们可将 useEffect 的回调称为 Passive Effect。

> React Scheduler 可参考笔者写的文章：[React Scheduler 为什么使用 MessageChannel 实现](https://juejin.cn/post/6953804914715803678)。

但 useEffect 的回调函数不一定在下个宏任务中执行。如果在 useEffect 的回调触发之前，React 组件又进行了一次状态更新，React 会先将之前的 Passive Effect 都处理掉。

所以 useEffect 的回调不一定在浏览器重绘之后才执行。在以下代码中，useEffect 的回调就是在重绘之前执行的，并不会造成页面闪动。线上 Demo 请戳[这里](https://codesandbox.io/s/exec-useeffect-before-repaint-ch4dd?file=/src/App.js)。

```js
const useParentEffect = useLayoutEffect
// const useParentEffect = useEffect;

function Parent() {
  const [v, setV] = useState(1)
  useParentEffect(() => {
    wait(100)
    setV(2)
  }, [])

  return <Child />
}

function Child() {
  const [str, setStr] = useState("111")

  useEffect(function create() {
    wait(500)

    setStr("222")
  }, [])

  wait(500)
  return <div>{str}</div>
}
```

当 `useParentEffect` 是 `useLayoutEffect` 时，页面直接展示 222。

但是当 `useParentEffect` 是 `useEffect` 时，或者当注释掉 `useParentEffect` 的代码时，页面会先展示 111 再展示 222。

# 总结

本文可总结为以下四点内容。

一、单独就 `useEffect` 或 `useLayoutEffect` 而言，会先执行所有的 `destroy` 回调再执行所有 `create` 回调。

二、在虚拟 DOM 树中，回调函数的执行顺序如下：

1. 对于删除的虚拟 DOM，以**先序遍历**虚拟 DOM 树的顺序调用 `destroy`。
2. 对于更新的虚拟 DOM，以**后序遍历**虚拟 DOM 树的顺序调用 `destroy`。
3. 以**后续遍历**虚拟 DOM 树的顺序调用 `create`。

三、`useEffect` 和 `useLayoutEffect` 的区别在于： `useLayoutEffect` 是在提交阶段同步执行，而 `useEffect` 是在未来某时刻执行。

四、`useEffect` 回调的执行时机为以下两种情况之一：

1. 由 React Scheduler 调度，在后续宏任务中执行。
2. 在下一次调和阶段之前执行。

# 推荐更多 React 文章

1. [React 性能优化 | 包括原理、技巧、Demo、工具使用](https://juejin.cn/post/6935584878071119885)
2. [聊聊 useSWR，为开发提效 - 包括 useSWR 设计思想、优缺点和最佳实践](https://juejin.cn/post/6943397563114455048)
3. [React 为什么使用 Lane 技术方案](https://juejin.cn/post/6951206227418284063)
4. [React Scheduler 为什么使用 MessageChannel 实现](https://juejin.cn/post/6953804914715803678)
5. [为什么「不变的虚拟 DOM」可以避免组件重新 Render](https://juejin.cn/post/6956397155363848228)

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

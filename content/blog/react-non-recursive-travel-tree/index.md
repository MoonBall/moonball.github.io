---
# 主题列表：juejin, github, smartblue, cyanosis, channing-cyan, fancy, hydrogen, condensed-night-purple, greenwillow, v-green, vue-pro, healer-readable, mk-cute, jzman, geek-black, awesome-green, qklhk-chocolate

# 贡献主题：https://github.com/xitu/juejin-markdown-themes

# 摘要：在计算机学科中，树的遍历算法是数据结构课程的基础内容。掌握先序遍历和后序遍历对理解 React 内部流程非常有帮助，比如：React 调和阶段是先序遍历（先执行父组件的 Render，再执行子组件的 Render）、React componentDidMount 是后序遍历（先执行子组件的 cDM，再执行父组件的 cDM），还有 useEffect 和 useLayoutEffect 回调的执行时机等等。

theme: channing-cyan
highlight:
---

# 从 React 源码中学到的非递归先序遍历和后序遍历算法

# TL;DR

本文包括：

1. 树、先序遍历、后序遍历的定义
2. 递归实现先序和后序遍历
3. 非递归实现对 Fiber 结构树的先序和后序遍历
4. 为什么 React 没有中序遍历？

# 定义

[树](https://baike.baidu.com/item/%E6%A0%91/2699484?fromtitle=%E6%95%B0%E6%8D%AE%E7%BB%93%E6%9E%84%20%E6%A0%91)的关键点是：在一颗树中，除根节点外，其他节点**有且仅有**一个父节点。

[先序遍历](https://baike.baidu.com/item/%E5%85%88%E5%BA%8F%E9%81%8D%E5%8E%86/6442839)指，首先访问根结点，然后遍历左子树，最后遍历右子树。先序遍历下图所示的树，遍历结果为：ABDECF。
![](./imgs/tree.png)

[后序遍历](https://baike.baidu.com/item/%E5%90%8E%E5%BA%8F%E9%81%8D%E5%8E%86/1214806)指，首先遍历左子树，然后遍历右子树，最后访问根结点，在遍历左、右子树时，仍然先遍历左子树，然后遍历右子树，最后访问根结点。后序遍历上图所示的树，遍历结果为：DEBFCA。

# 递归实现

定义树中节点的数据结构：

```ts
interface Node<T> {
  value: T
  children: Node[]
}
```

用该数据结构表示上图中的树：

```js
var root = {
  value: "A",
  children: [
    {
      value: "B",
      children: [
        {
          value: "D",
          children: [],
        },
        {
          value: "E",
          children: [],
        },
      ],
    },
    {
      value: "C",
      children: [
        {
          value: "F",
          children: [],
        },
      ],
    },
  ],
}
```

## 先序遍历

```js
function preOrderTravel(node) {
  console.log(node.value)
  for (const child of node.children) {
    preOrderTravel(child)
  }
}

// 测试
preOrderTravel(root)
```

## 后序遍历

```js
function postOrderTravel(node) {
  for (const child of node.children) {
    postOrderTravel(child)
  }
  console.log(node.value)
}

// 测试
postOrderTravel(root)
```

## 同时先序和后序遍历

```js
function preAndPostOrderTravel(node) {
  console.log("preOrder:", node.value)
  for (const child of node.children) {
    preAndPostOrderTravel(child)
  }
  console.log("postOrder:", node.value)
}

// 测试
preAndPostOrderTravel(root)
```

# React 中非递归实现

React 为了避免长时间执行调和阶段，引起页面卡顿。通过使用 Fiber 架构，将调和阶段由递归算法转换为非递归算法，实现可中断调和阶段的目的。

## Fiber 节点数据结构

```ts
interface FiberNode<T> {
  value: T
  child: FiberNode // 该节点下第一个孩子节点
  sibling: FiberNode // 该节点的兄弟节点
  return: FiberNode // 该节点的父节点
}
```

前面的树结构用 FiberNode 表示为：

```js
var nodeA = { value: "A", child: null, sibling: null, return: null }
var nodeB = { value: "B", child: null, sibling: null, return: null }
var nodeC = { value: "C", child: null, sibling: null, return: null }
var nodeD = { value: "D", child: null, sibling: null, return: null }
var nodeE = { value: "E", child: null, sibling: null, return: null }
var nodeF = { value: "F", child: null, sibling: null, return: null }

nodeA.child = nodeB
nodeB.child = nodeD
nodeB.sibling = nodeC
nodeD.sibling = nodeE
nodeC.child = nodeF

nodeB.return = nodeA
nodeC.return = nodeA
nodeD.return = nodeB
nodeE.return = nodeB
nodeF.return = nodeC
```

## 先序遍历

```js
function preOrderTravel(root) {
  let node = root
  while (true) {
    console.log(node.value)

    if (node.child) {
      node = node.child
      continue
    }

    // 当树只有一个节点时会
    if (node === root) {
      return
    }

    while (node.sibling === null) {
      if (node.return === null || node.return === root) {
        // 通过判断 node.return 是否为 root，实现遍历某个子树
        return
      }

      node = node.return
    }

    node = node.sibling
  }
}

// 测试
preOrderTravel(nodeA)

// 遍历子树
preOrderTravel(nodeB)
```

以上代码逻辑参考自 React 源码中 [commitNestedUnmounts](https://github.com/facebook/react/blob/bd070eb2c489a1f758e4a55b193820af7346fa15/packages/react-reconciler/src/ReactFiberCommitWork.old.js#L1287-L1324)。

## 后序遍历

```js
function postOrderTravel(root) {
  let node = root
  while (true) {
    if (node.child !== null) {
      node = node.child
    } else {
      while (true) {
        console.log(node.value)

        if (node === root) {
          return
        }

        if (node.sibling !== null) {
          node = node.sibling
          break
        }

        node = node.return
      }
    }
  }
}

// 测试
postOrderTravel(nodeA)

// 遍历子树
postOrderTravel(nodeB)
```

以上代码逻辑参考自 React 源码中 [commitPassiveUnmountEffects](https://github.com/facebook/react/blob/master/packages/react-reconciler/src/ReactFiberCommitWork.old.js#L2571-L2645)。

## 同时先序和后序遍历

```js
function preAndPostOrderTravel(root) {
  let node = root
  while (true) {
    console.log("preOrder:", node.value)

    if (node.child !== null) {
      node = node.child
    } else {
      while (true) {
        console.log("postOrder:", node.value)

        if (node === root) {
          return
        }

        if (node.sibling !== null) {
          node = node.sibling
          break
        }

        node = node.return
      }
    }
  }
}

// 测试
preAndPostOrderTravel(nodeA)

// 遍历子树
preAndPostOrderTravel(nodeB)
```

以上代码逻辑参考自 React 源码中 [commitPassiveUnmountEffects](https://github.com/facebook/react/blob/master/packages/react-reconciler/src/ReactFiberCommitWork.old.js#L2571-L2645)。

# 为什么 React 没有中序遍历？

[中序遍历](https://baike.baidu.com/item/%E4%B8%AD%E5%BA%8F%E9%81%8D%E5%8E%86)是二叉树特有的遍历方式。中序遍历指，首先遍历左子树，然后访问根结点，最后遍历右子树。中序遍历下图所示的二叉树，遍历结果为：DBEAFC。
![](./imgs/tree.png)

因为在 React 的虚拟 DOM 树中，节点可以有任意多个子节点，所以它不是一颗二叉树。因此也就不存在中序遍历方式了。

# 总结

在计算机学科中，树的遍历算法是数据结构课程的基础内容。掌握先序遍历和后序遍历对理解 React 内部流程非常有帮助，比如：React 调和阶段是先序遍历（先执行父组件的 Render，再执行子组件的 Render）、React componentDidMount 是后序遍历（先执行子组件的 cDM，再执行父组件的 cDM），还有 [useEffect 和 useLayoutEffect 回调的执行时机]()等等。

本文通过递归算法和非递归算法分别实现了树的先序遍历和后序遍历。相信我们在未来都能用上树，到那时再回来看看本文吧。

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

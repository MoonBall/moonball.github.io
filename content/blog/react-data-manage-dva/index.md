# dva 的定位

首先 dva 的定位是**基于 redux 和 redux-saga 的数据流管理方案**。然后 dva 还提供了一些简化的 API 和插件（例如：集成 react-router、redux-devtool，提供 loading 插件），所以也可以将其理解为应用框架。

## dva 的创新点及解决的问题

### model 概念提出

dva 最大的创新点是 model 概念的提出。与之前的 Redux 数据管理相比较，dva 的 model 提出后解决了以下问题：

1. 之前的 Redux 应用中不仅需要先声明 ActionType，还需要在 reducer 对 ActionType 进行判断，引入 model 便没有这样的逻辑了，[dva 在内部对 `model.reducers` 进行了处理](https://github.com/dvajs/dva/blob/3eaee309ede9cf1e255326150ee2210bd04c1abf/packages/dva-core/src/handleActions.js#L22-L26)。
2. 数据和操作数据的行为（包括异步逻辑）均置于同一个 model 文件中。
3. 通过 redux-saga 实现异步逻辑处理，提出 effects 概念，可以通过 dispatch action 的方式执行 effect 函数。dva 中每个 effect 都是一个 [saga](https://redux-saga.js.org/docs/introduction/GettingStarted)，尽管个人认为 redux-saga 并不好用，但是 dva 还是做到了和 redux-saga 高度集成和简化。例如：每个 effect 可以通过数据的第二个值指定 saga 的类型，在 dispatch action 执行一个 effect 时其返回值是 promise。
4. 可以通过实现返回 model 的函数快速复用一类 model（如：dva-loading model）。

### 实现 unmodel 和 replaceModel

redux 作为全局数据管理方案，最大的弊端就是随着页面的不断增加，store 将不断膨胀。如果要在页面切换过程中，自己实现卸载旧页面数据、挂载新页面数据和保留公共数据，又将非常麻烦。

所以 dva 在 model 概念的基础上，可以方便的添加、卸载、更新一个 model，可以非常方便地动态修改 store。

### 框架级优化，提升开发体验

开发者使用 dva 后只需关心如何开发 model 和页面，其他繁琐的 redux 相关的配置都被隐藏在 dva 内部。

1. 使用 `connected-react-router` 将 router 状态存放到 redux 中。在没有 Hooks 的时代里，路由改变触发组件重绘需要用 `<Router>` 将组件包裹起来才行。但将 router 的状态存放到 redux 中后，路由改变就跟其他状态改变没什么区别了。
2. 开发者通过 `app.router(({ app, history }) => <Page />)` 和 `app.start(rootDom)` 关注页面开发，而无需关心如何把 Redux 如何挂载到组件树中。
3. [默认集成 Redux DevTool](https://github.com/dvajs/dva/blob/3eaee309ede9cf1e255326150ee2210bd04c1abf/packages/dva-core/src/createStore.js#L29-L32)。
4. 可 [动态加载 model 和组件](https://github.com/dvajs/dva/blob/master/packages/dva/src/dynamic.js)。在 model 加载完成后将他们注册到 app 中，最后 resolve 的是组件。在组件和 model 没有加载之前，会展示 Loading 态组件。
5. 内部做了处理，可在服务端使用。比如：[同构的 fetch 函数](https://github.com/dvajs/dva/blob/master/packages/dva/fetch.js)和[动态加载 react-dom](https://github.com/dvajs/dva/blob/3eaee309ede9cf1e255326150ee2210bd04c1abf/packages/dva/src/index.js#L101-L104) 等。

### 其他创新点（或缺点）

1. `model.subscriptions` 用于订阅一些全局事件。这个创新我感觉没什么用，因为我们通常都是在组件的生命周期钩子中订阅事件。现在把订阅操作移到 model 中，不但没有必要，而且它还不能覆盖所有的订阅场景（如：只订阅组件内的 dom 节点触发的事件），所以基本没什么用。唯一的区别就是其订阅函数和取消订阅函数可以在 model 的生命周期中自动执行，比如 `app.unmodel(namespace)` 时自动执行 `namespace` 对应 model 的取消订阅函数。
2. 使用 redux-saga 作为异步逻辑处理方案，有以下缺点：
   1. 学习成本变高了（包括 saga 和 generator function 的用法）
   2. effects 中可以调用其他 model 的 reducers 和 effects，这就说明一个 model 耦合了另一个 model，最后会导致 effects 中的代码变混乱。
   3. 在 effects 中会写出 `yield yield put({ type: 'effectB', payload: xxx })` 代码，该代码非常难以理解，其目的是等待 effectB 函数结束后再继续执行。
   4. redux-saga 的核心点在于通过 generator function 测试异步逻辑，但是这种测试方式非常依赖代码实现，没有意义。
   5. effect 中的报错，需要在 dva 的 onError 中做 fallback 处理，否则错误会被吃掉。

# dva 的用法

## 1. 创建 dva 实例 `app` 变量，可以传入 history 指定路由形式

```js
import dva from "dva"
import { createBrowserHistory } from "history"

const app = dva({ history: createBrowserHistory() })
```

## 2. 通过 `app.router()` 和 `app.start()` 启动应用

```js
import React from "react"
import "./index.css"
import dva from "dva"
import { Router, Route, Switch } from "react-router-dom"
import { createBrowserHistory } from "history"

const app = dva({ history: createBrowserHistory() })
app.router(({ history }) => {
  return (
    <Router history={history}>
      <Switch>
        <Route path="/a">
          <div>a</div>
        </Route>

        <Route path="/b">
          <div>b</div>
        </Route>
      </Switch>
    </Router>
  )
})

app.start(document.getElementById("root"))
```

## 3. 编写 UI 组件、定义 Model、connect 起来

这几步的使用方式参考 dva 官方文档即可：

1. [编写 UI 组件](https://dvajs.com/guide/getting-started.html#%E7%BC%96%E5%86%99-ui-component)
2. [定义 Model](https://dvajs.com/guide/getting-started.html#%E5%AE%9A%E4%B9%89-model)
3. [connect 起来](https://dvajs.com/guide/getting-started.html#connect-%E8%B5%B7%E6%9D%A5)

# dva 的源码分析

dva 分为 4 个 packages：

1. [dva-core](https://github.com/dvajs/dva/tree/master/packages/dva-core) 是 dva 数据管理方案的核心代码。
2. [dva](https://github.com/dvajs/dva/tree/master/packages/dva) 是暴露给开发者使用的 package。其在 core 的基础上，将 router 集成到 redux 中，简化 react-redux 的接入，将常用的底层方法都暴露给开发者。可以认为是框架特性，提升开发体验的一层。
3. [dva-immer](https://github.com/dvajs/dva/tree/master/packages/dva-immer) 使用 `_handleActions` Hook 实现，实现在 reducer 方法中可以直接修改 state 的状态。
4. [dva-loading](https://github.com/dvajs/dva/tree/master/packages/dva-loading) 用于在 Effect 执行前触发 loading 态，在 Effect 执行后关闭 loading 态，内部通过 `onEffect` 和 `extraReducers` Hook 实现。其状态包含 global、model、effects 三个维度，通用使用 global 即可。使用方式参考测试用例代码。

## dva 中插件系统的实现

参考[源码文件](https://github.com/dvajs/dva/blob/master/packages/dva-core/src/Plugin.js)，dva 的插件系统分为两个部分：

1. 插件注册 `use(plugin)`。
2. 返回最终的插件 `get(key)`。

### 插件注册

每个插槽都维护一个数组，每次注册插件就是向该数组中添加插件。

```js
function use(plugin) {
  const { hooks } = this
  for (const key in plugin) {
    if (Object.prototype.hasOwnProperty.call(plugin, key)) {
      if (key === "_handleActions") {
        // 特殊项
        this._handleActions = plugin[key]
      } else if (key === "extraEnhancers") {
        // 特殊项
        hooks[key] = plugin[key]
      } else {
        // 常规项，将 `plugin` 注册到 `hooks` 数组中
        hooks[key].push(plugin[key])
      }
    }
  }
}
```

### 返回最终的插件

返回最终的插件也比较简单，直接返回 `key` 对应的所有插件即可。

```js
function get(key) {
  const { hooks } = this
  if (key === "extraReducers") {
    // 特殊项
    return getExtraReducers(hooks[key])
  } else if (key === "onReducer") {
    // 特殊项
    return getOnReducer(hooks[key])
  } else {
    // 返回 `key` 对应的所有插件
    return hooks[key]
  }
}

function getExtraReducers(hook) {
  let ret = {}
  for (const reducerObj of hook) {
    ret = { ...ret, ...reducerObj }
  }
  return ret
}

function getOnReducer(hook) {
  return function(reducer) {
    for (const reducerEnhancer of hook) {
      reducer = reducerEnhancer(reducer)
    }
    return reducer
  }
}
```

### 插件系统总结

整体来看 dva 基本是通过回调函数实现插件机制，比较简单粗暴。

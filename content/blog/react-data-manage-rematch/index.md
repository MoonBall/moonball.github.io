# React 数据管理之 rematch

# TL;DR

通过本文将了解：

1. rematch 的定位
2. rematch 创新点
3. 对比 rematch 和 dva
4. rematch 源码分析，了解其插件系统实现方式

# rematch 的定位

rematch 的定位是**基于 redux 的数据管理方案，并为开发者提供了更好开发体验**。更好的开发体验包括：

- 支持 TS
- 简化 redux 配置
- 减少模板代码
- 支持异步副作用处理机制

等等...

# rematch 创新点

## 1. 返回的 Store 支持 TS

使用 rematch 后，我们可以通过 `store.dispatch.model.xxx()` 来执行一个 Action 操作，并且 `store.dispatch` 的类型是 TS 自动推算出来的，无需开发者手动定义。这不仅增强了编码的效率（类型自动推导）和正确性（类型检测），而且还解决了在纯 redux 方案中维护和使用 ActionType 的痛点。

由于每个 Model 是一个单独的文件，那么在真实的业务场景中，我们如何在一个 Model 中使用其他 Model 的数据或行为呢？要实现这样的功能，我们需要通过 rematch 的最佳实践，将每个 Model 通过 `createModel` 方法创建出来，并通过 `Models<RootModel>` 组装出最终的 Model 类型，并创建出 Store。

```ts
type CountState = number

// 每个 model 通过 createModel 方法创建出来
// increment1 方法中使用了 count2 中的 Action，其中 dispatch 是由 TS 自动推导出来的
const count1 = createModel<RootModel>()({
  state: 0,
  reducers: {},
  effects: dispatch => {
    return {
      increment1: (payload: number) => {
        dispatch.count2.increment2(payload)
      },
    }
  },
})

// 每个 model 通过 createModel 方法创建出来
const count2 = createModel<RootModel>()({
  state: 0,
  reducers: {
    increment2: (state: CountState, payload: number): CountState =>
      state + payload,
  },
})

// 通过 `Models<RootModel>` 组装出最终的 Model 类型
interface RootModel extends Models<RootModel> {
  count1: typeof count1
  count2: typeof count2
}
const models: RootModel = { count1, count2 }
const store = init({
  models,
})

// store.getState() 和  store.dispatch 已经被自动推算出类型了
```

## 2. 基于 model 组织状态

在 rematch 中，基于 Model 组织状态的好处有：

1. 减少了模板代码。Model 组织状态后，可自动生成 ActionType。开发者便无需声明 actionType，也不用在 reducer 函数中对 ActionType 进行判断了。
2. 将状态和对状态的操作放在同一个文件中，简化了代码组织。无需纠结 reducer、ActionCreator 和 ActionType 分别应该放在哪里。

## 3. 副作用实现

粗略一看以为 rematch 的副作用是基于 redux-thunk 实现的，实际上并不是。rematch 的副作用实现方式可以通过以下两点讲清楚：

1. effects 方法调用时，实际上会 dispatch 一个 `{model}/{effect}` 的 Action。
2. rematch 实现了一个 redux middleware，在该 middleware 中判断 Action 是否是一个 effect，如果是则调用 effect 函数。

既然副作用实现和 redux-thunk 没有任何关系，所以当 `effects` 是一个函数时，它并没有第二个参数 `getState`，不要和 `redux-thunk` 搞混了。

```js
// redux-thunk
function (dispatch, getState) {
  // ...
}

// rematch 的 effects
createModel()({
  state: 0,
  reducers: {},
  // 这里没有第二个参数 getState
  effects: dispatch => {
    return {
      increment1: (payload: number) => {
        dispatch.count2.increment2(payload)
      },
    }
  },
})
```

## 4. 提供更易用的 redux 使用方案

rematch 的核心定位就是简化 redux 的使用，所以它内部支持一些特殊又实用的功能。

1. 提供 `redux.rootReducers` 选项，选项，rootReducers 优先于 `model.reducers` 执行，rootReducers 的返回值会被作为新的 state 传入 `model.reducers` 中，参考[源码](https://github.com/rematch/rematch/blob/6d2ebc76e48ef0c8b4041c6df30db733a60ec9a2/packages/core/src/reduxStore.ts#L120-L133)。可用于修改整个 Store 的数据，例如：[重置状态](https://github.com/rematch/rematch/blob/6d2ebc76e48ef0c8b4041c6df30db733a60ec9a2/packages/core/test/store.test.ts#L117-L146)。也可用于将纯 Redux 项目的 reducers 复制过来，便于平滑接入 rematch。
2. model 提供 `baseReducer` 选项，`baseReducer` 的优先级也比 `model.reducers` 高，会将 `baseReducer` 的返回值作为新的状态传给 `model.reducers`，参考[源码](https://github.com/rematch/rematch/blob/6d2ebc76e48ef0c8b4041c6df30db733a60ec9a2/packages/core/src/reduxStore.ts#L90-L96)。
3. 提供 `select` 插件包，通过 `reselect` 实现的计算属性。但个人觉得学习成本偏高，写起来有点看不懂。
4. 提供 `loading` 插件，插件按照 effect/model/global 进行划分。
5. 提供 `persist` 插件，可将 store 中数据持久化。
6. 提供 `immer` 插件，可以在 reducer 中直接使用修改 state。
7. 提供 `updated` 插件，可以记录每个 effect 的最后结束时间。
8. 提供 `typed-state` 插件，用于每次 Action 执行完后，检查 State 是否还符合定义的类型。开发者通过 `model.typings` 字段传入期望的类型。

# 对比 rematch 和 dva

先谈下 rematch 和 dva 的相同点：

1. 通过 Model 来组织 State
2. 简化 redux 的配置和使用
3. 都提供了 immer 和 loading 插件

它们的不同点如下：

1. dva 定位更偏向于基于 redux 的应用框架解决方案，它集成了 react-router、同构（服务端和浏览器端）请求方式，实现了懒加载 Model 和页面。而 rematch 更倾向于解决使用 redux 进行数据管理时遇到的问题，支持 TS、提供更易用的 API 和多种插件，提升开发体验。
2. dva 的副作用使用 `redux-saga` 实现，并且副作用是一个生成器函数，学习成本偏高。而 rematch 的副作用实现机制更简单，更符合直觉。
3. dva 支持 model 的动态新增和删除。但是 rematch 只实现了新增 model，不支持删除 model，而且动态新增 model 也不会自动修改 Store 的类型定义。可以认为 rematch 并不推荐动态增删 model，因为动态修改后 Store 的类型就和运行时类型不一致了。

# 插件系统

rematch 的插件系统都是通过回调函数实现，rematch 封装了 `forEachPlugin` 方法来调用插件的回调函数。

```ts
function forEachPlugin(method, fn): void {
  config.plugins.forEach(plugin => {
    if (plugin[method]) {
      fn(plugin[method]!)
    }
  })
}
```

当看到 `forEachPlugin` 这种实现时，就有个疑惑。这种方式如何使用插件函数的返回值呢？

答案是通过修改闭包外部变量的方式，就可以将插件函数的返回值利用上了。

```ts
let rootReducer = {}

// 这种方式也可以利用插件的返回值
// 例如通过插件的 onRootReducer 钩子修改 rootReducer
bag.forEachPlugin("onRootReducer", onRootReducer => {
  rootReducer = onRootReducer(rootReducer, bag) || rootReducer
})
```

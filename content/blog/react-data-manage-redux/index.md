<!--
  摘要：通过本文将了解：Redux 产生的背景、Redux 简化了哪些问题、Redux 如何解决依赖更新、Redux 的插件原理。
-->

# React 数据管理之 Redux

# TL;DR

通过本文将了解：

1. Redux 产生的背景
2. Redux 简化了哪些问题
3. Redux 如何解决 Flux 中 `.waitFor(id[])` 功能
4. Redux 插件扩展中 middleware 和 enhancer 的实现
5. Redux 插件思想

# 背景

在 2014 年，Facebook 的前端基础架构团队[开源了 Flux 和 React](https://www.youtube.com/watch?v=nYkdrAPrdcw&feature=emb_logo)。在 Facebook 开源 Flux 后，React 数据管理生态涌现了一大波与 Flux 相关的数据管理库，Redux 就是其中之一。2015 年 Dan 在 [react-europe 2015 演讲中](https://www.youtube.com/watch?v=xsSnOQynTHs)提出了 Redux 状态管理库，用于解决 Flux 存在的问题。

> 想要深入了解 Flux 解决的问题，可以参考我的另一篇文章 [React 数据管理之 Flux]()。
>
> 在 [Dan 的演讲](<(https://www.youtube.com/watch?v=xsSnOQynTHs)>)中，是从 11 分钟开始谈 Redux 的， 前 11 分钟讲的是 React 的 Hot Reloading 机制。

# Redux 解决的问题

选择 Flux 作为状态管理库时，代码如下：

![flux-code.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5916aa95d92b484b900ac54355224916~tplv-k3u1fbpfcp-watermark.image)

随后 Dan 对以上的代码做了一系列调整和删减，整个过程类似于代码重构，为了让代码更加简洁。

1. 将 Store 通过 `export` 暴露出去，让 Store 管理者来协调哪些 Store 应该被使用。而不是在 Store 文件中通过 `AppDispatcher.register` 进行注册。（本质是将 Store 的声明和使用分开。）
2. 将 `_todos.push(text)` 改为 `_todos = [..._todos, text]`。不直接修改对象，而是使用 ES7 的 Spread 语法创建新的对象。原因是：可以通过引用是否相同判断数据是否发生了改变，如此在判断数据是否改变时更高效，写法也不复杂。
3. 将 `getAll()` 作为单独函数 `export` 出去，甚至于最后在 Store 文件中将该函数删除掉。原因是：`getAll()` 作为数据访问器，它应该在 Store 的上层中。因为有时候数据访问器需要组合多个 Store 中的数据，所以它们应该维护在另一个层级中，而不是和数据在同一个层级。
4. 删除 `EventEmitter.prototype`。Flux 使用 `EventEmitter` 的目的是通过调用 `TodoStore.emitChange()` 通知订阅者 Store 发生了改变。因为第二点通过比较 Store 中数据的引用就可以判断 Store 是否改变了，所以就不再需要 `emitChange()` 了。
5. 将 `_todo` 模块变量删掉，数据由管理者通过参数传进来。因为第一步需要 Store 管理者来协调所有的 Store，所以 Store 中的数据也应该由管理者传进来，然后 Store 负责计算出新的数据后，再把新数据告诉管理者。

修改后的代码就是 Redux 的 Reducer，Reducer 符合 Flux 的思想：Store 根据 Action 进行修改。

![修改后的代码](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2e0b0c4715d4402e943198ddb264bb1c~tplv-k3u1fbpfcp-watermark.image)

所以 Redux 是在 Flux 的基础上，简化了 Flux 中 Store 的代码。我觉得最明显的简化点就是无需使用 `emitChange()` 通知订阅者了。

![dan-write-a-flux-library.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d108dc9f4c604cd9b79d69279de90d5c~tplv-k3u1fbpfcp-watermark.image)

# Redux 与单向数据流

Flux 中最重要的概念就是**单向数据流**，那么 Redux 是如何体现它的？

在[源码](https://github.com/reduxjs/redux/blob/master/src/createStore.ts#L253-L262)中，只要在 dispatch Action 触发的 Reducer 函数执行期间，就不能再次执行 dispatch 派发新的 Action 了。

# Redux 如何解决依赖更新问题

## 依赖更新问题是什么

假设我们有两个 Store，它们分别是商品列表 Store（`ProductListStore`) 和总价 Store（`TotalPriceStore`)。当用户添加一个商品（将 Action 定义为 `AddProductAction`）时，会先更新 `ProductListStore`，然后 `TotalPriceStore` 根据 `ProductListStore` 中的所有商品计算出最后的价格。

在以上场景中 `ProductListStore` 和 `TotalPriceStore` 都要处理 `AddProductAction`，但 `TotalPriceStore` 需要等 `ProductListStore` 处理完后再进行处理。这就是依赖更新问题。Flux 通过 `.waitFor(id[])` 接口解决多 Store 相对于同一个 Action 的依赖更新问题。

## 派生数据

在上一个场景中，因为总价可以根据商品列表计算得出，所以可以把总价设计成派生数据（Derived State）。那是不是所有的依赖更新都可以转换成派生数据呢？

答案是否定的。

举个例子，如果一个国家只有一个城市，那么选择国家后，城市就可以被自动计算出来。但在一个国家有多个城市后，城市是可以被用户选择的，那么城市就不能由国家派生出来，如果城市的值是由国家的值派生出来的，城市的值就永远不会改变。尽管城市不是国家的派生数据，但他们却存在着依赖更新问题。当用户选择国家时，选中的城市也需要相应改变，代码如下（出自 [Flux/Doc/Dispatcher](https://facebook.github.io/flux/docs/dispatcher)）：

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

## 依赖更新和派生数据的区别

派生数据是指其值可由其他值计算得出，但如果这个派生值本身可以被独立修改，那么它就不能被计算得出了。所以如果某个值可以被独立修改，那么它就不能被设计成派生数据。**这也是哪些数据可以作为派生数据的一个原则。**

依赖更新的本质是：`StoreA` 和 `StoreB` 都需要处理某个 Action，且 `StoreB` 依赖 `StoreA` 处理后的最新值。那我们是否可以把 `StoreA` 的处理行为封装成函数，并在 `StoreB` 中重新运行一次，以此来绕过依赖更新呢？

答案是不能。因为在 `StoreB` 中重新运行 `StoreA` 的处理函数时，如果 `StoreA` 已经更新了，那么再执行一次就错了。

另一个可行的办法是：我们可以在 dispatch Action 之前就把 `StoreB` 依赖的数据计算出来（此时 `StoreA` 一定是旧值），然后把计算结果放到 `payload` 中传给 `StoreB`。在上面的例子中，把 `CountryStore.country` 改成 `payload.country` 就避免了依赖更新。但缺点也很明显：存在性能浪费、要求函数无副作用、有一定修改成本（修改散布在各个地方）。

## Redux 如何解决依赖更新问题

Redux 解决依赖更新的方式有：

1. **推荐**。如果可以将状态设计成派生数据，那么就不存在依赖更新了。
2. **推荐**。在 `redux-thunk` 中 dispatch 两个 Action，一个用于更新 `StoreA`，另一个 Action 带上 `StoreA` 的最新值去修改 `StoreB`。这种方式的缺点是：需要 dispatch 两个 Action，无法在一个 Action 中更新 `StoreA` 和 `StoreB`。
3. 在 dispatch Action 之前，先跑一遍 StoreA 的 reducer 计算出新值，然后把新值放到 `payload` 上，最后在 `StoreB` 的 reducer 中就可以使用新值了。
4. `StoreB` 的 reducer 接受第三个参数，并在 rootReducer 中传给它。参考 [Beyond combineReducers]()，但这篇文章聚焦的问题共享数据，而不是依赖更新。共享数据要求数据时旧的，依赖更新要求数据是新的。

# Redux 中 middleware 和 enhancer 实现

Redux 存在 enhancer 和 middleware 两种扩展机制。因为 middleware 最后的返回值是 enhancer，所以我们先从 enhancer 说起。

## enhancer

enhancer 是 `createStore` 的最后一个参数，将其代码简化后如下：

```js
function createStore(reducer, preloadedState, enhancer) {
  if (enhancer) {
    // 把当前的 createStore 传进去
    return enhancer(createStore)(reducer, preloadedState)
  }

  // 原始处理逻辑
}
```

enhancer 的本质也是 reduce 函数，它接受 `createStore` 作为参数，返回值也是个 `createStore`。

## middleware

middleware 的返回值是一个 enhancer，该 enhancer 只修改了 `store.dispatch`。从[源码](https://github.com/reduxjs/redux/blob/3a2ce328640799f8e9d9a2f2ab4e63938df7d49c/src/applyMiddleware.ts#L80-L81)中可以看到 middleware 先接受 `middlewareAPI`，其返回值被 compose 处理后用作增强 dispatch 方法。

增强 dispatch 的方式本质也是一个 reduce 函数，它接受 dispatch 方法作为参数，返回值也是个 dispatch 方法。

在 middleware 的源码中[传递新的 dispatch](https://github.com/reduxjs/redux/blob/3a2ce328640799f8e9d9a2f2ab4e63938df7d49c/src/applyMiddleware.ts#L69-L79) 挺有意思的。它的存在使得使用方无需把最后生成的 store 传给三方插件，这是个它的优点，但缺点是这里的 dispatch 并不等于最终 store 的 dispatch。还好这个缺点相较于优点来说，它并不重要。参考[线上 Demo](https://codesandbox.io/s/redux-middleware-dispatch-75xdk?file=/src/index.ts)，最终效果是你会看到三个不相等的、难以理解的 dispatch。

![redux-multiple-dispatch.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/03f9ae6fa5c64e94b13658472bac6f8d~tplv-k3u1fbpfcp-watermark.image)

# Redux 插件思想：reduce 与 compose

从 enhancer 和 middleware 的实现可以看出，Redux 的插件思想就是通过 reduce 方法增强 API。增强 dispatch 的 reduce 方法是传入 dispatch 并返回一个新的 dispatch 函数。增强 createStore 的 reduce 方法是传入 createStore 并返回一个新的 createStore。

compose 方法将多个增强方法合成一个，Redux 的 compose 是从右往左执行的，可参考 [compose 源码](https://github.com/reduxjs/redux/blob/3a2ce328640799f8e9d9a2f2ab4e63938df7d49c/src/compose.ts#L56-L60)。

# 总结

Redux 是 Dan 在 Facebook 开源 Flux 后一年实现的状态管理库，它承接了 Flux 的思想，并简化了 Store 的创建和判断数据发生更新的方式。

但 Redux 和 Flux 相比，它缺少了 Flux 的 `waitFor` API，本文详细解释了什么是依赖更新和派生数据的区别，以及在 Redux 中如何解决依赖更新。

最后本文分析了 Redux 中 middleware 和 enhancer 的实现原理，并得出 Redux 的插件思想就是使用 reduce 方法扩展 API。

[react 数据管理之 flux]: https://juejin.cn/post/6964197768877326366
[beyond combinereducers]: https://github.com/markerikson/redux/blob/structuring-reducers-page/docs/recipes/reducers/05-BeyondCombineReducers.md

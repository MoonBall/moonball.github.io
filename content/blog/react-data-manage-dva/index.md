packages/dva 中功能点包括：

1. 默认提供 `connected-react-router` 的功能，在 redux 的 Store 中有 router 信息，并且可以通过 dispatch Action 的方式修改 router。
2. app.router() 的目的是把 Redux Store 的 Provider 封装起来，使用者无需再手动使用 Provider 了。[源码](https://github.com/dvajs/dva/blob/3eaee309ede9cf1e255326150ee2210bd04c1abf/packages/dva/src/index.js#L94-L99)
3. 如果 app.start() 不提供参数，那么就返回封装好的组件，以便服务端使用。
4. hmr 时重新执行 render 方法，使得页面更新。

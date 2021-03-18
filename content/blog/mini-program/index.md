# 小程序

从页面生命周期得出，逻辑层执行了 onLoad/onShow 之后，才会将 Data 传给渲染层。逻辑层在执行 onLoad 之前又会先执行组件的 created/attached，那也就是说逻辑层维护了虚拟 DOM 树结构，它才知道需要执行挂载哪些组件。而逻辑层只将 Data 传给了渲染层，那么渲染层也维护了虚拟 DOM。

[页面生命周期](https://developers.weixin.qq.com/miniprogram/dev/framework/app-service/page-life-cycle.html)

[组件生命周期](https://developers.weixin.qq.com/miniprogram/dev/framework/custom-component/lifetimes.html)

- created 钩子方法中，官方要求不能调用 setData，就算直接修改 this.data，渲染层也不会用修改后的 data 进行渲染。
- attached。整个生命周期中，只会触发一次。官方解释是说“在组件完全初始化完毕、进入页面节点树后，attached 生命周期被触发。”，这里所说的页面节点树是指逻辑层的虚拟 DOM 树。attached 中执行的同步代码会阻塞首屏渲染，也就是说首屏是在 attached 中以更新后的 Data 为准。先 attach 再 ready。**可以理解为 attached 中执行 setData 会被合并到当前创建组件时的更新流程，一起更新渲染到页面** 这一点需要通过一个组件中的 attached 方法来测试。
- ready 钩子执行时，页面已经将初始状态对应的页面展示出来了，不会阻塞首屏渲染。**ready 也只会执行一次，但是 ready 不会阻塞首次渲染。** 需要通过一个组件进行测试。

setData 还有这样的写法

```js
this.setData({
    list[index] = newList[index]
})
```

数组中删除某项

```js
// 1.id 动态获取   使用字符串模板   渲染的数组 arr

this.setData({
  [`arr[${id}]`]: null,
})

// 2.wxml 进行判断不为null渲染 页面
```

setData 第二个参数是界面更新渲染完毕后的回调函数。目前测试，回调函数都是异步执行的，setData 后面的同步代码比回调函数先执行。

[还支持双向绑定](https://developers.weixin.qq.com/miniprogram/dev/framework/view/two-way-bindings.html)

[生命周期](https://developers.weixin.qq.com/community/develop/article/doc/000002e9b647c833cab9ef81f51c13)
Behavior 中的生命周期比组件中的生命周期先执行，可能 unload 和 detached 是个例外。

page 的 onShow 在 onReady 之前执行。
onLoad 执行后会立即执行 onShow，但 onLoad 在页面生命周期中只会执行一次，而 onShow 可能会执行多次，比如从后台唤起时。

从[这篇文章来看](https://cloud.tencent.com/developer/article/1667349)，组件要执行了 attached 后才会触发页面的 onLoad 方法。

# 云开发 - 云函数

1. init() 要传 env，否则默认 cloud 接口访问的是线上环境。
2. 无论是触发器还是普通函数，都可以进行本地调试。
3. 本地调试不会产生日志，日志是部署到环境中才会收集的。
4. 暂时不要用 cloudbase 目录进行云函数开发，难用，有 bug。使用 cloudfunctions 目录

# 云开发 - 存储

1. 在小程序代码中一次 get 操作最多获取 20 条数据，在云函数中一次 get 操作最多获取 100 条限制。

2.

# Performance

[uni-app](https://uniapp.dcloud.io/performance)

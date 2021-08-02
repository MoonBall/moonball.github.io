<!--
  摘要：
-->

# Webpack 中 tapable 是什么？

# tapable 设计思想

tapable 是为了使系统更容易扩展而抽象的库。它要求将程序设计为一套流程，然后开发者可以在任意的流程节点中进行扩展，达到开发者想要扩展的目的。

## 举个例子

假设当前程序的功能为：从列表中查找一项数据，然后重置它的属性，代码如下。

```js
function example(opts) {
  // 查找
  const found = opts.list.find(it => it.name === opts.name)
  // 重置属性
  if (found) {
    found.extra = {}
  }
}
```

假如开发者发现仅通过 `name` 查找不合理，希望改成通过 `id` 进行查找，而且还需要在重置 `extra` 属性时打印日志。那么上面的代码是不能支持扩展的，开发者只能复制一份代码自己改一改。

我们将上面的例子用 tapable 进行改写，代码如下，可参考[线上 Demo](https://codesandbox.io/s/tapable-example-t7gl2)。

```js
function exampleWithTapable(opts, hooksHandler) {
  const hooks = {
    find: new SyncBailHook(["opts"], "findHook"),
    reset: new SyncHook(["item"], "resetHook"),
  }

  // 设置默认的 hook plugin
  hooks.find.tap("findByName", opts => {
    return opts.list.find(it => it.name === opts.name)
  })
  hooks.reset.tap("reset", item => {
    item.extra = {}
  })

  // 开发者可以对 Hooks 进行扩展
  if (typeof hooksHandler === "function") {
    hooksHandler(hooks)
  }

  // 执行流程
  const foundItem = hooks.find.call(opts)
  hooks.reset.call(foundItem)
}
```

如果不需要自定义行为，则直接调用该函数，其行为和 `example` 函数相同。

```js
const opts = {
  list: [
    { name: "a", id: "1", extra: { info: "1111" } },
    { name: "a", id: "2", extra: { info: "2222" } },
  ],
  name: "a",
}
exampleWithTapable(opts)
console.log("opts.list[0].extra: ", opts.list[0].extra)
```

当开发者需要对原函数进行扩展，希望实现通过 id 进行查找，并在重置属性时打印日志。代码如下：

```js
const opts2 = {
  list: [
    { name: "a", id: "1", extra: { info: "1111" } },
    { name: "a", id: "2", extra: { info: "2222" } },
  ],
  id: "2",
}
exampleWithTapable(opts2, hooks => {
  hooks.find.tap(
    {
      name: "findById",
      stage: -10,
    },
    opts => {
      return opts.list.find(it => it.id === opts.id)
    }
  )

  hooks.reset.tap("consoleResetInfo", item => {
    console.log("reset item: ", item)
  })
})
```

从上面的例子中，原函数将以前的程序定义为两个流程，分别为 find 和 reset。开发者可以在任意流程中进行扩展，实现自定义功能，但函数的主流程并没有改变。

## 真实案例

在 [enhanced-resolve](https://github.com/webpack/enhanced-resolve) 这个项目中，该项目是 webpack 用于定位一个模块的真实路径的解析器。该解析算法的流程如下图所示（可[参考源码地址](https://github.com/webpack/enhanced-resolve/blob/60d79f3c93304ce5ecbbe0127aa583d4a73bf1a1/lib/ResolverFactory.js#L281)）。

![](./imgs/enhanced-resolve-pipeline.png)

这个流程非常清晰，流程的每一步都提取为 Hook，并在后面的代码中为各步骤设置默认的 Plugin。比如，`parsed-resolve` 步骤的默认处理逻辑就是 `DescriptionFilePlugin` 插件，并且指明了该步骤的下一步是 `described-resolve` 步骤。

![](./imgs/enhanced-resolve-hook-plugin.png)

由于 enhanced-resolve 是基于 tapable 设计的可扩展库，所以开发者才能通过 webpack 的配置项 [`webpackConfig.resolve.plugins`](https://webpack.js.org/configuration/resolve/#resolveplugins) 对各个阶段进行扩展。

# tapable 使用手册

## 相关术语：Hook 和 Plugin

Hook 是指流程中的每一步，比如例子中定义的 `hooks.find` 和 `hooks.reset`。

Plugin 是指一个 Hook 对应的一个处理函数，例子中通过 `tap()` 方法调用时的参数就是插件。

## Hook 的分类与初始化

Hook 分类参考[官方文档](https://github.com/webpack/tapable#hook-types)。

按照 Hook 中插件的基本执行顺序的定义，可以分为三种：

1. Sync。所有插件同步执行。
2. AsyncSeries。所有插件异步串行执行。
3. AsyncParallel。所有插件异步并行执行。

按照 Hook 中插件的返回值对插件执行顺序的影响，可以分为以下四种：

1. Basic。正常执行，插件的返回值不会影响执行顺序。
2. Waterfall。将上一个 Plugin 的返回值传给下一个 Plugin。Hook 初始化时第一个参数是上一次 Plugin 的结果，参考[源码](https://github.com/webpack/tapable/blob/acd0a66d3769120b1e9e5b66823475043237f30b/lib/__tests__/SyncWaterfallHook.js#L17-L31)。
3. Bailout。如果某个 Plugin 的返回值不是 undefined，就结束，参考[源码](https://github.com/webpack/tapable/blob/master/lib/SyncBailHook.js#L15)。
4. Loop。如果某一个插件的返回值不是 undefined，那么该 Hook 会继续从第一个插件开始执行。

tapable 支持的所有 Hook 如下：

```js
const {
  SyncHook,
  SyncBailHook,
  SyncWaterfallHook,
  SyncLoopHook,
  AsyncParallelHook,
  AsyncParallelBailHook,
  AsyncSeriesHook,
  AsyncSeriesBailHook,
  AsyncSeriesWaterfallHook,
} = require("tapable")
```

所有 Hook 的初始化，有两个参数。第一个参数是定义该 Hook 的参数列表，第二个参数是该 Hook 的名称（即 `name` 字段）。

```js
const hook = new SyncHook(["arg1", "arg2", "arg3"], "hookName")
```

## Hook 与 tap/tapAsync/tapPromise

## Hook 与 call/callAsync/callPromise

## 拦截器 interceptors

## Context

# 其他插件系统设计方式

## 回调方式

## EventEmitter 方式

# 总结

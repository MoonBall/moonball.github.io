<!--
  摘要：
-->

# Webpack 中 tapable 是什么？

# tapable 设计思想

tapable 是为了使系统更容易扩展而抽象的库。它要求将程序设计为一套流程，然后开发者可以在任意流程节点中进行扩展，达到开发者想要扩展的目的。

## 举个例子

假设当前程序的功能为：从列表中查找一项数据，然后重置它的属性，代码如下。

```js
function Example() {
  e
}
```

## 真实案例

在 [enhanced-resolve](https://github.com/webpack/enhanced-resolve) 这个项目中，该项目是 webpack 用于定位一个模块的真实路径的解析算法。该解析算法的流程如下图所示（可[参考源码地址](https://github.com/webpack/enhanced-resolve/blob/60d79f3c93304ce5ecbbe0127aa583d4a73bf1a1/lib/ResolverFactory.js#L281)）。

![](./imgs/enhanced-resolve-pipeline.png)

这个流程非常清晰，就是把每一步都提取为 Hook，并在后面的代码中为各步骤设置默认的 Plugin。比如，`parsed-resolve` 步骤的默认处理逻辑就是 `DescriptionFilePlugin` 插件，并且指明了该步骤的下一步是 `described-resolve` 步骤。






# tapable 如何使用

# 其他插件系统设计方式

## 回调方式

## EventEmitter 方式

# 总结



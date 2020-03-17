---
title: WEB 列表页筛选模块设计
date: 2020-03-15 22:34:00
description: "列表页筛选项的数据应根据 url 生成，修改筛选项时应直接修改 url，以简化数据流程。"
---

将存放在 url 中的参数，直接以 url 作为数据源，而不是重新维护一份新的数据源。如果新创建一份数据源，存在以下的缺点：
- 修改方式有两种。一是修改 url，二是修改 state。
- 需要维护两个同步逻辑，保证 url 和 state 之间的数据同步。

所以在列表页中，筛选项状态应该和 url 保持一致。

## 期望效果
1. 当 url 不合法时，不自动进行重定向。在单页应用可以进行 replaceState。
2. 筛选项、url、后端请求参数保持一致。所以不能实现筛选项默认值，只能根据不同的入口设置不同的 url。
3. 更快发起后端请求，避免串行阻塞。

下面讨论下主要的业务场景。


### 简单场景
假设页面 url 为：`/list?tags[0]=1&q=ab`，页面加载刷新后，需根据 url 生成 queryData。将 queryData 用于筛选组件和后台接口调用。由 url 生成 queryData 的过程需要进行数据转换，比如将 `tags[0]=1` 转换为 Number 型数组。


### 处理不合法的参数
假设用户在 url 中输入了错误的筛选值，这种场景如何处理呢？第一种方案是由组件和后端去兼容非法的筛选值，这是最简单高效方法，也是推荐的做法。第二种方案是前端将非法值都过滤掉，避免传给后端。第一种解决方案思路比较清晰，这里主要讨论方案二。

假设一个 Select 筛选项的 options 只有可选值 `[1, 2]`，而 url 传入值为 3。如果 options 是静态的，可以再 url -> queryData 中就处理掉；否则只有等组件渲染完成确定 options 值后才能进行 url -> queryData 的转换，并且每次 options 改变都要重新处理。

抽象上述思路可得到一种设计方案。因为 queryData 的值和筛选组件内部状态有关，所以 url 和 queryData 内容就不能一一对应，而是 `url + component state = queryData`。对于一个筛选组件而言，它应该知道如何判定一个筛选值是否合法。考虑给组件传入 `onChangeFilterData`，该方法区和 `onChange` 的区别是 `onChange` 会修改 url，而 `onChangeFilterData` 不修改 url（单页可以 `history.replaceState`），只修改 queryData。


### 存在动态筛选项
有些筛选项是动态生成的。这种业务场景下，主要考虑 url -> queryData 的过程是否依赖于确定筛选项。如果将 parseUrl 实现在每一个筛选组件中，就需要先获取所有动态筛选项，再进行数据转换，数据转换完后才能进行数据请求；否则 url -> queryData 这步没有任何依赖，可以立即发出后端请求，只需在筛选项渲染之前获取动态筛选项。


### 筛选项存在局部状态
常见的输入框会存在局部状态，会在用户按下 Enter 键或点击搜索后再开始执行搜索。在这种场景下，这些组件需要维护一个局部 state。当组件更新时，修改的是组件内部的 state。将 props.value 作为组件的 key，当 url 改变时，组件的状态将会被重置。

## 总结

推荐前后端都兼容 url 中不合法的 qs。前端进行 url -> queryData 转换时，不要依赖 component state，转换操作最好只处理数据类型和数据格式。这样可以更快的发出查询接口，且数据流程非常简单。
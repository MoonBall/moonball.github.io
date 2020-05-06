---
title: how i18n
date: 2020-04-19 23:06:00
description: ""
---

https://www.npmtrends.com/react-i18next-vs-react-intl-vs-react-intl-universal-vs-i18n-react-vs-i18n-vs-i18n-loader

i18n-loader 都是8年前的内容了。太牛了


1. 每个文本 key 需要在每个语言中都存在。
2. 不能有重复 key
# 单文件设计
1. 多个语言文件的 key 保证顺序一致，git commit 时自动排序，既方便查阅，也较少了多人协同开发时产生的冲突。

# 与 css 非常相似。参考 css-module 设计一个按模块 import 的 i18n 系统



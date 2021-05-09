# Recoil 背景

# 当有任意个状态要共享时，Context 方式不能实现。

举例子时说：

1. 任意多个 Provider 时，插入一个 Provider 会导致下面的组件都卸载、再重新挂载。

# 与 MBox 对比，支持 Concurrent Mode

why existing state management libraries aren't compatible concurrent mode it's because
they have this external pile of State
that's not updates to it or not
scheduled by react
whereas recoil is actually just using
react local state under the hood.

is recoils main concept similar to react's
context api or based off of it?

it yes I
would say that the basic thing in recoil
is sort of a multi context where
has one value and then consumers can
consume that value per provider recoil
is sort of like a provider that can
provide any number of values that can
each have their own consumers and then
everything else is just built on that so
the selectors are built on that and so
forth that's the fundamental thing that
adds to react

---

# 官网 - Motivation

## 问题 1

多组件共用的状态需要被提升到公共祖先中，但这样会导致大子树重新 Render。

## 问题 2

Context 只能存储单个值，如果需要存储多个值，并且每个值都有各自的消费者，那么 Context 不能完成该任务。而不能是任意多个值，并且每个值只绑定特定的消费者。

## 问题 3

很难代码分离。

## 问题 4

其他外部全局状态管理，很难与并发模式做到兼容。

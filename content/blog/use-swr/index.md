# 为什么使用 useSWR

1. 实现加载中、错误态等状态。业务代码往往需要在每个接口调用处维护这两个状态。
2. 请求时序问题。组件内部与搜索相关的 state 或者 props 都可能改变。

## 特点

1. 数据依赖，如果 key 函数报错，返回值将为

有个 bug。initVal 传了后，mutate 有时候的值是 undefined，很奇怪。

```js
setTimeout(() => {
  delete CONCURRENT_PROMISES[key]
  delete CONCURRENT_PROMISES_TS[key]
}, config.dedupingInterval)
```

这里可能有问题，可能把不是自己这次的请求给删掉了。

# 开启 SWR 之旅，简化数据的查询与管理

在介绍 SWR 之前，我们实现一个最简单的带有数据请求的 React 组件。

```js
function CompWithFetch() {
  const [data, setData] = useState()
  useEffect(() => {
    ;(async () => {
      try {
        const data = await fetchData()
        setData(data)
      } catch (err) {
        Message.error("服务端错误")
        // Hint: 优秀的代码，一定要 rethrow error，不要将错误吃掉
        throw err
      }
    })()
  }, [])

  return <div>{data}</div>
}
```

如果经常写这样的代码，那么肯定会想到自己封装一个 React Hook，该 Hook 以请求函数作为参数。

```js
function useFetch(fetcher) {
  const [data, setData] = useState()
  const fetch = useCallback(async () => {
    try {
      const data = await fetcher()
      setData(data)
    } catch (err) {
      Message.error("服务端错误")
      // Hint: 优秀的代码，一定要 rethrow error，不要将错误吃掉
      throw err
    }
  }, [fetcher])

  // fetcher 改变就再次获取数据
  useEffect(() => {
    fetch()
  }, [fetch])

  return {
    data,
    // 暴露 fetch 给使用方，以便重新拉取数据
    fetch,
  }
}
```

这样就完成了一个非常迷你的 useSWR 了。调用方需通过 useCallback 生成稳定的 fetcher 引用值，这点是为了在请求带有参数时，参数改变后 useFetch 将重新发起请求。暴露给调用方的 fetch 函数，可以应对主动刷新的场景，比如页面上的刷新按钮。

尽管 `useFetch` 可以在一部分场景中复用，但是与 useSWR 相比，它的抽象程度还不够。比如：要求调用方使用 useCallback 来生成 fetcher 就是模板代码，接下来我们一起看看 useSWR 内部抽象了多少通用功能，为什么我选择使用它？

# 为什么使用 useSWR

## 1、实现了错误状态和加载状态

useSWR 的返回值不仅有请求结果 data， 还有错误状态 error 和加载状态 isValidating。如果你曾经为每个请求都写过一次 `try catch` 和`setState(true)`，那么你一定能深深地体会到 useSWR 带来的简洁。

除了简洁之外，useSWR 还对 data/error/isValidating 做了优化，避免引起不必要的渲染。比如业务场景只关心请求的结果，当请求结果中数据不存在时，就在页面上展示占位符 -。由于该场景并不关心加载状态和错误状态，那么 useSWR 就只会在 data 发生改变时才触发组件重新渲染。该优化通过 `Object.defineProperties` 实现，可参考[源码](https://github.com/vercel/swr/blob/master/src/use-swr.ts#L753)。

## 2. 解决了请求时序问题

请求的时序问题是指，用户操作

搜索场景中的请求都需要解决时序问题。

## 3. 天然的全局状态方便多组件复用

## 4. 轻松实现数据预加载

## 5. 其他

# 声明式的数据请求方式

介绍与命令式的区别，以及如何命令式触发数据请求。

## 与命令方式的区别

## 如何命令式地触发数据请求

## 条件请求

## 如何修改数据

# 最佳实践

## Error 处理

掉调用 `useSWR(key, fetcher)` 时，如果 fetcher

将 Hook 设置在模块中

# 所有配置的解析

# 存在缺点

## 全局 key 命名问题

基本上都是随意命名的。因为往往在模块级别的 key 会有其他参数，所以还好。

## 只能在 React 组件中拿到最新的请求结果

全局状态

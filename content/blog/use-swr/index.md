# 聊聊 useSWR，为开发提效 | 包括 useSWR 设计思想、优缺点和最佳实践

> **前言**
>
> [useSWR](https://github.com/vercel/swr) 是 Vercel 团队维护的 React 数据请求管理库，Vercel 同时也是 Next.js 的创始团队。有如此优秀的团队做支持，相信 useSWR 的思想和源码一定会给我们带来启发。

在介绍 useSWR 之前，我们先看一个最简单的带有数据请求的 React 组件。

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
        // Hint: 优秀的代码，一定要 rethrow error，
        // 不要将错误吃掉
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
      // Hint: 优秀的代码，一定要 rethrow error，
      // 不要将错误吃掉
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

我们再看看调用方代码，加深对 `useFetch` 的理解。

```js
function CompWithUseFetch() {
  const [search, setSearch] = useState("")
  const fetcher = useCallback(() => {
    // 拼接 search 参数发起请求
  }, [search])

  const { data } = useFetch(fetcher)

  return (
    <div>
      <div>
        <input onChange={e => setSearch(e.target.value)} />
      </div>
      {data || "-"}
    </div>
  )
}
```

如 `useFetch` 所示，我们就完成了一个非常迷你的 useSWR 了。调用方需通过 useCallback 生成稳定的 fetcher 函数引用值，这点是为了在请求带有参数时，如果参数改变了就重新发起请求。暴露给调用方的 fetch 函数，可以应对主动刷新的场景，比如页面上的刷新按钮。

通过 `useFetch` 我们已经了解了 useSWR 的主要功能。接着我们进入正题吧，本文分为两个部分，第一部分介绍 useSWR 中的两大思想「全局服务端数据管理」和「声明式数据请求」，第二部分是使用 useSWR 后的总结，包括优缺点和最佳实践。

# 全局服务端数据管理

useSWR 的 API 形式为 `useSWR(key, fetcher, config)`，它将 key 作为请求的 ID。如果多个组件需要共用一个请求，那它们就使用相同的 key 来调用 useSWR。useSWR 内部通过一个[全局 Map](https://github.com/vercel/swr/blob/fa676db47512b07b539e8b933932d714a2e5d3b3/src/config.ts#L7) 来实现 key 和请求的关系，多次调用 useSWR 时，相同的 key 在 useSWR 中只存在一个请求结果。因此，再结合发布者订阅者模式，如果组件对某 key 对应的请求响应进行了修改，那么使用该 key 的其他组件都会收到最新的数据。这种天然的全局服务端数据管理方式，不仅保证了页面数据的一致性，而且可以非常简单地实现数据共享，这点将在[“天然的全局状态方便多组件复用”](#heading-8)中被详细介绍。

# 声明式数据请求

我们知道 React 是声明式 UI 库，开发者通过编写组件返回的 JSX 告诉 React 页面应该是什么样子的，然后 React 就会将页面更新为开发者想要的模样。因此开发者就只需关心如何写好 JSX 来描述页面，剩下的就交给 React 去优化吧。

useSWR 也是如此，它的 API 形式为 `useSWR(key, fetcher, config)`。如果我们只看前两个参数，我们通过 key 告诉 useSWR 我们需要什么请求，只要 key 改变了，我们便希望得到的是与 key 相对应的请求结果。这就是声明式数据请求，我们无需关心如何发起请求，[请求的时序问题](#heading-7)，只需要告诉 useSWR 我们需要的请求即可。我们前面实现的 useFetch 也是声明式数据请求，useSWR 的 key 就可以理解为生成 fetcher 时 useCallback 的依赖。

useSWR 的参数 key 不仅可以是字符串，还可以是数组或函数。如果 key 是函数，则会将该函数的执行结果作为 key。如果 key 是数组，则会一次浅比较数组每项，如果有某项发生改变，则表示需要重新发起请求。

> **扩展知识**
>
> useSWR 中 key 为数组时，数组中可以传对象，那 SWR 如何保证引用相等的对象所对应的 key 也相等呢？
> 参考[源码](https://github.com/vercel/swr/blob/fa676db47512b07b539e8b933932d714a2e5d3b3/src/libs/hash.ts#L33)，useSWR 使用 WeakMap 将对象映射为整数。如果对象引用相等，则映射后的整数就一样，从而保证了 key 相等。

## 条件请求

通过 `key` 值，可以告诉 useSWR 我们需要的请求，那如何告诉 useSWR 不需要请求的场景呢？一般来说，程序中不需要什么，不调用就完了，但是 React Hook 不一样，它不能放在条件语句中，所以需要 useSWR 内置支持。

useSWR 通过 key 值是否为 null，来标识调用方是否需要请求。或者当 key 是一个函数时，函数执行时报错或返回 null 也可以。当不需要请求时，useSWR 的返回值始终是 `{ data: undefined, error: undefined, isValidating: false }`。

## 如何命令式地触发数据请求

如果页面上有一个刷新按钮，用户直接点击刷新按钮，期望重新获取服务端数据，通过 useSWR 如何实现该功能呢？

第一种方式是通过给 key 加一个计数器，每次点刷新按钮就让计数器加一，useSWR 便会获取新的数据。

```js
function Comp() {
  const [cnt, setCnt] = useState(0)
  const { data } = useSWR(["/api/data", cnt], fetcher)

  return (
    <div>
      <button onClick={() => setCnt(v => v + 1)}>刷新</button>
      <div>data: {data || "-"}</div>
    </div>
  )
}
```

但这种方式有个缺点，它违背了 key 和请求之间的对应关系。如果后续还有组件要使用 /api/data 接口，这些新组件使用的 key 是 `'/api/data'`，就导致相同的请求对应着不同的 key。对 useSWR 而言，会认为它们是两个请求，便破坏了该请求的全局共享，导致页面数据不一致的结果。

第二种方式是通过命令式的方式发起请求。因为点刷新按钮时界面上所有的筛选参数都没有改变，所以传给 useSWR 的 key 就不会改变，那么声明式的数据请求方式就不会发起新的请求。useSWR 就考虑到这种场景，它返回的 `revalidate()` 方法，就是通过命令式方式重新发起请求。

```js
function Comp() {
  const { data, revalidate } = useSWR(["/api/data"], fetcher)

  return (
    <div>
      <button onClick={() => revalidate()}>刷新</button>
      <div>data: {data || "-"}</div>
    </div>
  )
}
```

## 如何修改数据

声明式的数据请求方式，只是告诉 useSWR 需要的请求，那我们有办法直接修改请求吗？

想想 React 是怎么做的呢？React 通过命令式的 setState() 来更新界面。所以 useSWR 也暴露了一个命令式的修改方式 [`mutate()`](https://useSWR.vercel.app/docs/mutation)。

mutate 包括两个参数，第一个是新的数据（或是 Promise 对象），或者一个函数（函数调用实参是该请求的当前值）。第二个参数表示修改完成后是否应该重新发起请求，因为前端更新后的数据可能和后端的数据不一致，应以后端数据为准。

SWR 还提供了全局的 `mutate()` 方法，它的第一个参数是 key，表示想要修改的请求。`useSWR()` 返回的 `mutate()` 就是全局 mutate 方法绑定了 key 后的版本。

> **拓展知识**
>
> 在这方面，有个很专业的名词叫乐观更新（[optimistic updates](https://stackoverflow.com/questions/33009657/what-is-optimistic-updates-in-front-end-development)），它是指用户通过页面修改服务端数据时，页面立即更新为用户修改后的数据，而不用等待服务端确认是否修改成功。这种方式有个弊端，那就是用户看到页面更新后就以为数据更新成功了，然后就把浏览器关了，如果服务端返回更新失败，也不能通知到用户了。因此最好能在乐观更新时，可以把请求的超时时间调小，或者在修改的内容旁展示加载态告知用户修改仍在进行中，提升用户体验。

# useSWR 的优势

在介绍完 useSWR 的设计思想和基本使用后，接下来我们看看 useSWR 的优势，使用了它后解决了哪些问题。

## 1、实现了错误状态和加载状态

useSWR 不仅和我们实现的 `useFetch` 一样好用，它的返回值还包括错误状态 error 和加载状态 isValidating。如果你曾经为每个请求都写过一次 `try catch` 和 `setLoading(true)`，那么用上 useSWR 后代码绝对会简洁不少。

```js
// 使用 useSWR 实现带有数据请求的 React 组件，和 useFetch 一样简洁。
function CompWithSWR() {
  const { data, error, isValidating } = useSWR(key, fetcher)

  return <div>{data || "-"}</div>
}
```

除了简洁之外，useSWR 还对 data/error/isValidating 做了优化，避免引起不必要的渲染。比如业务场景只关心请求的结果，当请求结果中数据不存在时，就在页面上展示占位符短横线。由于该场景并不关心加载状态和错误状态，那么 useSWR 就只会在 data 发生改变时才触发组件重新渲染。该优化通过 `Object.defineProperties` 实现依赖收集，可参考[源码](https://github.com/vercel/useSWR/blob/master/src/use-useSWR.ts#L753)。

值得一提的是，当再次发起请求时，useSWR 会保留上次的请求结果，而不是重置 data 为 undefined。如果业务场景要求加载时重置 data/error，可在调用侧根据 isValidating 的值进行调整。

```js
// 发起请求时重置 data/error
function CompWithSWR() {
  const { data, error, isValidating } = useSWR(key, fetcher)
  const businessData = isValidating ? undefined : data
  const businessError = isValidating ? undefined : data

  return <div>{businessData || "-"}</div>
}
```

## 2. 解决了请求时序问题

请求的时序问题是指用户操作页面两次，先后发出了请求 1 和请求 2，用户期望页面展示请求 2 的数据，但页面却展示了请求 1 的数据。

![时序问题.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c40d76f0bd8c400bb3bddfe3c988f173~tplv-k3u1fbpfcp-watermark.image)

为了保证程序的正确性，在搜索查询的页面和模块中，都需要解决时序问题。以往解决时序最简单的方法是使用一个递增的整数，每次请求结束都会用该整数判断当前请求是否是最后一个请求。如果是最后一个请求才使用它的响应结果，否则就忽略它。

```js
// 实现最简单的时序问题处理
function Comp() {
  const [search, setSearch] = useState("")
  const [data, setData] = useState()

  const fetcher = useMemo(() => {
    let reqCount = 0
    return async () => {
      const currCount = ++reqCount
      try {
        const data = await fetchData(search)
        if (currCount === reqCount) {
          // 如果是最后一次发起请求，才处理
          setData(data)
        }
      } catch (err) {
        if (currCount === reqCount) {
          // 如果是最后一次发起请求，才处理
          Message.error("服务端错误")
          throw err
        }
      }
    }
  }, [search])

  return (
    <div>
      <div>
        <input onChange={fetcher} />
      </div>
      data: {data || "-"}
    </div>
  )
}
```

使用 useSWR 后，我们就无需关心时序问题了，因为它的内部已经抽象了这块逻辑。

## 3. 天然的全局状态方便多组件复用

如果只有一个组件会使用到某请求，我们一般都会将该请求的结果存在组件内部，这也符合软件设计内聚封装的思想。但如果多个组件需要共用该请求的数据，通常我们会将数据放到 Context 或 Redux 中。在实现该功能时，不仅要将数据移动到上层，还要调整「获取请求的代码」和「更新数据的代码」，繁琐且容易出错。

另一种解决办法是在需要该请求数据的多个组件中，都调用我们实现的 `useFetch` Hook。但是该方法有两个缺点。1.) 每个组件各自维护了一份数据，如果前端需要更新数据，那么两份数据如何同步就会变得很困难。2.) 每个组件都会发起一次请求，且不说对同一个请求发出多次会浪费资源，而且两次请求的结果也可能存在数据不一致的情况。由于这些缺点，所以还是使用上一种方案的全局数据管理更靠谱些。

useSWR 内部便是通过全局数据实现，如果调用 `useSWR(key, fetcher)` 的 key 一样，它们就会使用同一份数据。如果我们使用 useSWR 在组件 A 中使用了请求 `/api/data` 的数据，代码如下。

```js
// 在组件 A 中获取请求 `/api/data` 的数据
function CompA() {
  const { data } = useSWR("/api/data", async () => {
    await new Promise(r => setTimeout(r, 500))
    return "MoonBall"
  })
  return <div>组件A：{data || "-"}</div>
}
```

随后组件 B 也需要使用该请求。那么我们先复制一下代码看看效果。

```js
// 在组件 B 中也获取请求 `/api/data` 的数据
function CompB() {
  const { data } = useSWR("/api/data", async () => {
    await new Promise(r => setTimeout(r, 500))
    return "MoonBall"
  })
  return <div>组件B：{data || "-"}</div>
}
```

你可能会觉得这样的写法也要发出两次请求，但实际上只要 CompA 和 CompB 的挂载时间之差小于 [dedupingInterval（默认值是 2000ms）](https://useSWR.vercel.app/zh-CN/docs/options) ，useSWR 就只会发出一次请求。目前 useSWR 是在 [useLayoutEffect](https://github.com/vercel/swr/blob/fa676db47512b07b539e8b933932d714a2e5d3b3/src/use-swr.ts#L538) 钩子回调中尝试发起请求的。

如果页面是同时展示组件 A 和组件 B，那么就不会发出两次请求，因为如果「执行组件 A 钩子回调」和「执行组件 B 钩子回调」之间时间超过 2s，那页面就太卡了，用户也该喷了。

如果页面先展示组件 A，用户点击按钮后才展示组件 B，组件 A 和 B 的挂载时间超过了 2s，那么组件 B 挂载时重新获取数据也是合理的，毕竟上次获取的请求数据可能已经是脏数据了（毕竟服务端随时都可能更新数据）。

当然也存在某些特殊场景，我们就是不想 B 重新发起请求，比如当数据更新后，就会导致组件 A 重新执行 Render 过程，进一步导致莫名其妙的 bug 或性能问题。这时可以给组件 B 传 `revalidateOnMount: false`，让组件 B 在挂载时不会发起请求。

接下来我们再简化下代码，将请求相关的公共代码提炼为函数 `useData`，然后在组件 A 和组件 B 中调用 `useData` 就完美了。

```js
function useData(revalidateOnMount) {
  return useSWR(
    "/api/data",
    async () => {
      await new Promise(r => setTimeout(r, 500))
      return "MoonBall"
    },
    {
      revalidateOnMount,
    }
  )
}

function CompA() {
  const { data } = useData()
  return <div>组件A：{data || "-"}</div>
}

function CompB() {
  // 根据需求，可以传参 false，来避免组件 B 在挂载时发起请求
  const { data } = useData()
  return <div>组件B：{data || "-"}</div>
}
```

## 4. 轻松实现数据预加载

因为用户 Hover 到某按钮时，就极可能会点击该按钮，所以常见的数据预加载场景就是在用户 Hover 到某按钮时，预加载点击按钮后需要的数据，以便用户点击按钮后能立即看到结果，而不是看到“数据加载中...”，提升用户体验。

我们先梳理下实现数据预加载的方式有哪些？

1. 通过将数据提升，达到多组件复用来实现。
2. 通过拿到后续组件的 ref 通过调用 `ref.prefetch()` 来实现。
3. 通过接口缓存实现，比如将接口响应缓存 1s，1s 内发起点击就会立即使用缓存。
4. 等等...

前两种方式都伴随着不少的开发量。第三种方式简单，但容易失效，比如：用户 Hover 到按钮上等了 2s 在点击。

使用 useSWR 实现预加载的方式只需三步。

1. 给请求所在 Hook 增加 revalidateOnMount 参数。
2. 在实现预加载的组件中，引用该 Hook 并传参 revalidateOnMount 为 false。
3. 给按钮增加 onMouseEnter 事件处理函数，在函数中调用 revalidate()。

```js
// 使用 useSWR 实现预加载
function useData(revalidateOnMount) {
  return useSWR(
    "/api/data",
    async () => {
      await new Promise(r => setTimeout(r, 500))
      return "MoonBall"
    },
    {
      revalidateOnMount,
    }
  )
}

function CompA() {
  const [visible, setVisible] = useState(false)
  const { revalidate } = useData(false)

  return (
    <div>
      组件A
      <br />
      <button
        onClick={() => setVisible(v => !v)}
        onMouseEnter={() => !visible && revalidate()}
      >
        点我-{!visible ? "显示" : "隐藏"}组件B
      </button>
      {visible && <CompB />}
    </div>
  )
}

function CompB() {
  const { data } = useData()
  return <div>组件B：{data || "-"}</div>
}
```

代码中执行 `revalidate()` 后就会发起请求，获取数据，实现预加载。以上代码有两点值得提出来分析下。

1. 在组件 A 中调用 useData 时传参是 false，因为不希望挂载组件 A 时产生不必要的请求，避免导致页面需要的请求延后。
2. 展示组件 B 时，组件 A 中已经发起了预加载请求，按理来说我们应该在组件 B 中调用 useData 时也传参 false。但是我们没有这样做，我们从预加载请求的状态来分析下原因。1.) 如果预加载的请求还在进行中，且不超过 dedupingInterval，那么挂载时就不会发起新的请求。2.) 如果预加载请求已结束，再发一次请求也不占用资源，而且还提升了组件 B 在不需要预加载的场景下的复用性。

如果没这么讲究，可以直接组件 A 中调用 `useData()` 或在组件 A 中挂载组件 B，但用 `<div style={{ display: 'none' }}>` 隐藏组件 B。这两种方式的缺点都是，在挂载组件 A 时会发出与当前页面无关的请求，占用资源。通过 `display: 'none'` 实现时，如果组件 B 的 Render 过程很费时，还会导致性能问题，影响首屏渲染。举个例子，在分页场景中，将分页展示数据封装为 Page 组件，则我们可以非常简单地实现下一页的数据预加载。

```js
// 分页场景下，预加载下一页数据
function Page({ index }) {
  const { data } = useSWR(`/api/data?page=${index}`, fetcher)

  // ... 处理加载和错误状态

  return data.map(item => <div key={item.id}>{item.name}</div>)
}

// 方式一：通过直接调用 useSWR()，获取下一页数据
function App1() {
  const [page, setPage] = useState(0)
  // 预加载下一页数据
  useSWR(`/api/data?page=${page + 1}`, fetcher)

  return (
    <div>
      <Page index={page} />
      <button onClick={() => setPage(page - 1)}>上一页</button>
      <button onClick={() => setPage(page + 1)}>下一页</button>
    </div>
  )
}

// 方式二：通过 display: "none" 实现
function App2() {
  const [page, setPage] = useState(0)

  // 将 <Page index={pageIndex + 1} /> 放在最后面
  // 尽量避免阻塞当前页面需要的请求
  // 这种方式不适合 Page 组件很复杂的场景，会导致性能问题。
  return (
    <div>
      <Page index={page} />
      <button onClick={() => setPage(page - 1)}>上一页</button>
      <button onClick={() => setPage(page + 1)}>下一页</button>

      <div style={{ display: "none" }}>
        <Page index={pageIndex + 1} />
      </div>
    </div>
  )
}
```

最后，[官网推荐的预加载方式](https://useSWR.vercel.app/docs/prefetching#programmatically-prefetch)是使用 mutate 实现。但使用 mutate 实现时，需要导出 `useData` 的同时导出 key 和 fetcher 给 CompA 使用，写起来会麻烦一些。

## 5. 组件卸载后不执行 setState

当 React 组件中带有数据请求时，如果组件在请求结果返回前被卸载了，React 会警告我们组件存在内存泄漏问题。

![React Warning-组件卸载后执行 setState.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d534b5c5ba7e45eeb13dc82e7788d999~tplv-k3u1fbpfcp-watermark.image)

为了避免这个警告，我们在实现组件时，会使用 unmountedRef 标记组件是否卸载，如果组件已经被卸载了就不执行状态更新语句。

```js
function Comp() {
  const [data, setData] = useState()
  const unmountedRef = useRef(false)
  useEffect(() => {
    ;(async () => {
      await new Promise(r => setTimeout(r, 2000))
      if (!unmountedRef.current) {
        // 如果组件已经被卸载了，仍执行 setData
        // React 会报出 Warning 警告
        setData("MoonBall")
      }
    })()

    return () => {
      unmountedRef.current = true
    }
  }, [])
  return <div>data: {data || "-"}</div>
}
```

使用 useSWR 后，我们完全不用关心该问题，因为它会在组件卸载后将状态更新函数修改为 noop，参考[源码](https://github.com/vercel/swr/blob/fa676db47512b07b539e8b933932d714a2e5d3b3/src/use-swr.ts#L647)。这个技巧比较巧妙，上面的例子如果运用该技巧，代码就会更简洁。

```js
function Comp() {
  const [data, setData] = useState()
  let dispatch = setData
  useEffect(() => {
    ;(async () => {
      await new Promise(r => setTimeout(r, 2000))
      // 如果组件已经被卸载了，dispatch 就是空函数，
      // 不会触发 React 警告
      dispatch("MoonBall")
    })()

    return () => {
      dispatch = () => {}
    }
  }, [])
  return <div>data: {data || "-"}</div>
}
```

## 6. 轮询和重试机制

useSWR 实现了很多请求刷新方式，比如轮询机制、错误重试机制和 focus/online 重试机制。这些机制在业务上虽然使用得不多，但需要的时候自己实现还是会比较麻烦。

# useSWR 的缺点

## 全局 key 命名问题

跟 Redux 中的 ActionType 一样，都是全局命名问题。

## 未提供请求中断的 API

在[请求时序问题](#heading-7)中，请求 2 发出时如果请求 1 没有结束，最好的处理方式是将请求 1 进行终止，避免资源浪费，类似 [axios 的取消机制](https://github.com/axios/axios#cancellation)。可惜目前 useSWR 并没有提供终止请求的方法。

## 没有 getter 方法去读取数据

useSWR 只有通过它提供的 Hook 才能访问到数据，没有提供一个 getter 方法通过 key 获取数据。这在复杂的更新逻辑中还是很需要的，类似于 Redux 的 getState 方法，在任何地方需要某个全局数据时，调一下就拿到数据的当前值了，非常方便。而 useSWR 只通过 Hook 返回请求的数据，需要从页面一直传到需要该数据的地方，非常麻烦。

## 配置相对于 key 还是相对于 Hook 的，傻傻分不清

useSWR 中请求是相对于 key 的，但 fetcher 和配置却是相对于 Hook 的，比如同 key 的 useSWR 是可以使用不同的 fetcher 和配置的。尽管我们不会那样写，但还是会造成理解负担。关于这点我们可通过[最佳实践-代码组织](#heading-19)来避免，保证相同 key 的请求的 fetcher 和 config 是一致的。

这种设计就存在一个无法修复的 bug，当调用 useSWR 是传了 initialData，那么使用 mutate 时，并不会将当前的 data 传给 mutate 的回调。其原因就是因为 mutate 中的 data 是相对于 key 的，而 initialData 却是相对于 Hook 的。

```js
// 传了 initialData 后，第一次调用 mutate 时，回调函数的 data 是 undefined
function Comp() {
  const { data, mutate } = useSWR("api/data", fetcher, {
    initialData: "MoonBall",
  })

  const handleChange = () => {
    mutate(data => {
      // 第一次调用时这里的 data 是 undefined
      // 所以会报错
      return data.slice(0, 4)
    })
  }

  return (
    <div>
      <div>
        <button onClick={handleChange}>修改</button>
      </div>
      data: {data}
    </div>
  )
}
```

## 需要手动删除不使用的缓存，避免内存泄漏

目前所有 key 对应的响应结果都没有被删除，为了避免内存泄漏，需要开发人员主动清理缓存，可参考[最佳实践-清理 Cache 避免内存泄漏](#heading-21)。

# 最佳实践

## 代码组织

将使用 useSWR 请求的代码提取为单独的 Hook，以便多个组件进行复用，像前面实现的 useData 一样。如果将同 key 的请求放在不同的位置，就可能导致各个地方给 useSWR 调用时传的 fetcher 和 config 不同，导致莫名其妙的问题。

```js
// 不推荐将同 key 的请求分散到各处
// 比如下面两个 fetcher 函数的返回值就不同
function CompA() {
  const { data } = useSWR("/api/data", async () => {
    await new Promise(r => setTimeout(r, 500))
    return "MoonBall"
  })
  return <div>组件A：{data || "-"}</div>
}

function CompB() {
  const { data } = useSWR("/api/data", async () => {
    await new Promise(r => setTimeout(r, 500))
    return "MoonBall-2"
  })
  return <div>组件B：{data || "-"}</div>
}
```

## Error 处理

在前面我们实现的 `useFetch` 方法中，每次请求出错都会执行 `throw err` 将错误再抛出去。但 useSWR 中并没有这样做，它将错误吃掉了，并通过 onError 反馈给我们。所以我们一定要设置全局的 onError 回调函数，并打印 err 或将 err 上传至 Sentry，方便我们定位问题。

## 清理 Cache 避免内存泄漏

前面说到 useSWR 不会自动清理请求响应，所以我们需要主动清理缓存，避免内存泄漏。在 SPA 应用中，建议在页面组件卸载时执行 `cache.clear()` 来清理缓存。但整个应用中某些接口是跨页面共享的，属于应用级别的数据，它们不应该被清理掉，比如用户信息，应用版本配置等等。还好这些跨页面应用级别的接口并不多，这些接口仍然可通过 Redux 等其他状态管理库实现，只有页面内的接口才使用 useSWR 实现。

在页面组件中调用如下 Hook 就可以将缓存清理掉，避免内存泄漏。

```
import { cache } from "useSWR";

function useCacheClearWhenPageUnmount() {
  return useEffect(() => {
    return () => {
      cache.clear();
    };
  }, []);
}
```

目前[自定义 Cache 的 PR](https://github.com/vercel/useSWR/pull/1017) 正在进行中，未来我们可以通过自定义 Cache 来避免内存泄漏问题。

# 总结

本文给大家分享了 useSWR 的设计思想、使用场景和最佳实践，相信 useSWR 一定会提升大家的编码效率、代码简洁性和可读性。

后续我也计划分享 React Query，并将它和 SWR 进行对比，敬请期待。

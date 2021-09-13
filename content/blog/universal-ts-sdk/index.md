---
# 主题列表：juejin, github, smartblue, cyanosis, channing-cyan, fancy, hydrogen, condensed-night-purple, greenwillow, v-green, vue-pro, healer-readable, mk-cute, jzman, geek-black, awesome-green, qklhk-chocolate

# 贡献主题：https://github.com/xitu/juejin-markdown-themes

# 摘要：本文主要记录实现一款通用 SDK 时遇到的问题，以及解决方案，如果你需要快速创建一个 SDK，那么你可以复制该项目建立你自己的 SDK，并在遇到问题的时候再回头阅读本文。

theme: hydrogen
highlight:
---

# 如何实现一款支持浏览器和 Node.js 的通用 SDK

# TL;DR

本文对应的 SDK 项目仓库为 [universal-sdk-by-tsdx](https://github.com/MoonBall/universal-sdk-by-tsdx)。

本文主要记录实现一款通用 SDK 时遇到的问题，以及解决方案，如果你需要快速创建一个 SDK，那么你可以复制该项目建立你自己的 SDK，并在遇到问题的时候再回头阅读本文。

如果你更愿意通过阅读代码的方式了解实现原理，那么克隆该项目并阅读源码将非常适合你。在该项目中执行 `git log`，将展示详细的实践步骤，这对理解该 SDK 的迭代过程非常有帮助。

# 背景

项目中需要实现一款 SDK，该 SDK 需要满足的条件有：

1. 使用 TS 语言，支持 lint 和 test。
2. 支持 Node.js 端运行并且最低版本为 v10。
3. 支持浏览器端运行且可以通过 browserslist 对支持的浏览器进行配置。

# 选择 tsdx

选择 tsdx 的原因是它能快速搭建 TS 的配置，其中包括：

- lint 和 test
- prettier 格式化
- vscode 可以友好的提示 lint 错误
- 可以直接构建出 cjs/esm/umd 格式的输出文件

## 通过 tsdx 创建项目

```shell
npx tsdx create universal-sdk-by-tsdx
# 选择 basic 即可

cd universal-sdk-by-tsdx
```

> 创建后的项目参考 [Commit](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/f0ef56d62c995279b9d67846fb598ede8930e62b)。

创建完项目后，我们需要验证下需要的功能。

## 验证 eslint 😑

当把 `src/index.ts` 中的 `'boop'` 字符串的单引号改成双引号时，vscode 并没有报错。

![no-eslint-error.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/77d0e3d081b247d7a9fc7b75b85a6dba~tplv-k3u1fbpfcp-watermark.image)

需要执行 `yarn lint --write-file`，这个命令将在项目更目录生成 `.eslintrc.js` 文件。重启 vscode，将看到 eslint 提示的报错信息。

![eslint-error.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/854dca88016e4e2abd4610e19bcad0c1~tplv-k3u1fbpfcp-watermark.image)

## 验证 vscode 代码格式化 ✅

将 vscode 中的代码格式化配置为 prettier 插件，格式化可以生效。因为 [`package.json#prettier`](https://github.com/MoonBall/universal-sdk-by-tsdx/blob/f0ef56d62c995279b9d67846fb598ede8930e62b/package.json#L28-L33) 字段定义了项目的 prettier 的配置，所以 vscode 不会使用默认的 prettier 配置。

# 构建产物同时支持浏览器和 Node.js

SDK 同时支持浏览器和 Node.js 环境，存在以下几个问题。

1. 暴露的 API 不同。通常浏览器环境支持的 API 比 Node.js 环境少。例如 [OSS 在浏览器端就存在一些限制](https://github.com/ali-sdk/ali-oss#browser-usage)。
2. 浏览器端需要构建 umd 格式，以便用户直接在 `<script />` 标签中使用。
3. 根据运行环境执行不同的代码逻辑。例如，希望在浏览环境使用该 SDK 时，在控制台中打印 `Hello World`，但是在 Node.js 环境不打印。
4. Native 能力不同。假设该 SDK 需要依赖 [crypto](https://nodejs.org/api/crypto.html) 做加解密。在浏览器环境，由于浏览器没有提供 crypto 的能力，所以需要依赖三方包实现，例如：[browser-crypto](https://www.npmjs.com/package/browser-crypto)。但在 Node.js 环境，不能使用三方库，因为 Node.js 的 crypto 是通过 C++ 实现的，它的性能更高。

接下来分别讨论这几个问题，并给出解决方案。

## 问题 1：暴露的 API 不同

这个问题可以通过为浏览器环境设置不同的入口文件实现该功能。

1. 创建 `src/browser-index.ts`，其导出和 `src/index.ts` 不同，参考[代码](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/a0b955b0aebd682fe212b78e7b27d32be27a7a7e#diff-2e0de53017b430c0ed6e6157560df73d1e4c7059ea2aa8736fc9e8a9a97ab856R1-R6)。
2. 在 `package.json` 中增加 `build:node` 和 `build:browser` 脚本，参考[代码](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/a0b955b0aebd682fe212b78e7b27d32be27a7a7e#diff-7ae45ad102eab3b6d7e7896acd08c427a9b25b346470d7bc6507b6481575d519R16-R17)。
3. 创建 `tsdx.config.js`，如果构建目标是浏览器，则修改构建的入口文件 `config.input`，参考[代码](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/a0b955b0aebd682fe212b78e7b27d32be27a7a7e#diff-7eb32cb816db9aefed03469f59ccfcd4985b0a1e98fe5da291b0ec33ff7748d9R1-R16)。

修改后，执行 `yarn build:browser` 和 `yarn build:node` 将生成不同的产物。

> 解决该问题对应的修改，参考 [Commit](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/a0b955b0aebd682fe212b78e7b27d32be27a7a7e#)。

> 由于在 TypeScript 语言中，一个包只能有一个类型定义，所以不能为浏览器环境和 Node.js 环境指定不同的类型定义（参考 issue - [Typings for the main and browser property in package.json](https://github.com/Microsoft/TypeScript/issues/29128)）。

## 问题 2：浏览器环境需构建 UMD 格式

tsdx 的 format 参数可以配置构建产物的格式，修改 `build:browser` 脚本即可。

> 解决该问题对应的修改，参考 [Commit](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/58755dcc9082c88849d4b74431ae7a573ef09b40)。

## 问题 3：根据运行环境执行不同的代码

通常我们通过判断 `process.env.NODE_ENV` 实现在 development 和 production 环境执行不同的代码。例如，仅在在 development 环境才打印错误信息的代码如下：

```js
if ("development" === process.env.NODE_ENV) {
  console.error(err)
}
```

我们也可以利用这种方式来区分构建产物的运行环境。基于构建时的目标环境，给 `process.env` 增加一个变量 `TARGET_ENVIRONMENT`，然后通过 `@rollup/plugin-replace` 将该变量替换为字符串常量，之后便可以通过 `process.env.TARGET_ENVIRONMENT` 区分环境了。

这种方式有个非常强大的优点，它将去除死代码（dead code），即 Node 环境的代码不会出现在浏览器环境的产物中。

> 解决该问题对应的修改，参考 [Commit](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/3b6d02d6f9b75c48a1e0014a3a084b21efd8f1da)。

## 问题 4：Native 能力不同

这个问题比较有意思，我先把想到的解决方案列出来，然后再将他们进行对比。

### 方案一：rollup-plugin-node-builtins

该方案使用 [rollup-plugin-node-builtins](https://github.com/calvinmetcalf/rollup-plugin-node-builtins#readme) 插件将 Node.js 内置的模块打包到 umd 产物中。在该方案下，如果用户使用的是 cjs 或 esm 的产物，那么 Node.js 的内置模块需要由使用方进行打包处理。通常 Webpack 可以很好的处理这些模块。

> 解决该问题对应的修改，参考 [Commit](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/62a586be840d78dfe48e3c5a4c3e1369be94f924)。

本次修改中，`src/browser-index.ts`、`src/index.ts`、`src/use-crypto.ts` 和 `index.html` 是为了测试目的而新增的。在浏览器中访问 `index.html` 文件，可以测试 umd 产物是否运行正常。

在 `tsdx.config.js` 文件中的修改点包括：

1. [修改 `config.external`](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/62a586be840d78dfe48e3c5a4c3e1369be94f924#diff-7eb32cb816db9aefed03469f59ccfcd4985b0a1e98fe5da291b0ec33ff7748d9R47)。因为所有依赖都需要被打包到 umd 产物中，所以这个 `external` 需要始终为 `false`。
2. [添加 globals 和 builtins 插件](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/62a586be840d78dfe48e3c5a4c3e1369be94f924#diff-7eb32cb816db9aefed03469f59ccfcd4985b0a1e98fe5da291b0ec33ff7748d9R49-R50)，以便在浏览器环境可以使用 crypto 功能。
3. [使用本地文件替换 safer-buffer](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/62a586be840d78dfe48e3c5a4c3e1369be94f924#diff-7eb32cb816db9aefed03469f59ccfcd4985b0a1e98fe5da291b0ec33ff7748d9R36-R45)，其原因是：[这个 issue](https://github.com/ChALkeR/safer-buffer/issues/7)。
4. [使用 commonjs 转换本地的 safer-buffer](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/62a586be840d78dfe48e3c5a4c3e1369be94f924#diff-7eb32cb816db9aefed03469f59ccfcd4985b0a1e98fe5da291b0ec33ff7748d9R51-R53)。tsdx 的 commonjs 插件配置只会对 node_modules 中的模块生效，当我们使用了本地的 `safer-buffer` 后，该模块不会被 commonjs 插件转换，导致报错（require is undefined）。
5. [使用 package.json 中 browser 字段定位模块](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/62a586be840d78dfe48e3c5a4c3e1369be94f924#diff-7eb32cb816db9aefed03469f59ccfcd4985b0a1e98fe5da291b0ec33ff7748d9R24-R33)，否则不符合[浏览器相关依赖的解析规则](https://github.com/SunshowerC/blog/issues/8#browser-vs-module-vs-main)。这里代码是参考了 [tsdx 源码](https://github.com/formium/tsdx/blob/462af2d002987f985695b98400e0344b8f2754b7/src/createRollupConfig.ts#L115-L122)，增加了 `browser: true` 并修改了 mainFields。这应该算是 tsdx 的 bug 了。

### 方案二：根据 TARGET_ENVIRONMENT 环境变量，动态 require

>  本次修改的代码内容，参考 [Commit](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/6b97a5af363f94fb185fe039082aaec7ce6af6a6)。

先看 `src/use-crypto.js` 文件。在该文件中根据 `process.env.TARGET_ENVIRONMENT` 动态加载指定模块。

然后在 `tsdx.config.js` 文件中，使用 commonjs 插件对 `use-crypto.js` 进行处理。

根据 commonjs 插件的处理流程，如果动态 require  依赖 A 或依赖 B， 那么这两个 require 语句都会先被转换成 ES6 的 import  语句。依赖 A 和依赖 B 都会被当做依赖，打包到最后的产物中。如此便会增加产物构建时间和体积。

但这个问题可以被优雅地解决掉。只要把 replace 插件放到 commonjs 插件的前面，那么死代码就会先被移除，然后代码才被 commonjs 处理。如此一来就不会对构建时间造成影响了。

> 参考 [replace 插件的 README.md]{https://github.com/rollup/plugins/tree/master/packages/replace#usage}。
> Typically, `@rollup/plugin-replace` should be placed in `plugins` before other plugins so that they may apply optimizations, such as dead code removal.

实际上在本次 [Commit](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/6b97a5af363f94fb185fe039082aaec7ce6af6a6) 后，执行 `yarn build:browser` 并在浏览器中打开 `index.html` 文件，会发现如下报错。

![buffer-is-undefined.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/598420806f5d4234a4402e3adde4bc1c~tplv-k3u1fbpfcp-watermark.image)

这就说明方案二还需要像方案一一样，把所有 Node.js 的内置模块都处理一下，所以方案二是依赖于方案一的。**但方案二在特定场景下还是非常有用的，比如需要在 Node.js 环境使用浏览器环境涉及的功能。**例如，如果想 Node.js 环境使用 DOM 的 API，那么可以根据环境判断是否引入在 Node.js 环境模拟 DOM 操作相关的库（如：[jsdom](https://www.npmjs.com/package/jsdom)）。

> 该方案最终能在浏览器中运行的代码，参考 [Commit](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/f137094bc43139b176b2a813100df5c554152ebe)。

### 方案三：自定义 polyfill 文件

类似于 [Ali OSS](https://github.com/ali-sdk/ali-oss)。在项目中提供 [crypto 的 polyfill 文件](https://github.com/ali-sdk/ali-oss/tree/master/shims/crypto)，然后[在浏览器环境打包时使用该 polyfill](https://github.com/ali-sdk/ali-oss/blob/bb565c202abbea2b329d4c03b0eddaed9ece9766/package.json#L11-L20)。

OSS 使用的 crypto polyfill 就是 [crypto-browserify](https://github.com/crypto-browserify/crypto-browserify)。但是它只选择性的包含了 OSS 需要的方法（如：sha1 和 md5)，不包含其他算法（如：sha256）。使用这种方式的好处是**可以保证 polyfill 的代码量最小，减小打包体积，提升构建速度。**但即使使用这种方式，我们仍然需要处理 Node.js 的内置模块（如：buffer），因为 [crypto-browserify 仍然使用了 buffer](https://github.com/ali-sdk/ali-oss/blob/master/shims/crypto/crypto.js#L2)。

自定义了 polyfill 文件后，有两种方式可以根据当前环境判断是否导入该 polyfill。

1. 通过 `TARGET_ENVIRONMENT` 环境变量动态 require。
2. 通过在 tsdx.config.js 增加插件 `@rollup/plugin-alias`，并在浏览器环境将指定包映射到 polyfill 文件。

第一种方式就不再赘述了，接下来使用第二种方式实现。实际上，**我更推荐第一种方式，因为第一种方式从代码层面上看更加直观，而第二种方式通过 rollup 插件进行配置，需要更高的理解成本。**

> 实现代码参考 [Commit](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/03d6f6cda8b9830e83f9d168be219a05aeedf266)。

### 对比上述方案

如果在浏览器端使用了 Node.js 的模块，那么需要把基础的内置模块进行打包，所以方案一是必选的。只是像 crypto 这种很复杂的内置模块，可以通过自定义 polyfill 的方式实现。通过对比方案一和方案三，方案一将内置的 crypto 构建到 umd 产物中，耗时 20s，UMD 产物大小为 1MB，而方案三将自定义的 polyfill 构建到 umd 产物中，耗时只有 10s，UMD 产物大小只有 70KB。

方案二在结合了 [replace](https://www.npmjs.com/package/@rollup/plugin-replace) 插件后，只会导入目标环境指定的依赖，不会增加构建耗时和产物体积。在除了简单 Node.js 内置模块的场景外，方案二是非常不错的利器，例如将方案二和方案三结合使用。

尽管理论上可以通过方案二实现「在浏览器环境导入 Node.js 内置模块的浏览器版本」，但是这样做有有个缺点：如果第三方依赖使用了 Node.js 的内置模块（例如：[crypto-browserify](https://github.com/crypto-browserify/crypto-browserify) 内部就使用了 buffer），我们不可能修改这些三方依赖的代码，使他们导入 buffer 的浏览器版本。所以实际上，仅通过方案二我们不可能实现「在浏览器环境导入 Node.js 内置模块的浏览器版本」。但可以通过 alias 插件实现，使用 alias 插件和使用 builtin 插件本质上相同。

## `yarn build` 同时构建浏览器和 Node.js 环境产物

先前我们已经在 `package.json` 中增加了 `build:node` 和 `build:browser` 两条脚本指令。理想情况下，两条构建语句应该并行执行。但由于 tsdx 存在以下两个限制，我们只能通过自定义脚本绕过去。

1. 构建产物只能存放到 dist 目录中（尽管可以修改 rollupConfig.output，但 tsdx 内部逻辑与默认的产物路径存在耦合）。
2. tsdx 每次执行构建时都会删除上次的构建产物（[--noClean 在 build 时不会生效](https://github.com/formium/tsdx/issues/746#issuecomment-643524594)）。

> 实现代码参考 [Commit](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/279b05748ca128a0f5ab9058fc03d4c976e86b2f)。

最终产物被放在 `browser/` 和 `dist/`，为什么没有把浏览器环境的产物放到 `dist/browser` 中呢？原因有以下几点：

1. `src/browser` 目录下的 TS 文件将被放到 `dist/browser` 目录中，所以存在文件冲突的可能。
2. 允许使用方通过 `universal-sdk-by-tsdx/browser` 导入浏览器环境的产物，并且此时的 TS 类型文件也是使用的 `browser/index.d.ts`。
3. 可以保证 sourcemap 后的源码位置不变。如果将产物放到 `dist/browser` 中，那么 sourcemap 映射后的源码路径将是 `dist/src/...`，而不是 `src/...`。

# SDK 对环境的最低版本支持

SDK 需要表明自身支持的运行环境，最好可以通过配置的方式实现，以便后续升级。

## Node.js 支持最低版本 v10

通过查看 tsdx 的源码，发现[其 hard code 了 Node.js 的最低版本为 v10](https://github.com/formium/tsdx/blob/master/src/createRollupConfig.ts#L192)。

为了方便我们自行配置支持的 Node.js 版本，我们在 `tsdx.config.js` 文件中重写它。

> 实现代码参考 [Commit](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/97487f1b6ccb0bd61b2b2a1dccf7d559d8d12d8f)

在 `src/test-node-version.ts` 文件中，存在 `nullish-coalescing-operator` 语法和 `exponentiation-operator` 语法。由于 `nullish-coalescing-operator` 在 node@v14 才支持，而 `exponentiation-operator` 在 node@v7 就支持了，所以执行 `yarn build:node` 后可以看到 `nullish-coalescing-operator` 语法被转译了，而 `exponentiation-operator` 语法没有被转译。

![support-node-v10.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/75dcfbb4e70a44c2bc6e7fb01c92fef6~tplv-k3u1fbpfcp-watermark.image)

如果把[支持的 Node.js 版本改为 `'6'`](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/97487f1b6ccb0bd61b2b2a1dccf7d559d8d12d8f#diff-7eb32cb816db9aefed03469f59ccfcd4985b0a1e98fe5da291b0ec33ff7748d9R22)，那么 `exponentiation-operator` 也会被转译。

![support-node-v6.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/606e72eeb4a7471aa60c1683a0aad032~tplv-k3u1fbpfcp-watermark.image)

> `babel-preset-env` 把 ES 特性所需的的环境版本配置在 [babel-compat-data/data/plugins.json](https://github.com/babel/babel/blob/main/packages/babel-compat-data/data/plugins.json) 文件中。在 [node.green](https://node.green/) 网站，也可以清晰地看到 ES 特性在 Node.js 环境的支持情况。

## 配置需要支持的浏览器

> 本次修改参考 [Commit](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/c5de5638c6ac9153e2cbc3890aab24aa46f880b3)。

通过配置 `package.json#browserslist` 字段值，即可配置 SDK 支持的浏览器。因为当前配置的值为 `"Chrome >= 70"`，所以执行 `yarn build:browser` 后，`nullish-coalescing-operator` 语法会被转译，而 `exponentiation-operator` 语法不会被转译。

如果把 `package.json#browserslist` 字段值改为 `"Chrome >= 40"`，那么 `nullish-coalescing-operator` 和 `exponentiation-operator` 都会被转译。

## Node.js 环境和浏览器环境的 browserslist 配置会相互影响吗？

因为在 Node.js 环境，我们设置了 `babel-preset-env` 的 `targets` 参数，所以在 Node.js 环境中不会使用 `package.json#browserslist` 配置。而浏览器环境我们没有设置 `targets` 参数，便只会使用 `package.json#browserslist` 配置。

> 参考[官网原文](https://babeljs.io/docs/en/babel-preset-env)。
> By default @babel/preset-env will use browserslist config sources unless either the targets or ignoreBrowserslistConfig options are set.

# 测试

## 单元测试

单元测试的重要性就不必多说了吧，没有单测的 SDK 是不合格的，我是不会用的。

> 本次修改参考 [Commit](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/487e50404e00012964686e9fd87e837c2251c71d)

由于需要做 Node.js 环境和浏览器环境的单元测试，所以在 `package.json` 中新建了两条脚本指令 `test:browser` 和 `test:node`。修改 `test` 脚本执行两个环境的单测，并在最后通过 `scripts/mapCoverage.js` 将测试覆盖率进行合并。

### 测试代码可以直接引用构建后的产物吗？

相较于在测试文件中引用 `src/` 中的代码，如果直接引用构建后的产物代码。有以下几个优点：

1. 直接引用产物中的代码，可以提前发现在构建环节存在的问题。毕竟是测试，那么就应该尽量模拟使用方使用该 SDK 的场景。
2. 因为我们代码中使用了环境变量 `TARGET_ENVIRONMENT` 进行判断，所以如果引用 `src/` 中的文件，我们就需要在所有测试用例前设置 `TARGET_ENVIRONMENT` 环境变量，存在一定的耦合。但引用 `dist/` 中的代码就不用关心该环境变量了。

但引用产物代码后，是不是代码执行报错时或调试时就不能定位到 `src/` 中的源码呢？其实并不会，即使引用的是 `dist/` 中打包的产物，`yarn test` 仍会自动使用 sourcemap 文件。当 `console.log()` 执行或运行出错时都会指向真实的 `src/` 文件。所以这并不是引用产物代码的缺点，但它有另一个更严重的缺点：**测试覆盖率不准**。所以如果 SDK 需要测试覆盖率报告，那么就不能引用构建后的产物代码进行测试。

下图是在测试代码中引用产物代码后的运行截图，可以看到报错和 log 都映射到源码上了。

![yarn-test-error-for-dist.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1b32a29fcc854822a0508bcae46773d4~tplv-k3u1fbpfcp-watermark.image)

## 浏览器环境的 Demo

前面提到如果使用方引用的是浏览器环境的 cjs 或 esm 产物，那么 SDK 使用的 Node.js 内置模块需要由使用方负责打包。但这个场景是单元测试没办法覆盖的（因为单测运行在 Node.js 环境），所以需要建立 Demo 验证 SDK 在该场景下的可用性。

> 本次修改参考 [Commit](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/08724f51fe6a5a71540840ede04d5d9b7964e3e1)。Demo 创建流程参考 [Webpack - Getting Started](https://webpack.js.org/guides/getting-started/)。

在 `example/webpack.config.js` 中，由于 webpack@5 默认不会打包 Node.js 内置模块的 polyfill，所以需要使用 [`node-polyfill-webpack-plugin`](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/08724f51fe6a5a71540840ede04d5d9b7964e3e1#diff-7dd57a4f662248b39cb60c9020a05a60bad59359a915a5ac35b9699cf7bf1095R17)。为了能够在浏览器的 DevTools 中查看 SDK 的源码，所以使用了 [`source-map-loader`](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/08724f51fe6a5a71540840ede04d5d9b7964e3e1#diff-7dd57a4f662248b39cb60c9020a05a60bad59359a915a5ac35b9699cf7bf1095R7-R16)。

在 `package.json` 中，将对外暴露的模块字段都组织到一起，并添加了 [`"browser"` 字段](https://github.com/MoonBall/universal-sdk-by-tsdx/commit/08724f51fe6a5a71540840ede04d5d9b7964e3e1#diff-7ae45ad102eab3b6d7e7896acd08c427a9b25b346470d7bc6507b6481575d519R51-R54)。如果不添加 `"browser"` 字段，则 example 使用的 SDK 将是 Node.js 的版本，不符合预期。

## 总结

本文记录了搭建通用 SDK 的心路历程，总结了实现一款通用 SDK 遇到的问题，并给出解决方案。

如果你也有类似需求，那么直接复制[该项目](https://github.com/MoonBall/universal-sdk-by-tsdx)，就能开始写 SDK 了。

---

好了，我要去写 SDK 了~

**原创不易，别忘了点赞鼓励哦 ❤️**

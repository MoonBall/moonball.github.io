# iOS 面试准备
面试岗位：[《王者荣耀》营地iOS客户端高级开发工程师（成都）](https://careers.tencent.com/jobdesc.html?postId=1194880390947409920)

## 了解 iOS 应用启动流程，运行时
1. 讲讲 [RunLoop](https://blog.ibireme.com/2015/05/18/runloop/)；
2. 页面路由如何实现，如何去维护一张路由表；页面是如何去进行跳转的（runtime）；路由表中的键和值分别是什么？如何根据服务器下发的数据加载页面；
3. 讲讲runtime，以及hook，以及如何进行方法交换；
4. message passing, dispatch table, `objc_msgSend(id, selector)`, swap methods
```
Method original = class_getInstanceMethod([DateCalculator class], @selector(originalMethod));
Method replacement = class_getInstanceMethod([DateCalculator class], @selector(replacementMethod));
method_exchangeImplementations(original, replacement);
```

## 编程范式
1. 使用关联对象把属性添加到category中，具体步骤是怎样的；
2. 如何去手动触发KVO，如何让KVO去监听一个方法；
3. UIViewController的生命周期；
4. Category 和 SubClass 区别
5. Introspection
#import <objc/message.h>
- 获取父类：`class_getSuperclass([calc class])`
- Selector： `SEL selector = @selector(shouldHeDateIfHerAgeIs:);` or `NSSelectorFromString(@"kkkk:");`
- Method：
```
Method method = class_getInstanceMethod([calc class, @selector(hisName)]);
method_getNumberOfArguments(method); // is 2. Class and method for objc message passing
```
6. `Type type` 和 `Type * type` 的区别
7. meta-class, create a class at runtime。objc_object { isa }, objc_class { isa, super_class }
8. UI layout


## 内存管理
1. 深拷贝与浅拷贝
2. 有哪几种类型的block；什么情况下block会从栈区复制到堆区；
3. 在一个函数中的局部变量，需要return，那么这个局部变量什么时候会被释放；它是分配在哪里？
4. block和self的循环引用；到底是如何循环引用的；
5. weak和assign的区别；
6. 哪些属性需要修饰为weak；
7. NSString为什么要修饰成copy；block为什么要修饰为copy；
8. weak在它指向的对象被释放后，会被置为nil，该机制是如何实现的；
9. NSMutableArray在block中修改时，是否要修饰为__block;int类型呢； 
10. 讲讲共享锁和互斥锁；
11. Block 是啥结构, 为啥会循环引用, 解循环引用的方式, __block 原理

## 事件传递
1. 屏幕上点击一个View，事件是如何去响应的

## 多线程
1. GCD和NSOperation的区别；哪一个的复用性更好；NSOperation的队列可以cancel吗，里面的任务可以cancel吗；
2. iOS多线程有哪几种方式；
3. GCD, OperationQueue 有啥区别
4. GCD Barrier, Operation Dependency, 举例使用场景
5. 如何保证线程安全
6. 哪几种锁, 原理, 性能如何
7. atomic 原理
8. 信号量, 举例使用场景


## 动画
1. 讲讲iOS动画，比如CoreAnimation
2. CALayer和UIView的区别；动画可以作用于CALayer和UIView吗？



## iOS 平台常用性能调优手段
1. SDWebImage的缓存策略，是如何从缓存中hit一张图片的；使用了几级缓存；缓存如何满了如何处理，是否要设置过期时间；
2. UITableView滑动卡顿如何解决优化；
3. 网络优化。自建 DNS, TCP 预建连
4. 启动优化。启动阶段, main 前, main 后。
main 前: 动态库 rebase binding, 二进制重排等等, 了解一下. 怎么限制 +load 的使用.
main 后: 集中式 or 分布式, 举例一个架构, 启动时间测量, 如何找出耗时



## 小程序架构设计和实现
1. js和OC如何调用；（js是怎样调用oc的）
2. 讲讲JSPatch；使用了iOS的什么原理；


## 其他
1. 讲讲逆向工程；
2. 讲讲MVC，MVVM，MVP；MVP是哪三个单词的缩写；




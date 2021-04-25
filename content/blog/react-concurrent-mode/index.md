# 并发模式

## 并发模式下，某些场景也是不能中断调和过程的

如果有个 Button 上有个 props 为：`disabled={this.state.hasSent}` 和 `onClick={this.state.hasSent ? null : this.sendMoney}`，并且 `sendMoney` 方法将 hasSent 设置为 `true`。那么开发者期望 onClick 只会触发一次。如果是异步模式的话，只要点得足够快就可能执行 `sendMoney` 两次。

## 为什么要给 stream 挂载 `Symbol.asyncIterator`

因为 stream 是一个可迭代对象，需要实现 `Symbol.asyncIterator` 属性，才能在 for await of 循环中使用。

```typescript
    stream[Symbol.asyncIterator] = async function* (){
        const reader = stream.getReader()
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            if (value) {
                yield value
            }
        }
    }
```
`Symbol.asyncIterator` 属性要求对象提供一个方法，该方法返回一个有`next()`方法的异步迭代器。
`async function* ()` 是 async generator 函数，自动实现了这个要求
- 每次`yield value` -> 收到 `{done: false, value}`
- 最后一次`yield value` -> 收到 `{done: true, value: undefined}`
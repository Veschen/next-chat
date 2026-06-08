## createDecoderStream 函数为什么需要做TextDecoder的降级处理
自 2022年9月 起，此特性已在主流浏览器中得到支持，为了兼容一些边缘情况

### 如何理解 {stream: true}的作用
 ```typescript
    const decoder = new TextDecoder('utf-8')
    return new TransformStream<Uint8Array, string>({
        transform(chunk, controller) {
            controller.enqueue(decoder.decode(chunk, { stream: true }))
        },
        flush(controller) {
            controller.enqueue(decoder.decode())
        }
    })
```
一个UTF-8编码的字符串， 中文字符占据3个字节， emoji 占4个字节。如果网络chunk恰好在字符的中间切断，会导致解码错误。
``` 
    '你' 的 UTF-8 编码：[0xE4, 0xBD, 0xA0]
    chunk1: [...,0xE4, 0xBD]
    chunk2: [0xA0,...]
```
- 不加 {stream: true} 会导致，chunk1和chunk2 都会解码错误
- 加了 {stream: true} 后，chunk1 解码时保留不完整的`[0xE4,0xBD]`在内部缓冲区，等chunk2到达时，再解码为`你`


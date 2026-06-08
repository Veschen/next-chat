## 从Mock Api切换到真实的Chat Api，需要做哪些调整

- 鉴权机制 ：需要在请求头中添加 `Authorization` 字段，在`/lib/request.ts`中添加
- 跨域问题 ：需要在服务器端配置 CORS，允许跨域请求，或在 `next.config.mjs` 中配置`rewrites`做代理
- SSE Data 格式 和请求体格式 ：需要根据服务器端的 API 文档，调整请求体格式，确保与服务器端的格式一致
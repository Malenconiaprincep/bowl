# Bowl Y-WebSocket Server

用于 Bowl 编辑器的 Y-WebSocket 协同编辑服务器。

## 本地运行

```bash
# 安装依赖
npm install

# 启动服务器
npm start
```

服务器默认运行在 `ws://localhost:1234`

## 部署到 Render

### 方式一：通过 Dashboard 手动部署

1. **登录 Render**
   - 访问 [render.com](https://render.com) 并登录

2. **创建新服务**
   - 点击 "New" -> "Web Service"
   - 连接你的 GitHub/GitLab 仓库

3. **配置服务**
   - **Name**: `bowl-yjs-server`
   - **Region**: 选择离你最近的区域（如 Singapore）
   - **Root Directory**: `server`（如果是单独仓库则留空）
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

4. **环境变量**
   - `NODE_ENV`: `production`
   - `HOST`: `0.0.0.0`

5. **部署**
   - 点击 "Create Web Service"
   - 等待部署完成

### 方式二：使用 render.yaml（推荐）

1. 确保 `render.yaml` 文件在仓库根目录（或 server 目录）
2. 在 Render Dashboard 选择 "Blueprint" 部署
3. 选择包含 `render.yaml` 的仓库

## 客户端连接

部署成功后，你会获得一个类似这样的 URL：
```
https://bowl-yjs-server.onrender.com
```

在客户端代码中更新 WebSocket 连接地址：

```typescript
// 注意：Render 提供 HTTPS，所以使用 wss://（而不是 ws://）
const websocketUrl = 'wss://bowl-yjs-server.onrender.com';

const { blocks, dispatch, connected } = useYjs({
  initialBlocks,
  websocketUrl,
  roomName: 'my-document',
});
```

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | `1234` | 服务器端口（Render 会自动设置） |
| `HOST` | `0.0.0.0` | 监听地址 |

## 注意事项

1. **免费计划限制**
   - Render 免费计划的服务在 15 分钟无活动后会休眠
   - 首次请求可能需要 30-60 秒唤醒
   - 如需 24/7 运行，请升级到付费计划

2. **数据持久化**
   - 当前版本使用内存存储，服务重启后数据会丢失
   - 如需持久化，可以添加数据库支持（如 Redis、MongoDB）

3. **CORS**
   - WebSocket 不受 CORS 限制，但如果需要 HTTP API，需要配置 CORS

## 健康检查

服务器提供健康检查端点：

```bash
curl https://bowl-yjs-server.onrender.com/health
```

返回：
```json
{
  "status": "ok",
  "service": "bowl-yjs-server",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```


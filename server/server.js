/**
 * Y-WebSocket Server for Bowl Editor
 * 
 * 这是一个用于 Bowl 编辑器协同编辑的 WebSocket 服务器
 * 支持 Render 部署，自动清理空闲房间
 */

import http from 'http';
import { WebSocketServer } from 'ws';

// 从 y-websocket 导入工具函数和文档管理
import { setupWSConnection, docs } from 'y-websocket/bin/utils';

// 配置
const PORT = process.env.PORT || 1234;
const HOST = process.env.HOST || '0.0.0.0';
// 房间空闲后延迟清理时间（毫秒），默认 30 秒
const CLEANUP_DELAY = parseInt(process.env.CLEANUP_DELAY) || 30000;
// 心跳检测间隔（毫秒），默认 30 秒
const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL) || 30000;

// 追踪每个房间的连接数
const roomConnections = new Map(); // docName -> Set<ws>
// 追踪清理定时器
const cleanupTimers = new Map(); // docName -> timeoutId

/**
 * 添加连接到房间
 */
function addConnection(docName, ws) {
  if (!roomConnections.has(docName)) {
    roomConnections.set(docName, new Set());
  }
  roomConnections.get(docName).add(ws);

  // 取消该房间的清理计划（如果有的话）
  if (cleanupTimers.has(docName)) {
    clearTimeout(cleanupTimers.get(docName));
    cleanupTimers.delete(docName);
    console.log(`[${timestamp()}] 取消清理计划: ${docName}`);
  }

  console.log(`[${timestamp()}] 房间 ${docName} 连接数: ${roomConnections.get(docName).size}`);
}

/**
 * 从房间移除连接
 */
function removeConnection(docName, ws) {
  const connections = roomConnections.get(docName);
  if (!connections) return;

  connections.delete(ws);
  const remainingCount = connections.size;

  console.log(`[${timestamp()}] 房间 ${docName} 剩余连接数: ${remainingCount}`);

  // 如果房间没有连接了，安排清理
  if (remainingCount === 0) {
    scheduleCleanup(docName);
  }
}

/**
 * 安排清理房间
 */
function scheduleCleanup(docName) {
  console.log(`[${timestamp()}] 安排 ${CLEANUP_DELAY}ms 后清理房间: ${docName}`);

  const timerId = setTimeout(() => {
    cleanupRoom(docName);
  }, CLEANUP_DELAY);

  cleanupTimers.set(docName, timerId);
}

/**
 * 清理房间
 */
function cleanupRoom(docName) {
  // 再次检查是否真的没有连接
  const connections = roomConnections.get(docName);
  if (connections && connections.size > 0) {
    console.log(`[${timestamp()}] 取消清理，房间仍有连接: ${docName}`);
    return;
  }

  // 清理 y-websocket 的文档
  const doc = docs.get(docName);
  if (doc) {
    doc.destroy();
    docs.delete(docName);
    console.log(`[${timestamp()}] ✅ 已清理房间文档: ${docName}`);
  }

  // 清理连接追踪
  roomConnections.delete(docName);
  cleanupTimers.delete(docName);

  logStats();
}

/**
 * 获取时间戳
 */
function timestamp() {
  return new Date().toISOString();
}

/**
 * 输出统计信息
 */
function logStats() {
  const totalRooms = docs.size;
  let totalConnections = 0;
  for (const conns of roomConnections.values()) {
    totalConnections += conns.size;
  }
  console.log(`[${timestamp()}] 📊 统计: ${totalRooms} 个房间, ${totalConnections} 个连接`);
}

// 创建 HTTP 服务器
const server = http.createServer((req, res) => {
  // 健康检查端点 - Render 需要这个来检测服务是否正常
  if (req.url === '/health' || req.url === '/') {
    let totalConnections = 0;
    for (const conns of roomConnections.values()) {
      totalConnections += conns.size;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'bowl-yjs-server',
      timestamp: new Date().toISOString(),
      stats: {
        rooms: docs.size,
        connections: totalConnections
      }
    }));
    return;
  }

  // 统计端点
  if (req.url === '/stats') {
    const roomStats = [];
    for (const [name, conns] of roomConnections.entries()) {
      roomStats.push({ room: name, connections: conns.size });
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      rooms: roomStats,
      pendingCleanups: cleanupTimers.size
    }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

// 创建 WebSocket 服务器
const wss = new WebSocketServer({ server });

// WebSocket 连接处理
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const docName = url.pathname.slice(1) || 'default';

  console.log(`[${timestamp()}] 新连接: ${docName}`);

  // 心跳检测：标记连接为活跃
  ws.isAlive = true;
  ws.docName = docName;

  // 收到 pong 时标记为活跃
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // 追踪连接
  addConnection(docName, ws);

  // 使用 y-websocket 的 setupWSConnection 处理连接
  setupWSConnection(ws, req, {
    docName,
    gc: true, // 启用垃圾回收
  });

  // 连接关闭时清理
  ws.on('close', () => {
    console.log(`[${timestamp()}] 连接关闭: ${docName}`);
    removeConnection(docName, ws);
  });

  // 错误处理
  ws.on('error', (error) => {
    console.error(`[${timestamp()}] WebSocket 错误 (${docName}):`, error.message);
    removeConnection(docName, ws);
  });
});

// 心跳检测定时器
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      // 上次 ping 后没有收到 pong，认为连接已断开
      console.log(`[${timestamp()}] 💔 心跳超时，断开连接: ${ws.docName || 'unknown'}`);
      return ws.terminate();
    }

    // 标记为非活跃，等待 pong 响应
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);

// 服务器关闭时清理心跳定时器
wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// 启动服务器
server.listen(PORT, HOST, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║         Bowl Y-WebSocket Server Started                   ║
╠═══════════════════════════════════════════════════════════╣
║  🚀 Server running on: http://${HOST}:${PORT}                ║
║  📡 WebSocket endpoint: ws://${HOST}:${PORT}                 ║
║  💚 Health check: http://${HOST}:${PORT}/health              ║
║  📊 Stats: http://${HOST}:${PORT}/stats                      ║
║  🧹 Auto cleanup: ${CLEANUP_DELAY}ms after room empty         ║
║  💓 Heartbeat interval: ${HEARTBEAT_INTERVAL}ms                ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// 优雅关闭
function gracefulShutdown() {
  console.log('\n正在关闭服务器...');

  // 清理心跳定时器
  clearInterval(heartbeatInterval);

  // 清理所有房间清理定时器
  for (const timerId of cleanupTimers.values()) {
    clearTimeout(timerId);
  }

  wss.close(() => {
    server.close(() => {
      console.log('服务器已关闭');
      process.exit(0);
    });
  });
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

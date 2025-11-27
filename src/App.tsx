import { useMemo } from "react";
import "./App.css";
import PageBlock from "./blocks/page";
import type { Block } from "./types/blocks";
import { v4 as uuidv4 } from 'uuid';
import { useYjs } from "./hooks/useYjs";

// WebSocket 服务器配置
// 生产环境使用 Render 部署的服务，开发环境使用本地服务
const WEBSOCKET_URL = import.meta.env.PROD
  ? 'wss://bowl-yjs.onrender.com'  // 生产环境（注意是 wss://）
  : 'ws://localhost:1234';          // 开发环境

// 从 URL 参数获取房间名，如果没有则生成一个新的
function getRoomFromUrl(): string {
  const params = new URLSearchParams(window.location.search);
  let room = params.get('room');

  if (!room) {
    // 生成一个新的房间名并更新 URL
    room = `room-${uuidv4().slice(0, 8)}`;
    const newUrl = `${window.location.pathname}?room=${room}`;
    window.history.replaceState({}, '', newUrl);
  }

  return room;
}

// 初始数据：一个空的 paragraph（只在新房间时使用）
const initialBlocks: Block[] = [
  {
    type: "paragraph",
    id: uuidv4(),
    content: [{
      type: "element",
      tag: "p",
      children: [
        { type: "text", value: "" },
      ],
    }],
  },
];

function App() {
  // 从 URL 获取房间名（只在首次渲染时获取）
  const roomName = useMemo(() => getRoomFromUrl(), []);

  // 使用 yjs hook 管理数据，启用 WebSocket 协同
  const { blocks, doc, dispatch, connected } = useYjs({
    initialBlocks,
    websocketUrl: WEBSOCKET_URL,
    roomName,
  });

  // doc 可以用于协同编辑，传递给 WebSocket provider 等
  console.log('Y.Doc:', doc);

  return (
    <div className="App">
      <div className="connection-status" style={{
        position: 'fixed',
        top: 10,
        right: 10,
        padding: '8px 16px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 500,
        backgroundColor: connected ? '#10b981' : '#ef4444',
        color: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}>
        {connected ? '🟢 已连接' : '🔴 未连接'} | 房间: {roomName}
      </div>
      <PageBlock blocks={blocks} dispatch={dispatch} />
    </div>
  );
}

export default App;

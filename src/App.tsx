import { useState } from "react";
import "./App.css";
import PageBlock from "./blocks/page";
import Landing from "./pages/Landing";
import type { Block } from "./types/blocks";
import { v4 as uuidv4 } from 'uuid';
import { useYjs } from "./hooks/useYjs";

// 固定的房间 ID
const ROOM_ID = 'bowl-playground';

// 从 localStorage 获取保存的用户名
function getSavedUserName(): string {
  const saved = localStorage.getItem('bowl-user-name');
  // 如果是旧的中文格式，重新生成英文名
  if (saved && !saved.startsWith('用户')) return saved;
  // 生成一个随机昵称
  const randomName = `User${Math.floor(Math.random() * 10000)}`;
  localStorage.setItem('bowl-user-name', randomName);
  return randomName;
}

// WebSocket 服务器配置
// 生产环境使用 Render 部署的服务，开发环境使用本地服务
const WEBSOCKET_URL = import.meta.env.PROD
  ? 'wss://bowl-yjs.onrender.com'  // 生产环境（注意是 wss://）
  : 'ws://localhost:1234';          // 开发环境

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
  // 用户昵称状态
  const [userName] = useState(() => getSavedUserName());

  // 使用 yjs hook 管理数据，启用 WebSocket 协同
  const { blocks, dispatch, connected, users, remoteCursors, setFocusedBlock } = useYjs({
    initialBlocks,
    websocketUrl: WEBSOCKET_URL,
    roomName: ROOM_ID,
    userName,
  });

  // 编辑器组件
  const editorComponent = (
    <PageBlock
      blocks={blocks}
      dispatch={dispatch}
      remoteCursors={remoteCursors}
      onBlockFocus={setFocusedBlock}
    />
  );

  return (
    <Landing
      editor={editorComponent}
      connected={connected}
      userCount={users.length}
    />
  );
}

export default App;

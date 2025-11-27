import { useMemo, useState, useEffect } from "react";
import "./App.css";
import PageBlock from "./blocks/page";
import type { Block } from "./types/blocks";
import { v4 as uuidv4 } from 'uuid';
import { useYjs } from "./hooks/useYjs";

// 从 localStorage 获取保存的用户名
function getSavedUserName(): string {
  const saved = localStorage.getItem('bowl-user-name');
  if (saved) return saved;
  // 生成一个随机昵称
  const randomName = `用户${Math.floor(Math.random() * 10000)}`;
  localStorage.setItem('bowl-user-name', randomName);
  return randomName;
}

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

  // 用户昵称状态
  const [userName, setUserNameState] = useState(() => getSavedUserName());
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);

  // 使用 yjs hook 管理数据，启用 WebSocket 协同
  const { blocks, doc, dispatch, connected, users, currentUser, setUserName } = useYjs({
    initialBlocks,
    websocketUrl: WEBSOCKET_URL,
    roomName,
    userName,
  });

  // 当用户名改变时同步到 yjs
  useEffect(() => {
    setUserName(userName);
  }, [userName, setUserName]);

  // 保存昵称
  const handleSaveName = () => {
    const newName = tempName.trim() || '匿名用户';
    setUserNameState(newName);
    localStorage.setItem('bowl-user-name', newName);
    setIsEditingName(false);
  };

  // doc 可以用于协同编辑，传递给 WebSocket provider 等
  console.log('Y.Doc:', doc);

  return (
    <div className="App">
      {/* 顶部状态栏 */}
      <div style={{
        position: 'fixed',
        top: 10,
        right: 10,
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
        zIndex: 1000,
      }}>
        {/* 在线用户 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: '8px 12px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
          fontSize: 13,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 6, color: '#374151' }}>
            👥 在线 ({users.length})
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 200 }}>
            {users.map((user) => (
              <div
                key={user.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: 12,
                  backgroundColor: user.color + '20',
                  border: `1px solid ${user.color}`,
                  fontSize: 12,
                }}
                title={user.id === currentUser?.id ? '我' : user.name}
              >
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: user.color,
                }} />
                <span style={{
                  color: '#374151',
                  maxWidth: 80,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {user.id === currentUser?.id ? `${user.name} (我)` : user.name}
                </span>
              </div>
            ))}
          </div>

          {/* 修改昵称 */}
          <div style={{ marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
            {isEditingName ? (
              <div style={{ display: 'flex', gap: 4 }}>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid #d1d5db',
                    fontSize: 12,
                    outline: 'none',
                  }}
                  autoFocus
                  placeholder="输入昵称"
                />
                <button
                  onClick={handleSaveName}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: 'none',
                    backgroundColor: '#10b981',
                    color: 'white',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  保存
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setTempName(userName);
                  setIsEditingName(true);
                }}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  fontSize: 12,
                  cursor: 'pointer',
                  color: '#6b7280',
                }}
              >
                ✏️ 修改昵称
              </button>
            )}
          </div>
        </div>

        {/* 连接状态 */}
        <div style={{
          padding: '8px 16px',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 500,
          backgroundColor: connected ? '#10b981' : '#ef4444',
          color: 'white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          {connected ? '🟢 已连接' : '🔴 未连接'}
        </div>
      </div>

      {/* 房间信息 */}
      <div style={{
        position: 'fixed',
        top: 10,
        left: 10,
        padding: '8px 12px',
        borderRadius: 8,
        fontSize: 12,
        backgroundColor: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        color: '#6b7280',
      }}>
        🏠 房间: <span style={{ color: '#374151', fontWeight: 500 }}>{roomName}</span>
      </div>

      <PageBlock blocks={blocks} dispatch={dispatch} />
    </div>
  );
}

export default App;

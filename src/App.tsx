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
        top: 0,
        left: 0,
        right: 0,
        height: 40,
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 1000,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        {/* 左侧：房间信息 */}
        <div style={{
          fontSize: 13,
          color: '#6b7280',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span>🏠</span>
          <span style={{ color: '#374151', fontWeight: 500 }}>{roomName}</span>
          <span style={{
            padding: '2px 8px',
            borderRadius: 10,
            fontSize: 11,
            backgroundColor: connected ? '#d1fae5' : '#fee2e2',
            color: connected ? '#065f46' : '#991b1b',
          }}>
            {connected ? '已连接' : '未连接'}
          </span>
        </div>

        {/* 右侧：在线用户 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          {/* 用户头像列表 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#6b7280', marginRight: 4 }}>
              👥 {users.length}
            </span>
            {users.slice(0, 5).map((user, index) => (
              <div
                key={user.id}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  backgroundColor: user.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  color: 'white',
                  fontWeight: 600,
                  marginLeft: index > 0 ? -8 : 0,
                  border: '2px solid white',
                  cursor: 'pointer',
                }}
                title={user.id === currentUser?.id ? `${user.name} (我)` : user.name}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {users.length > 5 && (
              <div style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                backgroundColor: '#9ca3af',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                color: 'white',
                fontWeight: 600,
                marginLeft: -8,
                border: '2px solid white',
              }}>
                +{users.length - 5}
              </div>
            )}
          </div>

          {/* 分隔线 */}
          <div style={{ width: 1, height: 20, backgroundColor: '#e5e7eb' }} />

          {/* 修改昵称 */}
          {isEditingName ? (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                style={{
                  width: 100,
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
                  padding: '4px 10px',
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
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid #e5e7eb',
                backgroundColor: 'white',
                fontSize: 12,
                cursor: 'pointer',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                backgroundColor: currentUser?.color || '#9ca3af',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                color: 'white',
                fontWeight: 600,
              }}>
                {userName.charAt(0).toUpperCase()}
              </span>
              {userName}
            </button>
          )}
        </div>
      </div>

      <PageBlock blocks={blocks} dispatch={dispatch} />
    </div>
  );
}

export default App;

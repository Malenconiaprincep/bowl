import { useState, useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { Block } from '../types/blocks';
import {
  createYDocWithBlocks,
  yDocToBlocks,
  updateBlockInYDoc,
  addBlockToYDoc,
  removeBlockFromYDoc,
} from '../utils/yjsConverter';

/** 用户信息 */
export interface UserInfo {
  id: number;
  name: string;
  color: string;
}

/** 远程用户光标信息 */
export interface RemoteCursor {
  userId: number;
  userName: string;
  userColor: string;
  blockId: string;
  /** 光标在文本中的偏移位置 */
  offset?: number;
}

export interface UseYjsOptions {
  initialBlocks?: Block[];
  doc?: Y.Doc;
  /** WebSocket 服务器地址，例如 'ws://localhost:1234' */
  websocketUrl?: string;
  /** 房间名称，同一房间的用户可以协同编辑 */
  roomName?: string;
  /** 当前用户昵称 */
  userName?: string;
}

// 统一的 Block 操作 Action 类型
export type BlockAction =
  | { type: 'update'; blockId: string; updater: (block: Block) => Block }
  | { type: 'add'; block: Block; index?: number }
  | { type: 'remove'; blockId: string }
  | { type: 'set'; blocks: Block[] };

export interface UseYjsReturn {
  doc: Y.Doc;
  blocks: Block[];
  dispatch: (action: BlockAction) => void;
  /** WebSocket Provider 实例，如果启用了 WebSocket */
  provider: WebsocketProvider | null;
  /** 连接状态 */
  connected: boolean;
  /** 在线用户列表 */
  users: UserInfo[];
  /** 当前用户信息 */
  currentUser: UserInfo | null;
  /** 更新当前用户昵称 */
  setUserName: (name: string) => void;
  /** 远程用户的光标位置 */
  remoteCursors: RemoteCursor[];
  /** 设置当前用户聚焦的 block 和光标位置 */
  setFocusedBlock: (blockId: string | null, offset?: number) => void;
}

// 随机生成用户颜色
const USER_COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80',
  '#34d399', '#2dd4bf', '#22d3ee', '#38bdf8', '#60a5fa',
  '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6',
];

function getRandomColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

/**
 * 使用 yjs 管理 blocks 状态的 Hook
 */
export function useYjs(options: UseYjsOptions = {}): UseYjsReturn {
  const { initialBlocks = [], doc: externalDoc, websocketUrl, roomName = 'bowl-room', userName = '匿名用户' } = options;

  // 使用 ref 保存 doc，避免重复创建
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const initializedRef = useRef(false);
  const userColorRef = useRef<string>(getRandomColor());
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);

  if (!docRef.current) {
    // 如果使用 WebSocket，先创建空文档，等同步后再决定是否添加初始内容
    // 否则直接用 initialBlocks 创建
    docRef.current = externalDoc || (websocketUrl ? new Y.Doc() : createYDocWithBlocks(initialBlocks));
  }

  const doc = docRef.current;

  // 初始化 WebSocket Provider
  useEffect(() => {
    if (!websocketUrl) return;

    // 创建 WebSocket Provider
    const provider = new WebsocketProvider(websocketUrl, roomName, doc);
    providerRef.current = provider;

    // 设置当前用户的 awareness 信息
    const awareness = provider.awareness;
    const localUser: UserInfo = {
      id: awareness.clientID,
      name: userName,
      color: userColorRef.current,
    };
    awareness.setLocalStateField('user', localUser);
    setCurrentUser(localUser);

    // 更新用户列表和远程光标的函数
    const updateUsersAndCursors = () => {
      const states = awareness.getStates();
      const userList: UserInfo[] = [];
      const cursorList: RemoteCursor[] = [];
      const localClientId = awareness.clientID;

      states.forEach((state, clientId) => {
        if (state.user) {
          userList.push({
            id: clientId,
            name: state.user.name || '匿名用户',
            color: state.user.color || '#888',
          });

          // 收集远程用户的光标位置（排除自己）
          if (clientId !== localClientId && state.cursor?.blockId) {
            cursorList.push({
              userId: clientId,
              userName: state.user.name || '匿名用户',
              userColor: state.user.color || '#888',
              blockId: state.cursor.blockId,
              offset: state.cursor.offset,
            });
          }
        }
      });
      setUsers(userList);
      setRemoteCursors(cursorList);
    };

    // 监听 awareness 变化
    awareness.on('change', updateUsersAndCursors);
    // 初始化用户列表和光标
    updateUsersAndCursors();

    // 监听连接状态
    provider.on('status', (event: { status: string }) => {
      setConnected(event.status === 'connected');
    });

    // 监听同步完成，如果文档为空则添加初始内容
    provider.on('sync', (isSynced: boolean) => {
      if (isSynced && !initializedRef.current) {
        initializedRef.current = true;
        const yBlocks = doc.getArray<Y.Map<unknown>>('blocks');
        // 只有当文档为空时才添加初始内容
        if (yBlocks.length === 0 && initialBlocks.length > 0) {
          initialBlocks.forEach(block => {
            addBlockToYDoc(doc, block);
          });
        }
      }
    });

    return () => {
      awareness.off('change', updateUsersAndCursors);
      provider.destroy();
      providerRef.current = null;
      setConnected(false);
      setUsers([]);
      setRemoteCursors([]);
    };
  }, [websocketUrl, roomName, doc, initialBlocks, userName]);

  // 使用 state 保存当前 blocks
  const [blocks, setBlocksState] = useState<Block[]>(() => yDocToBlocks(doc));

  // 监听 Y.Doc 变化
  useEffect(() => {
    const yBlocks = doc.getArray<Y.Map<unknown>>('blocks');

    const observer = () => {
      const newBlocks = yDocToBlocks(doc);
      setBlocksState(newBlocks);
    };

    yBlocks.observeDeep(observer);

    return () => {
      yBlocks.unobserveDeep(observer);
    };
  }, [doc]);

  // 统一的 dispatch 方法
  const dispatch = useCallback(
    (action: BlockAction) => {
      switch (action.type) {
        case 'update':
          updateBlockInYDoc(doc, action.blockId, action.updater);
          break;
        case 'add':
          addBlockToYDoc(doc, action.block, action.index);
          break;
        case 'remove':
          removeBlockFromYDoc(doc, action.blockId);
          break;
        case 'set': {
          const yBlocks = doc.getArray<Y.Map<unknown>>('blocks');
          doc.transact(() => {
            yBlocks.delete(0, yBlocks.length);
            action.blocks.forEach(block => {
              addBlockToYDoc(doc, block);
            });
          });
          break;
        }
      }
    },
    [doc]
  );

  // 更新用户昵称
  const setUserName = useCallback((name: string) => {
    const provider = providerRef.current;
    if (!provider) return;

    const newUser: UserInfo = {
      id: provider.awareness.clientID,
      name,
      color: userColorRef.current,
    };
    provider.awareness.setLocalStateField('user', newUser);
    setCurrentUser(newUser);
  }, []);

  // 设置当前用户聚焦的 block 和光标位置
  const setFocusedBlock = useCallback((blockId: string | null, offset?: number) => {
    const provider = providerRef.current;
    if (!provider) return;

    provider.awareness.setLocalStateField('cursor', blockId ? { blockId, offset } : null);
  }, []);

  return {
    doc,
    blocks,
    dispatch,
    provider: providerRef.current,
    connected,
    users,
    currentUser,
    setUserName,
    remoteCursors,
    setFocusedBlock,
  };
}

export default useYjs;


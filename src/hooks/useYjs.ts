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

export interface UseYjsOptions {
  initialBlocks?: Block[];
  doc?: Y.Doc;
  /** WebSocket 服务器地址，例如 'ws://localhost:1234' */
  websocketUrl?: string;
  /** 房间名称，同一房间的用户可以协同编辑 */
  roomName?: string;
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
}

/**
 * 使用 yjs 管理 blocks 状态的 Hook
 */
export function useYjs(options: UseYjsOptions = {}): UseYjsReturn {
  const { initialBlocks = [], doc: externalDoc, websocketUrl, roomName = 'bowl-room' } = options;

  // 使用 ref 保存 doc，避免重复创建
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const initializedRef = useRef(false);
  const [connected, setConnected] = useState(false);

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
      provider.destroy();
      providerRef.current = null;
      setConnected(false);
    };
  }, [websocketUrl, roomName, doc, initialBlocks]);

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

  return {
    doc,
    blocks,
    dispatch,
    provider: providerRef.current,
    connected,
  };
}

export default useYjs;


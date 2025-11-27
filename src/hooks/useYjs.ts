import { useState, useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
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
}

/**
 * 使用 yjs 管理 blocks 状态的 Hook
 */
export function useYjs(options: UseYjsOptions = {}): UseYjsReturn {
  const { initialBlocks = [], doc: externalDoc } = options;

  // 使用 ref 保存 doc，避免重复创建
  const docRef = useRef<Y.Doc | null>(null);

  if (!docRef.current) {
    docRef.current = externalDoc || createYDocWithBlocks(initialBlocks);
  }

  const doc = docRef.current;

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
  };
}

export default useYjs;


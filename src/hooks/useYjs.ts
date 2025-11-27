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

export interface UseYjsReturn {
  doc: Y.Doc;
  blocks: Block[];
  updateBlock: (blockId: string, updater: (block: Block) => Block) => void;
  addBlock: (block: Block, index?: number) => void;
  removeBlock: (blockId: string) => void;
  setBlocks: (blocks: Block[]) => void;
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

  // 更新单个 block
  const updateBlock = useCallback(
    (blockId: string, updater: (block: Block) => Block) => {
      updateBlockInYDoc(doc, blockId, updater);
    },
    [doc]
  );

  // 添加 block
  const addBlock = useCallback(
    (block: Block, index?: number) => {
      addBlockToYDoc(doc, block, index);
    },
    [doc]
  );

  // 删除 block
  const removeBlock = useCallback(
    (blockId: string) => {
      removeBlockFromYDoc(doc, blockId);
    },
    [doc]
  );

  // 批量设置 blocks（会清空现有数据）
  const setBlocks = useCallback(
    (newBlocks: Block[]) => {
      const yBlocks = doc.getArray<Y.Map<unknown>>('blocks');
      doc.transact(() => {
        yBlocks.delete(0, yBlocks.length);
        newBlocks.forEach(block => {
          addBlockToYDoc(doc, block);
        });
      });
    },
    [doc]
  );

  return {
    doc,
    blocks,
    updateBlock,
    addBlock,
    removeBlock,
    setBlocks,
  };
}

export default useYjs;


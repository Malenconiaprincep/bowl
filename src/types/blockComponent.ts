import type { Block } from './blocks';

/**
 * Block 组件的基础接口
 * 所有 block 组件都应该实现这个接口
 */
export interface BlockComponentProps {
  block: Block;
  blockIndex: number;
  onInsertBlock?: (blockIndex: number, newBlock: Block) => void;
  onUpdateBlock?: (blockIndex: number, newContent: unknown[]) => void;
}

/**
 * Block 组件的方法接口
 * 所有 block 组件都应该暴露这些方法
 */
export interface BlockComponentMethods {
  focus: () => void;
  blur: () => void;
  getElement: () => HTMLElement | null;
}

/**
 * 带方法的 Block 组件类型
 */
export type BlockComponentWithMethods = React.ComponentType<BlockComponentProps> & {
  focus?: () => void;
  blur?: () => void;
  getElement?: () => HTMLElement | null;
};

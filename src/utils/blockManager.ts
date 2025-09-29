import type { Block } from '../types/blocks';

/**
 * Block 实例接口
 */
export interface BlockInstance {
  id: string;
  block: Block;
  element?: HTMLElement;
  component?: React.ComponentType<Record<string, unknown>>;
}

/**
 * BlockManager 类 - 管理所有 block 实例
 */
export class BlockManager {
  private blocks: Map<string, BlockInstance> = new Map();

  /**
   * 直接注册 BlockInstance
   * @param blockInstance - 完整的 block 实例
   */
  registerBlockInstance(blockInstance: BlockInstance): void {
    this.blocks.set(blockInstance.id, blockInstance);
  }

  /**
   * 获取 block 实例
   * @param blockId - block ID
   * @returns block 实例或 undefined
   */
  getBlock(blockId: string): BlockInstance | undefined {
    return this.blocks.get(blockId);
  }

  /**
   * 获取所有 block 实例
   * @returns 所有 block 实例的数组
   */
  getAllBlocks(): BlockInstance[] {
    return Array.from(this.blocks.values());
  }

  /**
   * 更新 block 实例
   * @param blockId - block ID
   * @param updates - 要更新的属性
   */
  updateBlock(blockId: string, updates: Partial<BlockInstance>): void {
    const existing = this.blocks.get(blockId);
    if (existing) {
      this.blocks.set(blockId, { ...existing, ...updates });
    }
  }

  /**
   * 删除 block 实例
   * @param blockId - block ID
   * @returns 是否删除成功
   */
  removeBlock(blockId: string): boolean {
    return this.blocks.delete(blockId);
  }

  /**
   * 检查 block 是否存在
   * @param blockId - block ID
   * @returns 是否存在
   */
  hasBlock(blockId: string): boolean {
    return this.blocks.has(blockId);
  }
}

// 创建全局 BlockManager 实例
export const blockManager = new BlockManager();

// @ts-expect-error - 全局变量
(window as Window).blockManager = blockManager;

// 导出类型已在接口声明中导出

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
  private waitingCallbacks: Map<string, Array<(instance: BlockInstance) => void>> = new Map();

  /**
   * 直接注册 BlockInstance
   * @param blockInstance - 完整的 block 实例
   */
  registerBlockInstance(blockInstance: BlockInstance): void {
    this.blocks.set(blockInstance.id, blockInstance);

    // 触发等待中的回调
    const callbacks = this.waitingCallbacks.get(blockInstance.id);
    if (callbacks) {
      callbacks.forEach(cb => cb(blockInstance));
      this.waitingCallbacks.delete(blockInstance.id);
    }
  }

  /**
   * 等待 block 实例准备好
   * @param blockId - block ID
   * @param timeout - 超时时间（毫秒），默认 2000
   * @returns Promise<BlockInstance>
   */
  waitForBlock(blockId: string, timeout = 2000): Promise<BlockInstance> {
    return new Promise((resolve, reject) => {
      // 如果已经存在，直接返回
      const existing = this.blocks.get(blockId);
      if (existing?.component) {
        resolve(existing);
        return;
      }

      // 设置超时
      const timer = setTimeout(() => {
        const callbacks = this.waitingCallbacks.get(blockId);
        if (callbacks) {
          const index = callbacks.indexOf(callback);
          if (index > -1) callbacks.splice(index, 1);
          if (callbacks.length === 0) this.waitingCallbacks.delete(blockId);
        }
        reject(new Error(`等待 block ${blockId} 超时`));
      }, timeout);

      // 添加回调
      const callback = (instance: BlockInstance) => {
        clearTimeout(timer);
        resolve(instance);
      };

      const callbacks = this.waitingCallbacks.get(blockId) || [];
      callbacks.push(callback);
      this.waitingCallbacks.set(blockId, callbacks);
    });
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

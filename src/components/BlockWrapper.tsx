import React, { useEffect, useRef } from 'react';
import { blockManager, type BlockInstance } from '../utils/blockManager';
import type { Block } from '../types/blocks';
import type { BlockComponentMethods } from '../types/blockComponent';

/**
 * 高阶组件 - 自动注册 block 到 BlockManager 并添加聚焦方法
 * @param WrappedComponent - 被包裹的组件
 * @returns 增强后的组件
 */
export function BlockWrapper<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const BlockWrapperComponent = React.forwardRef<BlockComponentMethods, P & { block: Block }>((props, _ref) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const componentRef = useRef<BlockComponentMethods>(null);

    // 自动注册 block 到 BlockManager
    useEffect(() => {
      const { block } = props;

      if (block.id && elementRef.current && componentRef.current) {
        // 创建 BlockInstance 对象
        const blockInstance: BlockInstance = {
          id: block.id,
          block: block,
          element: elementRef.current,
          component: componentRef.current as unknown as React.ComponentType<Record<string, unknown>>
        };

        // 注册 block 实例
        blockManager.registerBlockInstance(blockInstance);
      }

      // 清理函数：组件卸载时移除 block
      return () => {
        if (block.id) {
          blockManager.removeBlock(block.id);
        }
      };
    }, [props.block.id]);

    return (
      <div ref={elementRef} data-block-id={props.block.id}>
        <WrappedComponent
          {...(props as P)}
          ref={componentRef}
        />
      </div>
    );
  });

  // 设置显示名称以便调试
  BlockWrapperComponent.displayName = `BlockWrapper(${WrappedComponent.displayName || WrappedComponent.name})`;

  return BlockWrapperComponent;
}

export default BlockWrapper;

import React, { useEffect, useRef } from 'react';
import { blockManager } from '../utils/blockManager';
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
  const BlockWrapperComponent = React.forwardRef<BlockComponentMethods, P & { block: Block }>((props, ref) => {
    const elementRef = useRef<HTMLDivElement>(null);
    const componentRef = useRef<BlockComponentMethods>(null);

    // 暴露聚焦方法给父组件
    React.useImperativeHandle(ref, () => ({
      focus: () => {
        componentRef.current?.focus();
      },
      blur: () => {
        componentRef.current?.blur();
      },
      getElement: () => {
        return elementRef.current;
      }
    }));

    // 自动注册 block 到 BlockManager
    useEffect(() => {
      const { block } = props;

      if (block.id && elementRef.current) {
        // 创建一个包装的组件，包含聚焦方法
        const BlockComponentWithMethods = {
          focus: () => componentRef.current?.focus(),
          blur: () => componentRef.current?.blur(),
          getElement: () => elementRef.current
        } as unknown as React.ComponentType<Record<string, unknown>>;

        // 注册或更新 block，传递包装后的组件引用
        blockManager.registerBlock(
          block.id,
          block,
          elementRef.current,
          BlockComponentWithMethods
        );
      }

      // 清理函数：组件卸载时移除 block
      return () => {
        if (block.id) {
          blockManager.removeBlock(block.id);
        }
      };
    }, [props.block.id, props.block, props]);

    return (
      <div ref={elementRef} data-block-id={props.block.id}>
        <WrappedComponent
          {...(props as P)}
        />
      </div>
    );
  });

  // 设置显示名称以便调试
  BlockWrapperComponent.displayName = `BlockWrapper(${WrappedComponent.displayName || WrappedComponent.name})`;

  return BlockWrapperComponent;
}

export default BlockWrapper;

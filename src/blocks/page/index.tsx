import { useState, useCallback } from 'react'
import type { Block } from '../../types/blocks'
import type { ASTNode } from '../../types/ast'
import BlockComponent from '../../components/BlockComponent'
import { blockManager } from '../../utils/blockManager'
import type { TextMethods } from '../text'

interface PageBlockProps {
  initialBlocks: Block[]
}

export default function PageBlock({ initialBlocks }: PageBlockProps) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks)

  // 聚焦到指定 block 的辅助函数
  const focusBlock = useCallback((blockId: string) => {
    const blockInstance = blockManager.getBlock(blockId)
    if (blockInstance?.component) {
      const component = blockInstance.component as unknown as TextMethods
      component.focus?.()
      component.setSelection?.({ start: 0, end: 0 })
    }
  }, [])

  // 插入新块的方法
  const insertBlock = useCallback((blockIndex: number, newBlock: Block) => {
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks]
      newBlocks.splice(blockIndex + 1, 0, newBlock)
      return newBlocks
    })

    // 使用 requestAnimationFrame 确保在下一个渲染周期执行
    requestAnimationFrame(() => {
      focusBlock(newBlock.id)
    })
  }, [focusBlock])

  // 更新块的方法
  const updateBlock = useCallback((blockIndex: number, newContent: ASTNode[]) => {
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks]
      if (newBlocks[blockIndex] && newBlocks[blockIndex].type === 'paragraph') {
        const updatedBlock = {
          ...newBlocks[blockIndex],
          content: newContent
        };
        newBlocks[blockIndex] = updatedBlock;
      }
      return newBlocks
    })
  }, [])

  return (
    <div>
      {blocks.map((block, index) => (
        <BlockComponent
          key={index}
          block={block}
          blockIndex={index}
          onInsertBlock={insertBlock}
          onUpdateBlock={updateBlock}
        />
      ))}
    </div>
  )
}

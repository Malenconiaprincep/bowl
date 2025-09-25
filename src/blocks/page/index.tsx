import { useState, useCallback } from 'react'
import type { Block } from '../../types/blocks'
import type { ASTNode } from '../../types/ast'
import BlockContainer from '../../components/BlockContainer'

interface PageBlockProps {
  initialBlocks: Block[]
}

export default function PageBlock({ initialBlocks }: PageBlockProps) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks)

  // 插入新块的方法
  const insertBlock = useCallback((blockIndex: number, newBlock: Block) => {
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks]
      newBlocks.splice(blockIndex + 1, 0, newBlock)
      return newBlocks
    })
  }, [])

  // 更新块的方法
  const updateBlock = useCallback((blockIndex: number, newContent: ASTNode[]) => {
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks]
      if (newBlocks[blockIndex] && newBlocks[blockIndex].type === 'paragraph') {
        newBlocks[blockIndex] = {
          ...newBlocks[blockIndex],
          content: newContent
        }
      }
      return newBlocks
    })
  }, [])


  return (
    <div>
      {blocks.map((block, index) => (
        <BlockContainer
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

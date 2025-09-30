import { useState, useCallback } from 'react'
import type { Block } from '../../types/blocks'
import type { ASTNode } from '../../types/ast'
import BlockComponent from '../../components/BlockComponent'
import { blockManager } from '../../utils/blockManager'
import { mergeASTContent } from '../../utils/textOperations'
import { calculateTextLength, findPreviousTextBlock, isTextBlock } from '../../utils/blockUtils'
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

  // 聚焦到指定 block 末尾的辅助函数
  const focusBlockAtEnd = useCallback((blockIndex: number) => {
    const block = blocks[blockIndex]
    if (block && isTextBlock(block)) {
      const blockInstance = blockManager.getBlock(block.id)
      if (blockInstance?.component) {
        const component = blockInstance.component as unknown as TextMethods
        component.focus?.()
        // 计算文本长度并设置光标到末尾
        const textLength = calculateTextLength(block.content as ASTNode[])
        component.setSelection?.({ start: textLength, end: textLength })
      }
    }
  }, [blocks])

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
      if (newBlocks[blockIndex] && isTextBlock(newBlocks[blockIndex])) {
        const updatedBlock = {
          ...newBlocks[blockIndex],
          content: newContent
        } as Block;
        newBlocks[blockIndex] = updatedBlock;
      }
      return newBlocks
    })
  }, [])

  // 删除块的方法
  const deleteBlock = useCallback((blockIndex: number) => {
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks]
      newBlocks.splice(blockIndex, 1)
      return newBlocks
    })
  }, [])



  // 合并当前block到上一个textBlock的方法
  const mergeWithPreviousBlock = useCallback((currentIndex: number, currentContent: ASTNode[]) => {
    const previousIndex = findPreviousTextBlock(blocks, currentIndex)
    if (previousIndex !== -1) {
      setBlocks(prevBlocks => {
        const newBlocks = [...prevBlocks]
        const previousBlock = newBlocks[previousIndex]
        const currentBlock = newBlocks[currentIndex]

        if (previousBlock && currentBlock &&
          isTextBlock(previousBlock) && isTextBlock(currentBlock)) {

          // 使用mergeASTContent函数合并内容
          const { mergedAST, newCursorPosition } = mergeASTContent(previousBlock.content as ASTNode[], currentContent)

          // 使用合并后的AST更新上一个block
          newBlocks[previousIndex] = {
            ...previousBlock,
            content: mergedAST
          } as Block

          // 删除当前block
          newBlocks.splice(currentIndex, 1)

          // 聚焦到合并后的位置
          setTimeout(() => {
            const block = newBlocks[previousIndex]
            if (block) {
              const blockInstance = blockManager.getBlock(block.id)
              if (blockInstance?.component) {
                const component = blockInstance.component as unknown as TextMethods
                component.focus?.()
                component.setSelection?.({ start: newCursorPosition, end: newCursorPosition })
              }
            }
          }, 0)
        }

        return newBlocks
      })
    }
  }, [blocks])

  // 包装 findPreviousTextBlock 以适配接口
  const wrappedFindPreviousTextBlock = useCallback((currentIndex: number) => {
    return findPreviousTextBlock(blocks, currentIndex)
  }, [blocks])

  return (
    <div>
      {blocks.map((block, index) => (
        <BlockComponent
          key={index}
          block={block}
          blockIndex={index}
          onInsertBlock={insertBlock}
          onUpdateBlock={updateBlock}
          onDeleteBlock={deleteBlock}
          onFindPreviousTextBlock={wrappedFindPreviousTextBlock}
          onFocusBlockAtEnd={focusBlockAtEnd}
          onMergeWithPreviousBlock={mergeWithPreviousBlock}
        />
      ))}
    </div>
  )
}

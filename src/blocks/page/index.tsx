import { useState, useCallback } from 'react'
import type { Block } from '../../types/blocks'
import type { ASTNode } from '../../types/ast'
import BlockComponent from '../../components/BlockComponent'
import { blockManager } from '../../utils/blockManager'
import { mergeASTContent } from '../../utils/textOperations'
import type { TextMethods } from '../text'

interface PageBlockProps {
  initialBlocks: Block[]
}

export default function PageBlock({ initialBlocks }: PageBlockProps) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks)

  // 计算AST中文本长度的辅助函数
  const calculateTextLength = useCallback((ast: ASTNode[]): number => {
    let length = 0
    for (const node of ast) {
      if (node.type === 'text') {
        length += node.value.length
      } else if (node.type === 'element') {
        length += calculateTextLength(node.children)
      }
    }
    return length
  }, [])

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
    if (block && (block.type === 'paragraph' || block.type === 'heading')) {
      const blockInstance = blockManager.getBlock(block.id)
      if (blockInstance?.component) {
        const component = blockInstance.component as unknown as TextMethods
        component.focus?.()
        // 计算文本长度并设置光标到末尾
        const textLength = calculateTextLength(block.content)
        component.setSelection?.({ start: textLength, end: textLength })
      }
    }
  }, [blocks, calculateTextLength])

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

  // 删除块的方法
  const deleteBlock = useCallback((blockIndex: number) => {
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks]
      newBlocks.splice(blockIndex, 1)
      return newBlocks
    })
  }, [])

  // 查找上一个textBlock的方法
  const findPreviousTextBlock = useCallback((currentIndex: number) => {
    for (let i = currentIndex - 1; i >= 0; i--) {
      const block = blocks[i]
      if (block && (block.type === 'paragraph' || block.type === 'heading')) {
        return i
      }
    }
    return -1
  }, [blocks])

  // 提取文本内容的辅助函数
  const extractTextContent = useCallback((ast: ASTNode[]): string => {
    let text = ''
    for (const node of ast) {
      if (node.type === 'text') {
        text += node.value
      } else if (node.type === 'element' && node.children) {
        text += extractTextContent(node.children)
      }
    }
    return text
  }, [])

  // 合并当前block到上一个textBlock的方法
  const mergeWithPreviousBlock = useCallback((currentIndex: number, currentContent: ASTNode[]) => {
    const previousIndex = findPreviousTextBlock(currentIndex)
    if (previousIndex !== -1) {
      setBlocks(prevBlocks => {
        const newBlocks = [...prevBlocks]
        const previousBlock = newBlocks[previousIndex]
        const currentBlock = newBlocks[currentIndex]

        if (previousBlock && currentBlock &&
          (previousBlock.type === 'paragraph' || previousBlock.type === 'heading') &&
          (currentBlock.type === 'paragraph' || currentBlock.type === 'heading')) {

          // 使用mergeASTContent函数合并内容
          const { mergedAST, newCursorPosition } = mergeASTContent(previousBlock.content, currentContent)

          // 使用合并后的AST更新上一个block
          newBlocks[previousIndex] = {
            ...previousBlock,
            content: mergedAST
          }

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
  }, [findPreviousTextBlock])

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
          onFindPreviousTextBlock={findPreviousTextBlock}
          onFocusBlockAtEnd={focusBlockAtEnd}
          onMergeWithPreviousBlock={mergeWithPreviousBlock}
        />
      ))}
    </div>
  )
}

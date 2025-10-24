import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import type { Block } from '../../types/blocks'
import type { ASTNode } from '../../types/ast'
import type { Selection } from '../../utils'
import BlockComponent from '../../components/BlockComponent'
import { AstEditorToolbar } from '../../components/editor/AstEditorToolbar'
import { blockManager } from '../../utils/blockManager'
import { selectionManager, type SelectionInfo } from '../../utils/selectionManager'
import { mergeASTContent } from '../../utils/textOperations'
import { calculateTextLength, findPreviousTextBlock, isTextBlock } from '../../utils/blockUtils'
import type { TextMethods } from '../text'
import './style.scss'

interface PageBlockProps {
  initialBlocks: Block[]
}

export default function PageBlock({ initialBlocks }: PageBlockProps) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks)
  const blocksRef = useRef(blocks)

  // 工具栏相关状态
  const [selectionInfo, setSelectionInfo] = useState<SelectionInfo | null>(null)
  const pendingSelection = useRef<Selection | null>(null)

  // 保持blocksRef与blocks同步
  blocksRef.current = blocks

  // 使用选区管理器
  useEffect(() => {
    const handleSelectionChange = (info: SelectionInfo | null) => {
      if (!info) {
        setSelectionInfo(null)
        return
      }

      // 从blocks中获取对应的AST
      const blockIndex = blocks.findIndex(block => block.id === info.blockId)
      if (blockIndex === -1) {
        setSelectionInfo(null)
        return
      }

      const block = blocks[blockIndex]
      if (!isTextBlock(block)) {
        setSelectionInfo(null)
        return
      }

      // 更新选区信息，包含实际的AST
      setSelectionInfo({
        ...info,
        ast: block.content as ASTNode[]
      })
    }

    // 注册选区管理器
    selectionManager.register({
      onSelectionChange: handleSelectionChange
    })

    return () => {
      selectionManager.unregister()
    }
  }, [blocks])

  // 处理 AST 更新
  const handleASTUpdate = useCallback((newAST: ASTNode[]) => {
    if (!selectionInfo) return

    const blockIndex = blocks.findIndex(block => block.id === selectionInfo.blockId)
    if (blockIndex === -1) return

    // 更新对应block的内容
    setBlocks(prevBlocks => {
      const newBlocks = [...prevBlocks]
      newBlocks[blockIndex] = {
        ...newBlocks[blockIndex],
        content: newAST
      } as Block
      return newBlocks
    })

    // 更新选区管理器中的AST信息
    selectionManager.updateSelectionInfo(selectionInfo.blockId, newAST)
  }, [selectionInfo, blocks])

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
    const currentBlocks = blocksRef.current
    const block = currentBlocks[blockIndex]
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
      // 使用更精确的更新策略，只更新变化的块
      const targetBlock = prevBlocks[blockIndex]
      if (!targetBlock || !isTextBlock(targetBlock)) {
        return prevBlocks
      }

      // 检查内容是否真的发生了变化
      const currentContent = targetBlock.content as ASTNode[]
      if (JSON.stringify(currentContent) === JSON.stringify(newContent)) {
        return prevBlocks
      }

      const newBlocks = [...prevBlocks]
      newBlocks[blockIndex] = {
        ...targetBlock,
        content: newContent
      } as Block
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
    const currentBlocks = blocksRef.current
    const previousIndex = findPreviousTextBlock(currentBlocks, currentIndex)
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
  }, [])

  // 包装 findPreviousTextBlock 以适配接口
  const wrappedFindPreviousTextBlock = useCallback((currentIndex: number) => {
    const currentBlocks = blocksRef.current
    return findPreviousTextBlock(currentBlocks, currentIndex)
  }, [])

  // 使用useMemo创建稳定的回调函数对象
  const stableCallbacks = useMemo(() => ({
    onInsertBlock: insertBlock,
    onUpdateBlock: updateBlock,
    onDeleteBlock: deleteBlock,
    onFindPreviousTextBlock: wrappedFindPreviousTextBlock,
    onFocusBlockAtEnd: focusBlockAtEnd,
    onMergeWithPreviousBlock: mergeWithPreviousBlock
  }), [insertBlock, updateBlock, deleteBlock, wrappedFindPreviousTextBlock, focusBlockAtEnd, mergeWithPreviousBlock])

  console.log(blocks, '>>>blocks')

  return (
    <div className='page-block'>
      {blocks.map((block, index) => (
        <BlockComponent
          key={block.id}
          block={block}
          blockIndex={index}
          onInsertBlock={stableCallbacks.onInsertBlock}
          onUpdateBlock={stableCallbacks.onUpdateBlock}
          onDeleteBlock={stableCallbacks.onDeleteBlock}
          onFindPreviousTextBlock={stableCallbacks.onFindPreviousTextBlock}
          onFocusBlockAtEnd={stableCallbacks.onFocusBlockAtEnd}
          onMergeWithPreviousBlock={stableCallbacks.onMergeWithPreviousBlock}
        />
      ))}

      {/* 单例工具栏组件 */}
      {selectionInfo && (
        <div
          className="floating-toolbar"
          style={{
            position: 'absolute',
            left: selectionInfo.position.x,
            top: selectionInfo.position.y,
            zIndex: 1000,
            transform: 'translateX(-50%)'
          }}
        >
          <AstEditorToolbar
            ast={selectionInfo.ast}
            selection={selectionInfo.selection}
            onUpdateAST={handleASTUpdate}
            pendingSelection={pendingSelection}
          />
        </div>
      )}
    </div>
  )
}

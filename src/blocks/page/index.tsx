import { useCallback, useRef, useMemo, useEffect, useState } from 'react'
import type { Block } from '../../types/blocks'
import type { ContentNode } from '../../types/ast'
import BlockComponent from '../../components/BlockComponent'
import { ContentEditorToolbar } from '../../components/editor/ContentEditorToolbar'
import { RemoteCursorIndicator } from '../../components/RemoteCursor'
import { blockManager } from '../../utils/blockManager'
import { selectionManager, type SelectionInfo } from '../../utils/selectionManager'
import { mergeContent } from '../../utils/textOperations'
import { calculateTextLength, findPreviousTextBlock, isTextBlock } from '../../utils/blockUtils'
import type { TextMethods } from '../text'
import type { BlockAction, RemoteCursor } from '../../hooks/useYjs'
import './style.scss'

interface PageBlockProps {
  blocks: Block[]
  dispatch: (action: BlockAction) => void
  remoteCursors?: RemoteCursor[]
  onBlockFocus?: (blockId: string | null) => void
}

export default function PageBlock({ blocks, dispatch, remoteCursors = [], onBlockFocus }: PageBlockProps) {
  const blocksRef = useRef(blocks)

  // 工具栏相关状态
  const [selectionInfo, setSelectionInfo] = useState<SelectionInfo | null>(null)
  const [currentEditorInstance, setCurrentEditorInstance] = useState<TextMethods | null>(null)

  // 保持blocksRef与blocks同步
  blocksRef.current = blocks

  // 监听 block 聚焦事件
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      // 查找最近的带有 data-block-id 的元素
      const blockElement = target.closest('[data-block-id]')
      if (blockElement) {
        const blockId = blockElement.getAttribute('data-block-id')
        if (blockId) {
          onBlockFocus?.(blockId)
        }
      }
    }

    const handleFocusOut = (e: FocusEvent) => {
      // 检查焦点是否离开了所有 block
      const relatedTarget = e.relatedTarget as HTMLElement
      if (!relatedTarget || !relatedTarget.closest('[data-block-id]')) {
        onBlockFocus?.(null)
      }
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)

    return () => {
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
    }
  }, [onBlockFocus])

  // 使用选区管理器
  useEffect(() => {
    const handleSelectionChange = (info: SelectionInfo | null) => {
      if (!info) {
        setSelectionInfo(null)
        setCurrentEditorInstance(null)
        return
      }

      // 从blocks中获取对应的内容
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

      // 更新选区信息，包含实际的内容
      setSelectionInfo({
        ...info,
        ast: block.content as ContentNode[]
      })

      // 获取当前编辑器实例
      const blockInstance = blockManager.getBlock(info.blockId)
      if (blockInstance?.component) {
        const component = blockInstance.component as unknown as TextMethods
        setCurrentEditorInstance(component)
      } else {
        setCurrentEditorInstance(null)
      }
    }

    // 注册选区管理器
    selectionManager.register({
      onSelectionChange: handleSelectionChange
    })

    return () => {
      selectionManager.unregister()
    }
  }, [blocks])


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
        const textLength = calculateTextLength(block.content as ContentNode[])
        component.setSelection?.({ start: textLength, end: textLength })
      }
    }
  }, [])

  // 插入新块的方法
  const insertBlock = useCallback((blockIndex: number, newBlock: Block) => {
    // 使用 dispatch 添加 block
    dispatch({ type: 'add', block: newBlock, index: blockIndex + 1 })

    // 使用 requestAnimationFrame 确保在下一个渲染周期执行
    requestAnimationFrame(() => {
      focusBlock(newBlock.id)
    })
  }, [focusBlock, dispatch])

  // 更新块的方法
  const updateBlock = useCallback((blockIndex: number, newContent: ContentNode[]) => {
    const targetBlock = blocksRef.current[blockIndex]
    if (!targetBlock || !isTextBlock(targetBlock)) {
      return
    }

    // 检查内容是否真的发生了变化
    const currentContent = targetBlock.content as ContentNode[]
    if (JSON.stringify(currentContent) === JSON.stringify(newContent)) {
      return
    }

    // 使用 dispatch 更新 block
    dispatch({
      type: 'update',
      blockId: targetBlock.id,
      updater: (block) => ({ ...block, content: newContent } as Block)
    })
  }, [dispatch])

  // 删除块的方法
  const deleteBlock = useCallback((blockIndex: number) => {
    const targetBlock = blocksRef.current[blockIndex]
    if (!targetBlock) {
      return
    }
    // 使用 dispatch 删除 block
    dispatch({ type: 'remove', blockId: targetBlock.id })
  }, [dispatch])



  // 合并当前block到上一个textBlock的方法
  const mergeWithPreviousBlock = useCallback((currentIndex: number, currentContent: ContentNode[]) => {
    const currentBlocks = blocksRef.current
    const previousIndex = findPreviousTextBlock(currentBlocks, currentIndex)
    if (previousIndex !== -1) {
      const previousBlock = currentBlocks[previousIndex]
      const currentBlock = currentBlocks[currentIndex]

      if (previousBlock && currentBlock &&
        isTextBlock(previousBlock) && isTextBlock(currentBlock)) {

        // 使用mergeContent函数合并内容
        const { mergedContent, newCursorPosition } = mergeContent(previousBlock.content as ContentNode[], currentContent)

        // 使用 dispatch 更新上一个 block
        dispatch({
          type: 'update',
          blockId: previousBlock.id,
          updater: (block) => ({ ...block, content: mergedContent } as Block)
        })

        // 使用 dispatch 删除当前 block
        dispatch({ type: 'remove', blockId: currentBlock.id })

        // 聚焦到合并后的位置
        setTimeout(() => {
          const blockInstance = blockManager.getBlock(previousBlock.id)
          if (blockInstance?.component) {
            const component = blockInstance.component as unknown as TextMethods
            component.focus?.()
            component.setSelection?.({ start: newCursorPosition, end: newCursorPosition })
          }
        }, 0)
      }
    }
  }, [dispatch])

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

  // 获取某个 block 的远程光标
  const getCursorsForBlock = useCallback((blockId: string) => {
    return remoteCursors.filter(cursor => cursor.blockId === blockId)
  }, [remoteCursors])

  return (
    <div className='page-block'>
      {blocks.map((block, index) => (
        <div key={block.id} className="block-with-cursors" style={{ position: 'relative' }}>
          <RemoteCursorIndicator cursors={getCursorsForBlock(block.id)} />
          <BlockComponent
            block={block}
            blockIndex={index}
            onInsertBlock={stableCallbacks.onInsertBlock}
            onUpdateBlock={stableCallbacks.onUpdateBlock}
            onDeleteBlock={stableCallbacks.onDeleteBlock}
            onFindPreviousTextBlock={stableCallbacks.onFindPreviousTextBlock}
            onFocusBlockAtEnd={stableCallbacks.onFocusBlockAtEnd}
            onMergeWithPreviousBlock={stableCallbacks.onMergeWithPreviousBlock}
          />
        </div>
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
          <ContentEditorToolbar
            content={selectionInfo.ast}
            selection={selectionInfo.selection}
            editorInstance={currentEditorInstance}
          />
        </div>
      )}
    </div>
  )
}

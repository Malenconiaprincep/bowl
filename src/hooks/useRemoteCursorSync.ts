import { useEffect } from 'react'

/**
 * 计算光标在 block 中的文本偏移量
 */
function getCursorOffset(): { blockId: string; offset: number } | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null

  const range = selection.getRangeAt(0)
  const blockElement = (range.startContainer.nodeType === Node.TEXT_NODE
    ? range.startContainer.parentElement
    : range.startContainer as Element
  )?.closest('[data-block-id]')

  if (!blockElement) return null

  const blockId = blockElement.getAttribute('data-block-id')
  if (!blockId) return null

  const treeWalker = document.createTreeWalker(
    blockElement,
    NodeFilter.SHOW_TEXT,
    null
  )

  let offset = 0
  let node: Node | null
  while ((node = treeWalker.nextNode())) {
    if (node === range.startContainer) {
      offset += range.startOffset
      break
    }
    offset += (node.textContent?.length || 0)
  }

  return { blockId, offset }
}

interface UseRemoteCursorSyncOptions {
  onCursorChange?: (blockId: string | null, offset?: number) => void
}

/**
 * Hook: 监听本地光标变化并同步
 */
export function useRemoteCursorSync({ onCursorChange }: UseRemoteCursorSyncOptions) {
  useEffect(() => {
    if (!onCursorChange) return

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      const blockElement = target.closest('[data-block-id]')
      if (blockElement) {
        const result = getCursorOffset()
        if (result) {
          onCursorChange(result.blockId, result.offset)
        }
      }
    }

    const handleFocusOut = (e: FocusEvent) => {
      const relatedTarget = e.relatedTarget as HTMLElement
      if (!relatedTarget || !relatedTarget.closest('[data-block-id]')) {
        onCursorChange(null)
      }
    }

    const handleSelectionChange = () => {
      const result = getCursorOffset()
      if (result) {
        onCursorChange(result.blockId, result.offset)
      }
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)
    document.addEventListener('selectionchange', handleSelectionChange)

    return () => {
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
      document.removeEventListener('selectionchange', handleSelectionChange)
    }
  }, [onCursorChange])
}


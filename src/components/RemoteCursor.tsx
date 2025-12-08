import { useEffect, useState, useRef } from 'react'
import type { RemoteCursor } from '../hooks/useYjs'

interface CursorPosition {
  x: number
  y: number
  height: number
}

/**
 * 根据文本偏移量计算光标在 DOM 中的位置
 */
function getCursorPositionFromOffset(
  blockElement: Element,
  offset: number
): CursorPosition | null {
  const treeWalker = document.createTreeWalker(
    blockElement,
    NodeFilter.SHOW_TEXT,
    null
  )

  let currentOffset = 0
  let node: Node | null

  while ((node = treeWalker.nextNode())) {
    const textLength = node.textContent?.length || 0
    if (currentOffset + textLength >= offset) {
      const localOffset = offset - currentOffset
      const range = document.createRange()
      range.setStart(node, Math.min(localOffset, textLength))
      range.collapse(true)

      const rect = range.getBoundingClientRect()
      const blockRect = blockElement.getBoundingClientRect()

      return {
        x: rect.left - blockRect.left,
        y: rect.top - blockRect.top,
        height: rect.height || 18,
      }
    }
    currentOffset += textLength
  }

  return null
}

// ============ 组件: 单个远程光标 ============

interface RemoteCursorItemProps {
  cursor: RemoteCursor
  blockId: string
}

function RemoteCursorItem({ cursor, blockId }: RemoteCursorItemProps) {
  const [position, setPosition] = useState<CursorPosition | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const updatePosition = () => {
      const blockElement = document.querySelector(`[data-block-id="${blockId}"]`)
      if (!blockElement || cursor.offset === undefined) {
        setPosition(null)
        return
      }

      const pos = getCursorPositionFromOffset(blockElement, cursor.offset)
      setPosition(pos)
    }

    rafRef.current = requestAnimationFrame(updatePosition)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [blockId, cursor.offset])

  // 没有具体位置时，显示在 block 左侧
  if (!position) {
    return (
      <div
        style={{
          position: 'absolute',
          left: -3,
          top: 0,
          bottom: 0,
          width: 2,
          backgroundColor: cursor.userColor,
          borderRadius: 1,
          zIndex: 10,
          opacity: 0.8,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: -16,
            backgroundColor: cursor.userColor,
            color: 'white',
            fontSize: 9,
            padding: '1px 4px',
            borderRadius: 3,
            whiteSpace: 'nowrap',
            fontWeight: 500,
            lineHeight: 1.2,
          }}
        >
          {cursor.userName}
        </div>
      </div>
    )
  }

  // 显示在具体字符位置
  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      {/* 光标线 */}
      <div
        style={{
          width: 2,
          height: position.height,
          backgroundColor: cursor.userColor,
          animation: 'remote-cursor-blink 1.2s ease-in-out infinite',
        }}
      />
      {/* 用户名标签 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: '100%',
          marginBottom: 2,
          backgroundColor: cursor.userColor,
          color: 'white',
          fontSize: 10,
          padding: '2px 6px',
          borderRadius: 3,
          whiteSpace: 'nowrap',
          fontWeight: 500,
          lineHeight: 1.2,
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }}
      >
        {cursor.userName}
      </div>
    </div>
  )
}

// ============ 组件: 远程光标指示器 ============

interface RemoteCursorIndicatorProps {
  cursors: RemoteCursor[]
  blockId: string
}

export function RemoteCursorIndicator({ cursors, blockId }: RemoteCursorIndicatorProps) {
  if (cursors.length === 0) return null

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {cursors.map(cursor => (
        <RemoteCursorItem key={cursor.userId} cursor={cursor} blockId={blockId} />
      ))}
      <style>{`
        @keyframes remote-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}

export default RemoteCursorIndicator

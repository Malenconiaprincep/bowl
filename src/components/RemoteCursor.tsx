import type { RemoteCursor } from '../hooks/useYjs'

interface RemoteCursorIndicatorProps {
  cursors: RemoteCursor[]
}

/**
 * 远程用户光标指示器组件
 * 在 block 左侧显示彩色竖条和用户名
 */
export function RemoteCursorIndicator({ cursors }: RemoteCursorIndicatorProps) {
  if (cursors.length === 0) return null

  return (
    <div className="remote-cursors">
      {cursors.map(cursor => (
        <div
          key={cursor.userId}
          className="remote-cursor-indicator"
          style={{
            position: 'absolute',
            left: -4,
            top: 0,
            bottom: 0,
            width: 3,
            backgroundColor: cursor.userColor,
            borderRadius: 2,
            zIndex: 10,
          }}
        >
          <div
            className="remote-cursor-label"
            style={{
              position: 'absolute',
              left: 0,
              top: -20,
              backgroundColor: cursor.userColor,
              color: 'white',
              fontSize: 11,
              padding: '2px 6px',
              borderRadius: 4,
              whiteSpace: 'nowrap',
              fontWeight: 500,
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }}
          >
            {cursor.userName}
          </div>
        </div>
      ))}
    </div>
  )
}

export default RemoteCursorIndicator


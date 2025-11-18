import { useEffect, useState, useRef, useCallback } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import type { Block } from '../types/blocks'
import type { ASTNode } from '../types/ast'
import { blocksToYjs, yjsToBlocks, astToYjs, yjsToAST } from '../utils/yjsAdapter'

type YMap = Y.Map<unknown>

// 使用自定义 origin 来标识本地更新
const LOCAL_UPDATE_ORIGIN = Symbol('LOCAL_UPDATE')

interface UseYjsProviderOptions {
  roomId: string
  initialBlocks: Block[]
  wsUrl?: string
}

export function useYjsProvider({
  roomId,
  initialBlocks,
  wsUrl = 'ws://localhost:1234'
}: UseYjsProviderOptions) {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks)
  const [isConnected, setIsConnected] = useState(false)
  const [isSynced, setIsSynced] = useState(false) // 跟踪同步状态
  const ydocRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<WebsocketProvider | null>(null)

  useEffect(() => {
    // 创建 Yjs Document
    const ydoc = new Y.Doc()
    ydocRef.current = ydoc

    // 创建 WebSocket Provider（先连接，再初始化数据）
    const provider = new WebsocketProvider(wsUrl, roomId, ydoc)
    providerRef.current = provider

    // 监听连接状态
    provider.on('status', (event: { status: string }) => {
      setIsConnected(event.status === 'connected')
    })

    // 监听 Yjs 数据变化
    const yBlocks = ydoc.getArray<YMap>('blocks')

    const updateBlocks = () => {
      const newBlocks = yjsToBlocks(yBlocks)
      setBlocks(newBlocks)
    }

    // 等待 Provider 同步完成后再初始化
    // 如果服务器已有数据，就不使用 initialBlocks
    const handleSync = () => {
      // 检查文档是否已有数据
      const existingBlocks = yjsToBlocks(yBlocks)

      // 如果文档为空，才使用初始数据
      if (existingBlocks.length === 0 && initialBlocks.length > 0) {
        ydoc.transact(() => {
          blocksToYjs(ydoc, initialBlocks)
        }, LOCAL_UPDATE_ORIGIN)
      }

      // 标记为已同步
      setIsSynced(true)

      // 初始同步
      updateBlocks()
    }

    // 监听同步事件
    provider.on('sync', handleSync)

    // 如果 Provider 已经同步（可能很快），立即检查
    // 使用 setTimeout 确保在下一个事件循环中检查
    setTimeout(() => {
      if (provider.synced) {
        handleSync()
      }
    }, 0)

    // 监听变化（只处理远程更新，忽略本地更新）
    const observer = (event: Y.YArrayEvent<YMap>) => {
      // 只处理来自其他客户端或服务器的更新（origin 不是我们的本地标识）
      if (event.transaction.origin !== LOCAL_UPDATE_ORIGIN) {
        updateBlocks()
      }
    }

    yBlocks.observe(observer)

    // 清理函数
    return () => {
      yBlocks.unobserve(observer)
      provider.off('sync', handleSync)
      provider.destroy()
      ydoc.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, wsUrl])

  // 更新块的方法（会同步到 Yjs）
  const updateBlocks = useCallback((newBlocks: Block[]) => {
    if (ydocRef.current) {
      blocksToYjs(ydocRef.current, newBlocks)
    }
  }, [])

  // 更新单个块的内容（只更新 AST）
  // 支持通过 blockIndex 或 blockId 来查找块
  const updateBlock = useCallback((blockIndex: number, newContent: ASTNode[], blockId?: string) => {
    if (!ydocRef.current) {
      console.warn('Yjs Document 未初始化')
      return
    }

    // 如果还未同步，延迟执行
    if (!isSynced) {
      console.warn('Yjs 还未同步完成，延迟更新')
      setTimeout(() => {
        updateBlock(blockIndex, newContent, blockId)
      }, 100)
      return
    }

    // 使用事务来批量更新，使用自定义 origin 标识本地更新
    ydocRef.current.transact(() => {
      const yBlocks = ydocRef.current!.getArray<YMap>('blocks')

      // 优先通过 blockId 查找，如果没有提供则使用 blockIndex
      let yBlock: YMap | undefined
      let foundIndex = -1

      if (blockId) {
        // 通过 blockId 查找
        for (let i = 0; i < yBlocks.length; i++) {
          const block = yBlocks.get(i)
          if (block) {
            const id = block.get('id')
            // 确保类型匹配（都转为字符串比较）
            if (String(id) === String(blockId)) {
              yBlock = block
              foundIndex = i
              break
            }
          }
        }

        // 如果通过 blockId 找不到，输出调试信息
        if (!yBlock) {
          console.warn(`无法通过 blockId 找到块:`, {
            blockId,
            yBlocksLength: yBlocks.length,
            existingIds: Array.from({ length: yBlocks.length }, (_, i) => {
              const b = yBlocks.get(i)
              return b ? String(b.get('id')) : 'null'
            })
          })
        }
      }

      // 如果通过 blockId 没找到，尝试通过索引查找
      if (!yBlock && blockIndex >= 0 && blockIndex < yBlocks.length) {
        yBlock = yBlocks.get(blockIndex)
        foundIndex = blockIndex
      }

      if (yBlock) {
        const yContent = yBlock.get('content') as Y.Array<YMap>
        if (yContent) {
          // 先检查内容是否真的不同，避免不必要的更新
          const currentAST = yjsToAST(yContent)
          if (JSON.stringify(currentAST) === JSON.stringify(newContent)) {
            return // 内容相同，不需要更新
          }

          // 清空现有内容
          yContent.delete(0, yContent.length)
          // 添加新内容
          astToYjs(yContent, newContent)
        } else {
          console.warn(`找到块但 content 为空: blockIndex=${foundIndex}, blockId=${blockId || '未提供'}`)
        }
      } else {
        console.warn(`无法找到块: blockIndex=${blockIndex}, blockId=${blockId || '未提供'}, yBlocks.length=${yBlocks.length}`)
      }
    }, LOCAL_UPDATE_ORIGIN) // 使用自定义 origin，这样 observe 可以识别这是本地更新
  }, [isSynced])

  // 插入块
  const insertBlock = useCallback((blockIndex: number, block: Block) => {
    if (ydocRef.current) {
      const yBlocks = ydocRef.current.getArray<YMap>('blocks')
      const yBlock = new Y.Map<unknown>()
      yBlock.set('id', block.id)
      yBlock.set('type', block.type)

      const yContent = new Y.Array<YMap>()
      astToYjs(yContent, block.content as ASTNode[])
      yBlock.set('content', yContent)

      yBlocks.insert(blockIndex + 1, [yBlock])
    }
  }, [])

  // 删除块
  const deleteBlock = useCallback((blockIndex: number) => {
    if (ydocRef.current) {
      const yBlocks = ydocRef.current.getArray<YMap>('blocks')
      yBlocks.delete(blockIndex, 1)
    }
  }, [])

  return {
    blocks,
    isConnected,
    isSynced,
    updateBlocks,
    updateBlock,
    insertBlock,
    deleteBlock,
    ydoc: ydocRef.current
  }
}
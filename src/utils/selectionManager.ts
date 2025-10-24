import type { ASTNode } from '../types/ast'
import type { Selection } from './index'

export interface SelectionInfo {
  blockId: string
  ast: ASTNode[]
  selection: Selection
  position: { x: number; y: number }
}

export interface SelectionManagerCallbacks {
  onSelectionChange: (info: SelectionInfo | null) => void
}

export interface SelectionManagerConfig {
  toolbarHeight?: number
  offsetY?: number
}

class SelectionManager {
  private callbacks: SelectionManagerCallbacks | null = null
  private config: SelectionManagerConfig
  private isSelecting = false
  private lastSelection: SelectionInfo | null = null
  private hasSelection = false

  constructor(config: SelectionManagerConfig = {}) {
    this.config = {
      toolbarHeight: 40,
      offsetY: 15,
      ...config
    }
  }

  // 注册回调函数
  register(callbacks: SelectionManagerCallbacks) {
    this.callbacks = callbacks
    this.setupEventListeners()
  }

  // 注销回调函数
  unregister() {
    this.callbacks = null
    this.cleanupEventListeners()
  }

  // 设置事件监听器
  private setupEventListeners() {
    document.addEventListener('selectionchange', this.handleSelectionChange)
    document.addEventListener('mousedown', this.handleMouseDown)
    document.addEventListener('mouseup', this.handleMouseUp)
    document.addEventListener('click', this.handleClick)
  }

  // 清理事件监听器
  private cleanupEventListeners() {
    document.removeEventListener('selectionchange', this.handleSelectionChange)
    document.removeEventListener('mousedown', this.handleMouseDown)
    document.removeEventListener('mouseup', this.handleMouseUp)
    document.removeEventListener('click', this.handleClick)
  }

  // 处理鼠标按下
  private handleMouseDown = () => {
    this.isSelecting = true
    this.hasSelection = false
  }

  // 处理鼠标抬起
  private handleMouseUp = () => {
    this.isSelecting = false

    // 检查是否有选区
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      this.hasSelection = !range.collapsed
    }

    // 松手后立即检查选区
    this.checkSelection()
  }

  // 处理点击事件
  private handleClick = (e: MouseEvent) => {
    // 如果刚刚完成选择且有选区，不处理点击事件
    if (this.hasSelection) {
      return
    }

    // 如果点击的不是工具栏，隐藏工具栏
    if (!(e.target as Element).closest('.editor-toolbar')) {
      this.hideToolbar()
    }
  }


  // 处理选区变化
  private handleSelectionChange = () => {
    if (this.isSelecting) {
      // 正在选择时，不处理选区变化，等待松手
      return
    } else {
      // 不在选择时，检查选区是否被清除
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        this.hasSelection = false
        this.hideToolbar()
      } else {
        // 立即检查选区
        this.checkSelection()
      }
    }
  }


  // 检查选区
  private checkSelection() {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) {
      this.hideToolbar()
      return
    }

    const range = selection.getRangeAt(0)
    const hasSelection = !range.collapsed

    if (!hasSelection) {
      this.hideToolbar()
      return
    }

    // 找到当前选中的block
    const blockInfo = this.findBlockFromRange(range)
    if (!blockInfo) {
      this.hideToolbar()
      return
    }

    // 计算工具栏位置
    const position = this.calculateToolbarPosition(range)
    if (!position) {
      this.hideToolbar()
      return
    }

    // 创建选区信息
    const selectionInfo: SelectionInfo = {
      blockId: blockInfo.blockId,
      ast: blockInfo.ast,
      selection: {
        start: range.startOffset,
        end: range.endOffset
      },
      position
    }

    // 检查是否与上次选区相同，避免重复触发
    if (this.isSameSelection(this.lastSelection, selectionInfo)) {
      return
    }

    this.lastSelection = selectionInfo
    this.callbacks?.onSelectionChange(selectionInfo)
  }

  // 从选区范围找到对应的block
  private findBlockFromRange(range: Range): { blockId: string; ast: ASTNode[] } | null {
    const selectedElement = range.commonAncestorContainer
    const blockElement = selectedElement.nodeType === Node.TEXT_NODE
      ? (selectedElement as Text).parentElement?.closest('[data-block-id]')
      : (selectedElement as Element).closest('[data-block-id]')

    if (!blockElement) return null

    const blockId = blockElement.getAttribute('data-block-id')
    if (!blockId) return null

    // 这里需要从全局状态或通过其他方式获取AST
    // 暂时返回空数组，实际使用时需要传入blocks数据
    return {
      blockId,
      ast: [] // TODO: 从blocks数据中获取对应的AST
    }
  }

  // 计算工具栏位置
  private calculateToolbarPosition(range: Range): { x: number; y: number } | null {
    const rect = range.getBoundingClientRect()
    const pageRect = document.querySelector('.page-block')?.getBoundingClientRect()

    if (!pageRect) return null

    // 获取当前 block 元素
    const selectedElement = range.commonAncestorContainer
    const blockElement = selectedElement.nodeType === Node.TEXT_NODE
      ? (selectedElement as Text).parentElement?.closest('[data-block-id]')
      : (selectedElement as Element).closest('[data-block-id]')

    if (!blockElement) return null

    const blockRect = blockElement.getBoundingClientRect()
    const toolbarHeight = this.config.toolbarHeight!
    const offsetY = this.config.offsetY!

    // 计算相对于 page-block 的位置
    const relativeX = rect.left + rect.width / 2 - pageRect.left
    const relativeBlockTop = blockRect.top - pageRect.top
    const relativeSelectionTop = rect.top - pageRect.top
    const relativeSelectionBottom = rect.bottom - pageRect.top

    // 判断工具栏应该显示在上方还是下方
    const spaceAbove = relativeSelectionTop - relativeBlockTop
    const spaceBelow = pageRect.bottom - rect.bottom
    const toolbarSpaceNeeded = toolbarHeight + offsetY

    let finalY: number

    // 确保空间计算不为负数
    const safeSpaceAbove = Math.max(0, spaceAbove)
    const safeSpaceBelow = Math.max(0, spaceBelow)

    if (safeSpaceAbove >= toolbarSpaceNeeded) {
      // 上方有足够空间，显示在选区上方
      finalY = relativeSelectionTop - offsetY
    } else if (safeSpaceBelow >= toolbarSpaceNeeded) {
      // 下方有足够空间，显示在选区下方
      finalY = relativeSelectionBottom + offsetY
    } else {
      // 空间都不够，优先选择上方（更常见的需求）
      finalY = relativeSelectionTop - offsetY
    }

    return {
      x: relativeX,
      y: finalY
    }
  }

  // 检查是否是相同的选区
  private isSameSelection(last: SelectionInfo | null, current: SelectionInfo): boolean {
    if (!last) return false

    return (
      last.blockId === current.blockId &&
      last.selection.start === current.selection.start &&
      last.selection.end === current.selection.end
    )
  }

  // 隐藏工具栏
  private hideToolbar() {
    this.lastSelection = null
    this.callbacks?.onSelectionChange(null)
  }

  // 手动更新选区信息（用于外部更新AST后同步）
  updateSelectionInfo(blockId: string, ast: ASTNode[]) {
    if (this.lastSelection && this.lastSelection.blockId === blockId) {
      this.lastSelection.ast = ast
    }
  }
}

// 创建单例实例
export const selectionManager = new SelectionManager()

// 导出工厂函数，允许自定义配置
export const createSelectionManager = (config?: SelectionManagerConfig) => {
  return new SelectionManager(config)
}

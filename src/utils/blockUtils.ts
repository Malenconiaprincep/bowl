import type { ASTNode } from '../types/ast'
import type { Block } from '../types/blocks'

/**
 * 计算AST中文本长度的辅助函数
 */
export const calculateTextLength = (ast: ASTNode[]): number => {
  let length = 0
  for (const node of ast) {
    if (node.type === 'text') {
      length += node.value.length
    } else if (node.type === 'element') {
      length += calculateTextLength(node.children)
    }
  }
  return length
}

/**
 * 提取文本内容的辅助函数
 */
export const extractTextContent = (ast: ASTNode[]): string => {
  let text = ''
  for (const node of ast) {
    if (node.type === 'text') {
      text += node.value
    } else if (node.type === 'element' && node.children) {
      text += extractTextContent(node.children)
    }
  }
  return text
}

/**
 * 查找上一个textBlock的方法
 */
export const findPreviousTextBlock = (blocks: Block[], currentIndex: number): number => {
  for (let i = currentIndex - 1; i >= 0; i--) {
    const block = blocks[i]
    if (block && (block.type === 'paragraph' || block.type === 'heading')) {
      return i
    }
  }
  return -1
}

/**
 * 检查block是否为文本类型
 */
export const isTextBlock = (block: Block): boolean => {
  return block.type === 'paragraph' || block.type === 'heading'
}

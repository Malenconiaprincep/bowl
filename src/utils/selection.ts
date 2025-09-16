import type { ASTNode, TextNode } from "../types/ast";
import { getTextNodes } from "./core";

// 光标位置信息
export interface CursorPosition {
  nodeIndex: number;  // 在文本节点列表中的索引
  textOffset: number; // 在文本节点中的字符偏移
  isAtEnd: boolean;   // 是否在节点末尾
}

// 选区信息
export interface Selection {
  start: CursorPosition;
  end: CursorPosition;
  hasSelection: boolean;
}

// DOM 节点到文本节点的映射
export interface NodeMapping {
  domNode: Node;
  textNodeIndex: number;
  textOffset: number;
}

// 创建光标位置
export function createCursorPosition(nodeIndex: number, textOffset: number, isAtEnd: boolean = false): CursorPosition {
  return { nodeIndex, textOffset, isAtEnd };
}

// 验证选区是否有效
export function isValidSelection(selection: Selection, textNodes: TextNode[]): boolean {
  if (!selection.hasSelection) return true;

  const { start, end } = selection;
  const startNode = textNodes[start.nodeIndex];
  const endNode = textNodes[end.nodeIndex];

  if (!startNode || !endNode) return false;

  const startValid = start.textOffset >= 0 && start.textOffset <= startNode.value.length;
  const endValid = end.textOffset >= 0 && end.textOffset <= endNode.value.length;

  return startValid && endValid;
}

// 建立 DOM 节点到文本节点的映射
export function buildNodeMapping(container: HTMLElement, ast: ASTNode[]): NodeMapping[] {
  const mappings: NodeMapping[] = [];
  const textNodes = getTextNodes(ast);
  let textNodeIndex = 0;

  function traverseDOM(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (textNodeIndex < textNodes.length) {
        mappings.push({
          domNode: node,
          textNodeIndex: textNodeIndex,
          textOffset: 0 // 在文本节点内部，偏移量从0开始
        });
        textNodeIndex++;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      Array.from(node.childNodes).forEach(child => {
        traverseDOM(child);
      });
    }
  }

  Array.from(container.childNodes).forEach(child => {
    traverseDOM(child);
  });

  return mappings;
}

// 根据 DOM 位置找到对应的文本节点索引
export function findTextNodeIndex(container: HTMLElement, ast: ASTNode[], domNode: Node, offset: number): CursorPosition {
  const mappings = buildNodeMapping(container, ast);

  for (const mapping of mappings) {
    if (mapping.domNode === domNode) {
      return {
        nodeIndex: mapping.textNodeIndex,
        textOffset: offset, // 使用 DOM 中的实际偏移量
        isAtEnd: offset >= (mapping.domNode.textContent?.length || 0)
      };
    }
  }

  // 如果没找到，返回第一个文本节点
  return {
    nodeIndex: 0,
    textOffset: 0,
    isAtEnd: false
  };
}

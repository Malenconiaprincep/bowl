import type { ASTNode, TextNode } from "../types/ast";
import { getTextNodes } from "./core";

// 光标位置信息 - 使用全局字符偏移量
export type CursorPosition = number;

// 选区信息
export interface Selection {
  start: number;
  end: number;
}

// 判断是否有选区
export function hasSelection(selection: Selection): boolean {
  return selection.start !== selection.end;
}

// DOM 节点到文本节点的映射
export interface NodeMapping {
  domNode: Node;
  textNodeIndex: number;
  textOffset: number;
}



// 验证选区是否有效
export function isValidSelection(selection: Selection, textNodes: TextNode[]): boolean {
  if (!hasSelection(selection)) return true;

  const { start, end } = selection;
  const totalLength = textNodes.reduce((sum, node) => sum + node.value.length, 0);

  // 如果没有文本节点，任何选区都是无效的
  if (textNodes.length === 0) return false;

  const startValid = start >= 0 && start <= totalLength;
  const endValid = end >= 0 && end <= totalLength;
  const hasContent = start < end; // 选区必须有实际内容
  const orderValid = start <= end; // 开始位置不能大于结束位置

  return startValid && endValid && hasContent && orderValid;
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

// 根据 selectionOffset 找到对应的文本节点和偏移量
export function findNodeAndOffsetBySelectionOffset(textNodes: TextNode[], selectionOffset: number): { nodeIndex: number; textOffset: number } {
  let currentOffset = 0;

  for (let i = 0; i < textNodes.length; i++) {
    const nodeLength = textNodes[i].value.length;

    if (selectionOffset <= currentOffset + nodeLength) {
      return {
        nodeIndex: i,
        textOffset: selectionOffset - currentOffset
      };
    }

    currentOffset += nodeLength;
  }

  // 如果超出范围，返回最后一个节点
  const lastIndex = textNodes.length - 1;
  return {
    nodeIndex: lastIndex,
    textOffset: textNodes[lastIndex]?.value.length || 0
  };
}

// 根据文本节点索引和偏移量计算 selectionOffset
export function calculateSelectionOffset(textNodes: TextNode[], nodeIndex: number, textOffset: number): number {
  let selectionOffset = 0;

  for (let i = 0; i < nodeIndex && i < textNodes.length; i++) {
    selectionOffset += textNodes[i].value.length;
  }

  return selectionOffset + Math.min(textOffset, textNodes[nodeIndex]?.value.length || 0);
}


// 根据 DOM 位置找到对应的 selectionOffset
export function findSelectionOffsetFromDOM(container: HTMLElement, ast: ASTNode[], domNode: Node, offset: number): number {
  const mappings = buildNodeMapping(container, ast);
  const textNodes = getTextNodes(ast);

  for (const mapping of mappings) {
    if (mapping.domNode === domNode) {
      const selectionOffset = calculateSelectionOffset(textNodes, mapping.textNodeIndex, offset);
      return selectionOffset;
    }
  }

  // 如果没找到，返回开始位置
  return 0;
}



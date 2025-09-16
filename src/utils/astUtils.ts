import type { ASTNode, Mark, TextNode } from "../types/ast";

// 重新导出 Mark 类型
export type { Mark };

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

// 获取 AST 中的文本节点列表
export function getTextNodes(ast: ASTNode[]): TextNode[] {
  const textNodes: TextNode[] = [];

  function traverse(nodes: ASTNode[]) {
    nodes.forEach(node => {
      if (node.type === "text") {
        textNodes.push(node);
      } else if (node.type === "element") {
        traverse(node.children);
      }
    });
  }

  traverse(ast);
  return textNodes;
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

// 在指定位置插入文本
export function insertTextAtPosition(ast: ASTNode[], position: CursorPosition, text: string): ASTNode[] {
  const newAst = JSON.parse(JSON.stringify(ast));
  const textNodes = getTextNodes(newAst);
  const targetNode = textNodes[position.nodeIndex];

  if (targetNode) {
    const before = targetNode.value.slice(0, position.textOffset);
    const after = targetNode.value.slice(position.textOffset);
    targetNode.value = before + text + after;
  }

  return newAst;
}

// 在指定位置删除文本
export function deleteTextAtPosition(ast: ASTNode[], position: CursorPosition, length: number = 1): ASTNode[] {
  const newAst = JSON.parse(JSON.stringify(ast));
  const textNodes = getTextNodes(newAst);
  const targetNode = textNodes[position.nodeIndex];

  if (targetNode) {
    const before = targetNode.value.slice(0, position.textOffset);
    const after = targetNode.value.slice(position.textOffset + length);
    targetNode.value = before + after;
  }

  return newAst;
}

// 在 AST 中替换文本节点
export function replaceTextNodeInAST(ast: ASTNode[], nodeIndex: number, newNodes: TextNode[]): ASTNode[] {
  const newAst = JSON.parse(JSON.stringify(ast));
  const textNodes = getTextNodes(newAst);

  if (nodeIndex >= textNodes.length) return newAst;

  // 找到要替换的文本节点在 AST 中的位置
  let currentIndex = 0;

  function replaceInNode(node: ASTNode): ASTNode {
    if (node.type === "text") {
      if (currentIndex === nodeIndex) {
        // 如果只有一个新节点，直接替换
        if (newNodes.length === 1) {
          return newNodes[0];
        }
        // 如果有多个新节点，需要包装在 span 中
        return {
          type: "element",
          tag: "span",
          children: newNodes
        };
      }
      currentIndex++;
      return node;
    } else if (node.type === "element") {
      return {
        ...node,
        children: node.children.map(replaceInNode)
      };
    }
    return node;
  }

  return newAst.map(replaceInNode);
}

// 应用格式化到选区
export function applyFormatToSelection(ast: ASTNode[], selection: Selection, mark: Mark): ASTNode[] {
  if (!selection.hasSelection) return ast;

  let newAst = JSON.parse(JSON.stringify(ast));
  const textNodes = getTextNodes(newAst);

  const startNodeIndex = selection.start.nodeIndex;
  const endNodeIndex = selection.end.nodeIndex;
  const startOffset = selection.start.textOffset;
  const endOffset = selection.end.textOffset;

  // 处理单个文本节点的情况
  if (startNodeIndex === endNodeIndex) {
    const targetNode = textNodes[startNodeIndex];
    if (!targetNode) return newAst;

    const nodeValue = targetNode.value;
    const beforeText = nodeValue.slice(0, startOffset);
    const selectedText = nodeValue.slice(startOffset, endOffset);
    const afterText = nodeValue.slice(endOffset);

    // 创建新的文本节点
    const newNodes: TextNode[] = [];

    if (beforeText) {
      newNodes.push({
        type: "text",
        value: beforeText,
        marks: targetNode.marks ? [...targetNode.marks] : []
      });
    }

    if (selectedText) {
      const selectedMarks = targetNode.marks ? [...targetNode.marks] : [];
      if (!selectedMarks.includes(mark)) {
        selectedMarks.push(mark);
      }
      newNodes.push({
        type: "text",
        value: selectedText,
        marks: selectedMarks
      });
    }

    if (afterText) {
      newNodes.push({
        type: "text",
        value: afterText,
        marks: targetNode.marks ? [...targetNode.marks] : []
      });
    }

    // 替换原节点
    newAst = replaceTextNodeInAST(newAst, startNodeIndex, newNodes);
  } else {
    // 处理跨节点的情况（简化版）
    // 这里可以实现更复杂的跨节点格式化逻辑
    console.log('跨节点选区格式化暂未实现');
  }

  return newAst;
}

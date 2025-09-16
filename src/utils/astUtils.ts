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

// ==================== 公共工具函数 ====================

// AST 深拷贝
function cloneAST(ast: ASTNode[]): ASTNode[] {
  return JSON.parse(JSON.stringify(ast));
}

// 获取目标文本节点
function getTargetTextNode(ast: ASTNode[], nodeIndex: number): TextNode | null {
  const textNodes = getTextNodes(ast);
  return textNodes[nodeIndex] || null;
}

// 文本切片操作
function sliceText(text: string, startOffset: number, endOffset?: number): {
  before: string;
  selected: string;
  after: string;
} {
  const before = text.slice(0, startOffset);
  const selected = endOffset !== undefined ? text.slice(startOffset, endOffset) : '';
  const after = endOffset !== undefined ? text.slice(endOffset) : text.slice(startOffset);

  return { before, selected, after };
}

// 创建光标位置
function createCursorPosition(nodeIndex: number, textOffset: number, isAtEnd: boolean = false): CursorPosition {
  return { nodeIndex, textOffset, isAtEnd };
}

// 验证选区是否有效
function isValidSelection(selection: Selection, textNodes: TextNode[]): boolean {
  if (!selection.hasSelection) return true;

  const { start, end } = selection;
  const startNode = textNodes[start.nodeIndex];
  const endNode = textNodes[end.nodeIndex];

  if (!startNode || !endNode) return false;

  const startValid = start.textOffset >= 0 && start.textOffset <= startNode.value.length;
  const endValid = end.textOffset >= 0 && end.textOffset <= endNode.value.length;

  return startValid && endValid;
}

// 处理跨节点选区删除和插入
function handleCrossNodeSelection(ast: ASTNode[], selection: Selection, text: string): { newAST: ASTNode[], newCursorPosition: CursorPosition } {
  const newAst = cloneAST(ast);
  const { start, end } = selection;

  // 删除跨节点的选中内容
  // 1. 删除开始节点中选中部分
  const startNode = getTargetTextNode(newAst, start.nodeIndex);
  if (startNode) {
    const { before } = sliceText(startNode.value, start.textOffset);
    startNode.value = before;
  }

  // 2. 删除结束节点中选中部分
  const endNode = getTargetTextNode(newAst, end.nodeIndex);
  if (endNode) {
    const { after } = sliceText(endNode.value, end.textOffset);
    endNode.value = after;
  }

  // 3. 删除中间的所有节点（如果有的话）
  for (let i = start.nodeIndex + 1; i < end.nodeIndex; i++) {
    const node = getTargetTextNode(newAst, i);
    if (node) {
      node.value = '';
    }
  }

  // 4. 在开始位置插入新文本（无样式）
  if (startNode) {
    startNode.value += text;
  }

  // 5. 合并相邻的空文本节点
  const finalAst = mergeEmptyTextNodes(newAst);

  return {
    newAST: finalAst,
    newCursorPosition: createCursorPosition(start.nodeIndex, start.textOffset + text.length)
  };
}

// 合并空的文本节点
function mergeEmptyTextNodes(ast: ASTNode[]): ASTNode[] {
  const newAst = cloneAST(ast);
  const textNodes = getTextNodes(newAst);

  // 找到需要合并的节点
  const nodesToMerge: number[] = [];
  for (let i = 0; i < textNodes.length - 1; i++) {
    if (textNodes[i].value === '' && textNodes[i + 1].value === '') {
      nodesToMerge.push(i);
    }
  }

  // 从后往前删除空节点，避免索引变化
  for (let i = nodesToMerge.length - 1; i >= 0; i--) {
    const nodeIndex = nodesToMerge[i];
    const targetNode = getTargetTextNode(newAst, nodeIndex);
    if (targetNode) {
      targetNode.value = ''; // 标记为删除
    }
  }

  return newAst;
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
  const newAst = cloneAST(ast);
  const targetNode = getTargetTextNode(newAst, position.nodeIndex);

  if (targetNode) {
    const { before, after } = sliceText(targetNode.value, position.textOffset);
    targetNode.value = before + text + after;
  }

  return newAst;
}

// 在指定位置删除文本
export function deleteTextAtPosition(ast: ASTNode[], position: CursorPosition, length: number = 1): ASTNode[] {
  const newAst = cloneAST(ast);
  const targetNode = getTargetTextNode(newAst, position.nodeIndex);

  if (targetNode) {
    const { before, after } = sliceText(targetNode.value, position.textOffset - length, position.textOffset);
    targetNode.value = before + after;
  }

  return newAst;
}

// 在 AST 中替换文本节点
export function replaceTextNodeInAST(ast: ASTNode[], nodeIndex: number, newNodes: TextNode[]): ASTNode[] {
  const newAst = cloneAST(ast);
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

// 删除选区内容
export function deleteSelection(ast: ASTNode[], selection: Selection): { newAST: ASTNode[], newCursorPosition: CursorPosition } {
  const newAst = cloneAST(ast);
  const textNodes = getTextNodes(newAst);

  // 验证选区有效性
  if (!isValidSelection(selection, textNodes)) {
    return { newAST: ast, newCursorPosition: selection.start };
  }

  let newCursorPosition: CursorPosition;

  if (selection.hasSelection) {
    // 有选区时，删除选中内容
    const { start, end } = selection;

    // 处理单个文本节点的情况
    if (start.nodeIndex === end.nodeIndex) {
      const targetNode = getTargetTextNode(newAst, start.nodeIndex);

      if (targetNode) {
        const { before, after } = sliceText(targetNode.value, start.textOffset, end.textOffset);

        // 删除选中内容
        targetNode.value = before + after;

        // 设置新的光标位置（在删除内容的开始位置）
        newCursorPosition = createCursorPosition(start.nodeIndex, start.textOffset);
      } else {
        // 如果找不到目标节点，回退到普通删除
        const fallbackResult = deleteTextAtPosition(ast, start, 1);
        return {
          newAST: fallbackResult,
          newCursorPosition: createCursorPosition(start.nodeIndex, Math.max(0, start.textOffset - 1))
        };
      }
    } else {
      // 跨节点的情况：删除整个选中内容
      return handleCrossNodeSelection(ast, selection, '');
    }
  } else {
    // 没有选区时，删除光标前一个字符
    const fallbackResult = deleteTextAtPosition(ast, selection.start, 1);
    return {
      newAST: fallbackResult,
      newCursorPosition: createCursorPosition(selection.start.nodeIndex, Math.max(0, selection.start.textOffset - 1))
    };
  }

  return { newAST: newAst, newCursorPosition };
}

// 在选区位置插入文本（如果有选区则先删除选中内容）
export function insertTextAtSelection(ast: ASTNode[], selection: Selection, text: string): { newAST: ASTNode[], newCursorPosition: CursorPosition } {
  const newAst = cloneAST(ast);
  const textNodes = getTextNodes(newAst);

  // 验证选区有效性
  if (!isValidSelection(selection, textNodes)) {
    return { newAST: ast, newCursorPosition: selection.start };
  }

  let newCursorPosition: CursorPosition;

  if (selection.hasSelection) {
    // 有选区时，先删除选中内容，再插入新文本
    const { start, end } = selection;

    // 处理单个文本节点的情况
    if (start.nodeIndex === end.nodeIndex) {
      const targetNode = getTargetTextNode(newAst, start.nodeIndex);

      if (targetNode) {
        const { before, after } = sliceText(targetNode.value, start.textOffset, end.textOffset);

        // 删除选中内容并插入新文本
        targetNode.value = before + text + after;

        // 设置新的光标位置
        newCursorPosition = createCursorPosition(start.nodeIndex, start.textOffset + text.length);
      } else {
        // 如果找不到目标节点，回退到普通插入
        const fallbackResult = insertTextAtPosition(ast, start, text);
        return {
          newAST: fallbackResult,
          newCursorPosition: createCursorPosition(start.nodeIndex, start.textOffset + text.length)
        };
      }
    } else {
      // 跨节点的情况：删除选中内容并插入新文本（无样式）
      return handleCrossNodeSelection(ast, selection, text);
    }
  } else {
    // 没有选区时，正常插入
    const fallbackResult = insertTextAtPosition(ast, selection.start, text);
    return {
      newAST: fallbackResult,
      newCursorPosition: createCursorPosition(selection.start.nodeIndex, selection.start.textOffset + text.length)
    };
  }

  return { newAST: newAst, newCursorPosition };
}

// 应用格式化到选区
export function applyFormatToSelection(ast: ASTNode[], selection: Selection, mark: Mark): ASTNode[] {
  if (!selection.hasSelection) return ast;

  const newAst = cloneAST(ast);
  const textNodes = getTextNodes(newAst);

  // 验证选区有效性
  if (!isValidSelection(selection, textNodes)) {
    return ast;
  }

  const { start, end } = selection;

  // 处理单个文本节点的情况
  if (start.nodeIndex === end.nodeIndex) {
    const targetNode = getTargetTextNode(newAst, start.nodeIndex);
    if (!targetNode) return newAst;

    const { before, selected, after } = sliceText(targetNode.value, start.textOffset, end.textOffset);

    // 创建新的文本节点
    const newNodes: TextNode[] = [];
    const baseMarks = targetNode.marks ? [...targetNode.marks] : [];

    if (before) {
      newNodes.push({
        type: "text",
        value: before,
        marks: [...baseMarks]
      });
    }

    if (selected) {
      const selectedMarks = [...baseMarks];
      if (!selectedMarks.includes(mark)) {
        selectedMarks.push(mark);
      }
      newNodes.push({
        type: "text",
        value: selected,
        marks: selectedMarks
      });
    }

    if (after) {
      newNodes.push({
        type: "text",
        value: after,
        marks: [...baseMarks]
      });
    }

    // 替换原节点
    return replaceTextNodeInAST(newAst, start.nodeIndex, newNodes);
  } else {
    // 处理跨节点的情况（简化版）
    // 这里可以实现更复杂的跨节点格式化逻辑
    console.log('跨节点选区格式化暂未实现');
    return newAst;
  }
}

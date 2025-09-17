import type { ASTNode } from "../types/ast";
import { cloneAST, getTextNodes, getTargetTextNode, mergeEmptyTextNodes } from "./core";
import type { Selection } from "./selection";
import { isValidSelection, findNodeAndOffsetBySelectionOffset } from "./selection";

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

// 处理跨节点选区删除和插入
function handleCrossNodeSelection(ast: ASTNode[], selection: Selection, text: string): { newAST: ASTNode[], newCursorPosition: number } {
  const newAst = cloneAST(ast);
  const { start, end } = selection;
  const textNodes = getTextNodes(newAst);

  // 找到开始和结束位置对应的节点
  const startPos = findNodeAndOffsetBySelectionOffset(textNodes, start);
  const endPos = findNodeAndOffsetBySelectionOffset(textNodes, end);

  // 删除跨节点的选中内容
  // 1. 删除开始节点中选中部分
  const startNode = getTargetTextNode(newAst, startPos.nodeIndex);
  if (startNode) {
    const { before } = sliceText(startNode.value, startPos.textOffset);
    startNode.value = before;
  }

  // 2. 删除结束节点中选中部分
  const endNode = getTargetTextNode(newAst, endPos.nodeIndex);
  if (endNode) {
    const { after } = sliceText(endNode.value, endPos.textOffset);
    endNode.value = after;
  }

  // 3. 删除中间的所有节点（如果有的话）
  for (let i = startPos.nodeIndex + 1; i < endPos.nodeIndex; i++) {
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

  const newOffset = start + text.length;
  return {
    newAST: finalAst,
    newCursorPosition: newOffset
  };
}

// 在指定位置插入文本
export function insertTextAtPosition(ast: ASTNode[], position: number, text: string): ASTNode[] {
  const newAst = cloneAST(ast);
  const textNodes = getTextNodes(newAst);

  // 检查位置是否有效
  const totalLength = textNodes.reduce((sum, node) => sum + node.value.length, 0);
  if (position < 0 || position > totalLength) {
    return ast; // 无效位置，返回原始 AST
  }

  const { nodeIndex, textOffset } = findNodeAndOffsetBySelectionOffset(textNodes, position);
  const targetNode = getTargetTextNode(newAst, nodeIndex);

  if (targetNode) {
    const { before, after } = sliceText(targetNode.value, textOffset);
    targetNode.value = before + text + after;
  }

  return newAst;
}

// 在指定位置删除文本
export function deleteTextAtPosition(ast: ASTNode[], position: number, length: number = 1): ASTNode[] {
  const newAst = cloneAST(ast);
  const textNodes = getTextNodes(newAst);

  // 检查位置是否有效
  const totalLength = textNodes.reduce((sum, node) => sum + node.value.length, 0);
  if (position < 0 || position > totalLength) {
    return ast; // 无效位置，返回原始 AST
  }

  const { nodeIndex, textOffset } = findNodeAndOffsetBySelectionOffset(textNodes, position);
  const targetNode = getTargetTextNode(newAst, nodeIndex);

  if (targetNode) {
    const { before, after } = sliceText(targetNode.value, textOffset - length, textOffset);
    targetNode.value = before + after;
  }

  return newAst;
}

// 删除选区内容
export function deleteSelection(ast: ASTNode[], selection: Selection): { newAST: ASTNode[], newCursorPosition: number } {
  const newAst = cloneAST(ast);
  const textNodes = getTextNodes(newAst);

  // 验证选区有效性
  if (!isValidSelection(selection, textNodes)) {
    return { newAST: ast, newCursorPosition: selection.start };
  }

  let newCursorPosition: number;

  if (selection.hasSelection) {
    // 有选区时，删除选中内容
    const { start, end } = selection;
    const startPos = findNodeAndOffsetBySelectionOffset(textNodes, start);
    const endPos = findNodeAndOffsetBySelectionOffset(textNodes, end);

    // 处理单个文本节点的情况
    if (startPos.nodeIndex === endPos.nodeIndex) {
      const targetNode = getTargetTextNode(newAst, startPos.nodeIndex);

      if (targetNode) {
        const { before, after } = sliceText(targetNode.value, startPos.textOffset, endPos.textOffset);

        // 删除选中内容
        targetNode.value = before + after;

        // 设置新的光标位置（在删除内容的开始位置）
        newCursorPosition = start;
      } else {
        // 如果找不到目标节点，回退到普通删除
        const fallbackResult = deleteTextAtPosition(ast, start, 1);
        return {
          newAST: fallbackResult,
          newCursorPosition: Math.max(0, start - 1)
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
      newCursorPosition: Math.max(0, selection.start - 1)
    };
  }

  return { newAST: newAst, newCursorPosition };
}

// 在选区位置插入文本（如果有选区则先删除选中内容）
export function insertTextAtSelection(ast: ASTNode[], selection: Selection, text: string): { newAST: ASTNode[], newCursorPosition: number } {
  const newAst = cloneAST(ast);
  const textNodes = getTextNodes(newAst);

  // 验证选区有效性
  if (!isValidSelection(selection, textNodes)) {
    return { newAST: ast, newCursorPosition: selection.start };
  }

  let newCursorPosition: number;

  if (selection.hasSelection) {
    // 有选区时，先删除选中内容，再插入新文本
    const { start, end } = selection;
    const startPos = findNodeAndOffsetBySelectionOffset(textNodes, start);
    const endPos = findNodeAndOffsetBySelectionOffset(textNodes, end);

    // 处理单个文本节点的情况
    if (startPos.nodeIndex === endPos.nodeIndex) {
      const targetNode = getTargetTextNode(newAst, startPos.nodeIndex);

      if (targetNode) {
        const { before, after } = sliceText(targetNode.value, startPos.textOffset, endPos.textOffset);

        // 删除选中内容并插入新文本
        targetNode.value = before + text + after;

        // 设置新的光标位置
        newCursorPosition = start + text.length;
      } else {
        // 如果找不到目标节点，回退到普通插入
        const fallbackResult = insertTextAtPosition(ast, start, text);
        const newOffset = start + text.length;
        return {
          newAST: fallbackResult,
          newCursorPosition: newOffset
        };
      }
    } else {
      // 跨节点的情况：删除选中内容并插入新文本（无样式）
      return handleCrossNodeSelection(ast, selection, text);
    }
  } else {
    // 没有选区时，正常插入
    const fallbackResult = insertTextAtPosition(ast, selection.start, text);
    const newOffset = selection.start + text.length;
    return {
      newAST: fallbackResult,
      newCursorPosition: newOffset
    };
  }

  return { newAST: newAst, newCursorPosition };
}

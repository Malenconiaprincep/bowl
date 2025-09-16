import type { ASTNode } from "../types/ast";
import { cloneAST, getTextNodes, getTargetTextNode, mergeEmptyTextNodes } from "./core";
import type { CursorPosition, Selection } from "./selection";
import { createCursorPosition, isValidSelection } from "./selection";

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

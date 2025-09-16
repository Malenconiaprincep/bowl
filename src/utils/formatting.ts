import type { ASTNode, TextNode, Mark } from "../types/ast";
import { cloneAST, getTextNodes, getTargetTextNode, replaceTextNodeInAST } from "./core";
import type { Selection } from "./selection";
import { isValidSelection } from "./selection";

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

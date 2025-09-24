import type { ASTNode, TextNode, Mark } from "../types/ast";
import { cloneAST, getTextNodes, getTargetTextNode, replaceTextNodeInAST } from "./core";
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

// 应用格式化到跨节点选区
function applyFormatToCrossNodeSelection(
  ast: ASTNode[],
  startNodeInfo: { nodeIndex: number; textOffset: number },
  endNodeInfo: { nodeIndex: number; textOffset: number },
  mark: Mark
): ASTNode[] {
  const newAst = cloneAST(ast);
  const textNodes = getTextNodes(newAst);

  // 获取起始和结束节点
  const startNode = textNodes[startNodeInfo.nodeIndex];
  const endNode = textNodes[endNodeInfo.nodeIndex];

  if (!startNode || !endNode) return newAst;

  // 收集选中的文本
  let selectedText = '';

  // 从起始节点收集选中文本
  const startSelected = startNode.value.slice(startNodeInfo.textOffset);
  if (startSelected) {
    selectedText += startSelected;
  }

  // 从中间节点收集选中文本
  for (let i = startNodeInfo.nodeIndex + 1; i < endNodeInfo.nodeIndex; i++) {
    selectedText += textNodes[i].value;
  }

  // 从结束节点收集选中文本
  const endSelected = endNode.value.slice(0, endNodeInfo.textOffset);
  if (endSelected) {
    selectedText += endSelected;
  }

  // 创建格式化的选中文本节点
  // 对于跨节点选区，需要合并所有涉及节点的格式
  const selectedMarks: Mark[] = [];

  // 收集起始节点的格式
  if (startNode.marks) {
    selectedMarks.push(...startNode.marks);
  }

  // 收集中间节点的格式
  for (let i = startNodeInfo.nodeIndex + 1; i < endNodeInfo.nodeIndex; i++) {
    selectedMarks.push(...(textNodes[i].marks || []));
  }

  // 收集结束节点的格式
  if (endNode.marks) {
    selectedMarks.push(...endNode.marks);
  }

  // 去重并添加新格式
  const uniqueMarks = [...new Set(selectedMarks)];
  if (!uniqueMarks.includes(mark)) {
    uniqueMarks.push(mark);
  }
  const formattedSelectedNode: TextNode = {
    type: "text",
    value: selectedText,
    marks: uniqueMarks
  };

  // 构建新的节点数组
  const newNodes: TextNode[] = [];

  // 处理起始节点
  const startBefore = startNode.value.slice(0, startNodeInfo.textOffset);
  if (startBefore) {
    newNodes.push({
      type: "text",
      value: startBefore,
      marks: startNode.marks ? [...startNode.marks] : []
    });
  }
  newNodes.push(formattedSelectedNode);

  // 处理结束节点
  const endAfter = endNode.value.slice(endNodeInfo.textOffset);
  if (endAfter) {
    newNodes.push({
      type: "text",
      value: endAfter,
      marks: endNode.marks ? [...endNode.marks] : []
    });
  }

  // 直接构建新的 AST，保持 p 标签结构
  const result: ASTNode[] = [];

  for (let i = 0; i < newAst.length; i++) {
    if (i === 0) { // 假设第一个节点是 p 标签
      const pNode = newAst[i] as { type: 'element'; tag: string; children: ASTNode[] };
      const newChildren: ASTNode[] = [];

      // 添加起始节点之前的所有子节点
      for (let j = 0; j < startNodeInfo.nodeIndex; j++) {
        newChildren.push(pNode.children[j]);
      }

      // 添加新的节点数组
      newChildren.push(...newNodes);

      // 添加结束节点之后的所有子节点
      for (let j = endNodeInfo.nodeIndex + 1; j < pNode.children.length; j++) {
        newChildren.push(pNode.children[j]);
      }

      result.push({
        type: 'element',
        tag: pNode.tag,
        children: newChildren
      });
    } else {
      result.push(newAst[i]);
    }
  }

  return result;
}

// 应用格式化到选区
export function applyFormatToSelection(ast: ASTNode[], selection: Selection, mark: Mark): ASTNode[] {
  if (!selection.hasSelection) return ast;

  const newAst = cloneAST(ast);
  const textNodes = getTextNodes(newAst);

  console.log('文本节点列表:', textNodes.map(node => ({
    value: node.value,
    marks: node.marks
  })));

  // 验证选区有效性
  if (!isValidSelection(selection, textNodes)) {
    return ast;
  }

  const { start, end } = selection;

  // 根据全局偏移量找到对应的文本节点索引和偏移量
  const startNodeInfo = findNodeAndOffsetBySelectionOffset(textNodes, start);
  const endNodeInfo = findNodeAndOffsetBySelectionOffset(textNodes, end);

  console.log('选区范围:', { start, end, startNodeInfo, endNodeInfo });

  // 处理单个文本节点的情况
  if (startNodeInfo.nodeIndex === endNodeInfo.nodeIndex) {
    const targetNode = getTargetTextNode(newAst, startNodeInfo.nodeIndex);
    if (!targetNode) return newAst;

    console.log('单个文本节点选区:', {
      startNodeInfo,
      endNodeInfo,
      targetNode: targetNode.value,
      originalMarks: targetNode.marks
    });

    const { before, selected, after } = sliceText(targetNode.value, startNodeInfo.textOffset, endNodeInfo.textOffset);

    console.log('文本切片结果:', { before, selected, after });

    // 如果选区覆盖整个文本节点，直接修改原节点的 marks
    if (!before && !after && selected) {
      console.log('选区覆盖整个文本节点:', {
        targetNode: targetNode.value,
        originalMarks: targetNode.marks,
        newMark: mark
      });
      // 保留原有格式并添加新格式
      const originalMarks = targetNode.marks ? [...targetNode.marks] : [];
      if (!originalMarks.includes(mark)) {
        originalMarks.push(mark);
      }
      targetNode.marks = originalMarks;
      console.log('修改后的 marks:', targetNode.marks);
      return newAst;
    }

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
    return replaceTextNodeInAST(newAst, startNodeInfo.nodeIndex, newNodes);
  } else {
    // 处理跨节点的情况
    return applyFormatToCrossNodeSelection(newAst, startNodeInfo, endNodeInfo, mark);
  }
}

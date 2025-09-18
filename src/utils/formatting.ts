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
  const selectedMarks = startNode.marks ? [...startNode.marks] : [];
  if (!selectedMarks.includes(mark)) {
    selectedMarks.push(mark);
  }
  const formattedSelectedNode: TextNode = {
    type: "text",
    value: selectedText,
    marks: selectedMarks
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

  console.log('构建的新节点数组:', newNodes.map(node => ({
    value: node.value,
    marks: node.marks
  })));

  // 使用 replaceTextNodeInAST 来正确替换节点
  let resultAst = replaceTextNodeInAST(newAst, startNodeInfo.nodeIndex, newNodes);

  console.log('替换起始节点后的结果:', resultAst[0]);

  // 删除中间节点和结束节点
  // 注意：在替换起始节点后，索引会发生变化
  const remainingNodesToDelete = endNodeInfo.nodeIndex - startNodeInfo.nodeIndex;
  for (let i = 0; i < remainingNodesToDelete; i++) {
    // 需要删除的节点索引：起始节点被替换为多个节点后，需要删除的节点索引会发生变化
    // 起始节点被替换为 3 个节点，所以需要删除的节点索引是 3 + i
    const nodeIndexToDelete = 3 + i; // 3 是因为起始节点被替换为 3 个节点
    resultAst = replaceTextNodeInAST(resultAst, nodeIndexToDelete, []);
  }

  console.log('最终结果:', resultAst[0]);

  return resultAst;
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

  // 根据全局偏移量找到对应的文本节点索引和偏移量
  const startNodeInfo = findNodeAndOffsetBySelectionOffset(textNodes, start);
  const endNodeInfo = findNodeAndOffsetBySelectionOffset(textNodes, end);

  // 处理单个文本节点的情况
  if (startNodeInfo.nodeIndex === endNodeInfo.nodeIndex) {
    const targetNode = getTargetTextNode(newAst, startNodeInfo.nodeIndex);
    if (!targetNode) return newAst;

    const { before, selected, after } = sliceText(targetNode.value, startNodeInfo.textOffset, endNodeInfo.textOffset);

    // 如果选区覆盖整个文本节点，直接修改原节点的 marks
    if (!before && !after && selected) {
      if (!targetNode.marks) targetNode.marks = [];
      if (!targetNode.marks.includes(mark)) {
        targetNode.marks.push(mark);
      }
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

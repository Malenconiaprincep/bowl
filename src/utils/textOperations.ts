import type { ASTNode, Mark, TextNode } from "../types/ast";
import { cloneAST, getTextNodes, getTargetTextNode, cleanupEmptyNodes } from "./core";
import type { Selection } from "./selection";
import { isValidSelection, findNodeAndOffsetBySelectionOffset, hasSelection } from "./selection";

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

// 创建空文本节点
function createEmptyTextNode(marks?: Mark[]): ASTNode {
  return {
    type: "text",
    value: "",
    marks: marks ? [...marks] : undefined
  };
}

// 创建段落节点
function createParagraphNode(children: ASTNode[]): ASTNode {
  return {
    type: "element",
    tag: "p",
    children
  };
}

// 创建文本节点
function createTextNode(value: string, marks?: Mark[]): ASTNode {
  return {
    type: "text",
    value,
    marks: marks ? [...marks] : undefined
  };
}

// 在段落中查找目标节点的索引
function findTargetNodeInParagraph(paragraphChildren: ASTNode[], targetNode: TextNode): number {
  for (let i = 0; i < paragraphChildren.length; i++) {
    const child = paragraphChildren[i];
    if (child.type === 'text' && child.value === targetNode.value) {
      return i;
    }
  }
  return -1;
}

// 创建 beforeAST（段落结构）
function createBeforeASTInParagraph(
  originalAST: ASTNode[],
  paragraphIndex: number,
  targetNode: TextNode,
  beforeText: string
): ASTNode[] {
  const beforeAST = cloneAST(originalAST);
  const paragraph = originalAST[paragraphIndex] as { type: 'element'; tag: string; children: ASTNode[] };
  const paragraphChildren = paragraph.children;

  const targetChildIndex = findTargetNodeInParagraph(paragraphChildren, targetNode);

  if (targetChildIndex >= 0) {
    const beforeParagraph = cloneAST([paragraph] as unknown as ASTNode[])[0] as { type: 'element'; tag: string; children: ASTNode[] };
    beforeParagraph.children = paragraphChildren.slice(0, targetChildIndex + 1);

    if (beforeParagraph.children[targetChildIndex]) {
      beforeParagraph.children[targetChildIndex] = createTextNode(beforeText, targetNode.marks);
    }

    beforeAST[paragraphIndex] = beforeParagraph as unknown as ASTNode;
  }

  return beforeAST;
}

// 创建 afterAST（段落结构）
function createAfterASTInParagraph(
  paragraphChildren: ASTNode[],
  targetChildIndex: number,
  targetNode: TextNode,
  afterText: string
): ASTNode[] {
  const afterChildren: ASTNode[] = [];

  // 添加目标节点的后半部分（如果有内容）
  if (afterText !== '') {
    afterChildren.push(createTextNode(afterText, targetNode.marks));
  }

  // 添加目标节点之后的所有节点
  afterChildren.push(...paragraphChildren.slice(targetChildIndex + 1));

  if (afterChildren.length > 0) {
    return [createParagraphNode(afterChildren)];
  } else {
    return [createParagraphNode([createEmptyTextNode(targetNode.marks)])];
  }
}

// 创建 afterAST（扁平结构）
function createAfterASTFlat(
  targetNode: TextNode,
  afterText: string
): ASTNode[] {
  if (afterText !== '') {
    const afterTextNode = createTextNode(afterText, targetNode.marks);
    return [createParagraphNode([afterTextNode])];
  } else {
    return [createParagraphNode([createEmptyTextNode(targetNode.marks)])];
  }
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

  // 5. 清理空的节点
  const finalAst = cleanupEmptyNodes(newAst);

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
    // 确保删除范围在有效范围内
    const startOffset = Math.max(0, textOffset - length);
    const { before, after } = sliceText(targetNode.value, startOffset, textOffset);
    targetNode.value = before + after;
  }

  // 清理空的节点
  return cleanupEmptyNodes(newAst);
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

  if (hasSelection(selection)) {
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

  // 清理空的节点
  const finalAst = cleanupEmptyNodes(newAst);
  return { newAST: finalAst, newCursorPosition };
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

  if (hasSelection(selection)) {
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

    // 只有在有选区时才需要清理空的节点（因为可能删除了内容）
    const finalAst = cleanupEmptyNodes(newAst);
    return { newAST: finalAst, newCursorPosition };
  } else {
    // 没有选区时，正常插入（不需要清理空的节点）
    const fallbackResult = insertTextAtPosition(ast, selection.start, text);
    const newOffset = selection.start + text.length;
    return {
      newAST: fallbackResult,
      newCursorPosition: newOffset
    };
  }
}

// 在光标位置拆分文本，返回前面的AST和后面的AST
export function splitTextAtCursor(ast: ASTNode[], selection: Selection): {
  beforeAST: ASTNode[],
  afterAST: ASTNode[],
  newCursorPosition: number
} {
  const newAst = cloneAST(ast);
  const textNodes = getTextNodes(newAst);

  // 验证选区有效性
  const { start } = selection;
  const totalLength = textNodes.reduce((sum, node) => sum + node.value.length, 0);

  // 检查偏移量是否有效
  if (!isValidSelection(selection, textNodes) || start < 0 || start > totalLength) {
    // 当偏移量无效时，根据偏移量更靠近起始点还是最终点来决定拆分行为
    if (start < 0 || Math.abs(start) < Math.abs(start - totalLength)) {
      // 如果偏移量更靠近起始点（0），则所有内容都移到 afterAST
      const afterAST: ASTNode[] = [];
      for (const node of ast) {
        if (node.type === 'element' && node.tag === 'p') {
          const element = node as { type: 'element'; tag: string; children: ASTNode[] };
          // 第一个段落包含所有文本节点
          afterAST.push(createParagraphNode(element.children));
          // 其他3个空段落
          for (let i = 1; i < element.children.length; i++) {
            afterAST.push(createParagraphNode([]));
          }
        }
      }
      return { beforeAST: [], afterAST, newCursorPosition: 0 };
    } else {
      // 如果偏移量更靠近最终点，则所有内容都保留在 beforeAST
      return { beforeAST: ast, afterAST: [], newCursorPosition: 0 };
    }
  }

  const { nodeIndex, textOffset } = findNodeAndOffsetBySelectionOffset(textNodes, start);
  const targetNode = getTargetTextNode(newAst, nodeIndex);

  if (!targetNode || targetNode.type !== 'text') {
    return { beforeAST: ast, afterAST: [], newCursorPosition: start };
  }

  // 拆分文本：光标前和光标后
  const { before, after } = sliceText(targetNode.value, textOffset);

  // 创建前面的AST
  const beforeAST = cloneAST(ast);
  const beforeTargetNode = getTargetTextNode(beforeAST, nodeIndex);
  if (beforeTargetNode) {
    beforeTargetNode.value = before;
  }

  // 查找段落结构
  const originalAST = cloneAST(ast);
  let foundParagraph = false;
  let paragraphIndex = -1;

  for (let i = 0; i < originalAST.length; i++) {
    const node = originalAST[i];
    if (node.type === 'element' && node.tag === 'p') {
      foundParagraph = true;
      paragraphIndex = i;
      break;
    }
  }

  let afterAST: ASTNode[] = [];

  if (foundParagraph && paragraphIndex >= 0) {
    // 在段落内部进行拆分
    const paragraph = originalAST[paragraphIndex] as { type: 'element'; tag: string; children: ASTNode[] };
    const paragraphChildren = paragraph.children;
    const targetChildIndex = findTargetNodeInParagraph(paragraphChildren, targetNode);

    if (targetChildIndex >= 0) {
      // 创建 beforeAST
      const beforeASTResult = createBeforeASTInParagraph(originalAST, paragraphIndex, targetNode, before);
      beforeAST.splice(0, beforeAST.length, ...beforeASTResult);

      // 创建 afterAST
      afterAST = createAfterASTInParagraph(paragraphChildren, targetChildIndex, targetNode, after);
    }
  } else {
    // 处理扁平结构
    if (textOffset === targetNode.value.length) {
      // 光标在节点末尾
      const afterNodes: ASTNode[] = [];
      let currentNodeIndex = 0;
      let foundTargetNode = false;

      for (let i = 0; i < originalAST.length; i++) {
        const node = originalAST[i];
        if (node.type === 'text' && node.value === targetNode.value && !foundTargetNode) {
          foundTargetNode = true;
          if (before !== '') {
            beforeAST[currentNodeIndex] = createTextNode(before, targetNode.marks);
            currentNodeIndex++;
          }
          continue;
        }

        if (foundTargetNode) {
          afterNodes.push(cloneAST([node])[0]);
        } else {
          beforeAST[currentNodeIndex] = node;
          currentNodeIndex++;
        }
      }

      beforeAST.length = currentNodeIndex;
      afterAST = afterNodes.length > 0 ? [createParagraphNode(afterNodes)] : [createParagraphNode([createEmptyTextNode(targetNode.marks)])];
    } else {
      // 光标在节点中间
      afterAST = createAfterASTFlat(targetNode, after);
    }
  }

  return {
    beforeAST: cleanupEmptyNodes(beforeAST),
    afterAST,
    newCursorPosition: 0
  };
}


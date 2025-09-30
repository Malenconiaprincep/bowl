import type { ASTNode } from "../types/ast";
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
    // 也需要清理空的节点
    const finalAst = cleanupEmptyNodes(fallbackResult);
    return {
      newAST: finalAst,
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
    // 如果偏移量更靠近起始点（0），则所有内容都移到 afterAST
    if (start < 0 || Math.abs(start) < Math.abs(start - totalLength)) {
      // 创建4个段落，第一个包含所有文本节点，其他为空
      const afterAST: ASTNode[] = [];
      for (const node of ast) {
        if (node.type === 'element' && node.tag === 'p') {
          const element = node as { type: 'element'; tag: string; children: ASTNode[] };

          // 第一个段落包含所有文本节点
          afterAST.push({
            type: 'element',
            tag: 'p',
            children: element.children
          });

          // 其他3个空段落
          for (let i = 1; i < element.children.length; i++) {
            afterAST.push({
              type: 'element',
              tag: 'p',
              children: []
            });
          }
        }
      }

      return {
        beforeAST: [],
        afterAST,
        newCursorPosition: 0
      };
    } else {
      // 如果偏移量更靠近最终点，则所有内容都保留在 beforeAST
      return {
        beforeAST: ast,
        afterAST: [],
        newCursorPosition: 0
      };
    }
  }

  const { nodeIndex, textOffset } = findNodeAndOffsetBySelectionOffset(textNodes, start);
  const targetNode = getTargetTextNode(newAst, nodeIndex);

  if (!targetNode) {
    return {
      beforeAST: ast,
      afterAST: [],
      newCursorPosition: start
    };
  }

  // 拆分文本：光标前和光标后
  const { before, after } = sliceText(targetNode.value, textOffset);

  // 创建前面的AST
  const beforeAST = cloneAST(ast);

  // 创建后面的AST
  let afterAST: ASTNode[] = [];
  const beforeTargetNode = getTargetTextNode(beforeAST, nodeIndex);
  if (beforeTargetNode) {
    beforeTargetNode.value = before;
  }

  // 如果光标在当前节点的末尾，需要将后续所有节点移到 afterAST
  if (textOffset === targetNode.value.length) {
    // 光标在节点末尾，需要处理嵌套结构
    const originalAST = cloneAST(ast);
    // const afterNodes: ASTNode[] = [];

    // 检查是否在段落内部
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

    if (foundParagraph && paragraphIndex >= 0) {
      // 在段落内部进行拆分
      const paragraph = originalAST[paragraphIndex] as { type: 'element'; tag: string; children: ASTNode[] };
      const paragraphChildren = paragraph.children;

      // 找到目标节点在段落中的位置
      let targetChildIndex = -1;
      for (let i = 0; i < paragraphChildren.length; i++) {
        const child = paragraphChildren[i];
        if (child.type === 'text' && child.value === targetNode.value) {
          targetChildIndex = i;
          break;
        }
      }

      if (targetChildIndex >= 0) {
        // 创建 beforeAST - 只包含当前段落，但截断目标节点
        const beforeParagraph = cloneAST([paragraph] as unknown as ASTNode[])[0] as { type: 'element'; tag: string; children: ASTNode[] };
        beforeParagraph.children = paragraphChildren.slice(0, targetChildIndex + 1);
        if (beforeParagraph.children[targetChildIndex]) {
          beforeParagraph.children[targetChildIndex] = {
            type: 'text',
            value: before,
            marks: targetNode.marks ? [...targetNode.marks] : undefined
          };
        }

        // 创建 afterAST - 包含目标节点之后的节点
        const afterChildren = paragraphChildren.slice(targetChildIndex + 1);
        if (afterChildren.length > 0) {
          afterAST = [{
            type: "element",
            tag: "p",
            children: afterChildren
          }];
        } else {
          afterAST = [{
            type: "element",
            tag: "p",
            children: [{
              type: "text",
              value: "",
              marks: targetNode.marks ? [...targetNode.marks] : undefined
            }]
          }];
        }

        // 更新 beforeAST
        beforeAST[paragraphIndex] = beforeParagraph as unknown as ASTNode;
      }
    } else {
      // 处理扁平结构（原有逻辑）
      const afterNodes: ASTNode[] = [];
      let currentNodeIndex = 0;
      let foundTargetNode = false;

      for (let i = 0; i < originalAST.length; i++) {
        const node = originalAST[i];
        if (node.type === 'text' && node.value === targetNode.value && !foundTargetNode) {
          foundTargetNode = true;
          if (before !== '') {
            beforeAST[currentNodeIndex] = {
              type: 'text',
              value: before,
              marks: targetNode.marks ? [...targetNode.marks] : undefined
            };
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

      if (afterNodes.length > 0) {
        afterAST = [{
          type: "element",
          tag: "p",
          children: afterNodes
        }];
      } else {
        afterAST = [{
          type: "element",
          tag: "p",
          children: [{
            type: "text",
            value: "",
            marks: targetNode.marks ? [...targetNode.marks] : undefined
          }]
        }];
      }
    }
  } else {
    // 光标在节点中间，需要将当前节点的后半部分和后续所有节点移到 afterAST
    const originalAST = cloneAST(ast);

    // 找到目标节点在段落中的位置
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

    if (foundParagraph && paragraphIndex >= 0) {
      const paragraph = originalAST[paragraphIndex] as { type: 'element'; tag: string; children: ASTNode[] };
      const paragraphChildren = paragraph.children;

      // 找到目标节点在段落中的位置
      let targetChildIndex = -1;
      for (let i = 0; i < paragraphChildren.length; i++) {
        const child = paragraphChildren[i];
        if (child.type === 'text' && child.value === targetNode.value) {
          targetChildIndex = i;
          break;
        }
      }

      if (targetChildIndex >= 0) {
        // 创建 beforeAST - 只包含当前段落，但截断目标节点
        const beforeParagraph = cloneAST([paragraph] as unknown as ASTNode[])[0] as { type: 'element'; tag: string; children: ASTNode[] };
        beforeParagraph.children = paragraphChildren.slice(0, targetChildIndex + 1);
        if (beforeParagraph.children[targetChildIndex]) {
          beforeParagraph.children[targetChildIndex] = {
            type: 'text',
            value: before,
            marks: targetNode.marks ? [...targetNode.marks] : undefined
          };
        }

        // 创建 afterAST - 包含目标节点后半部分和后续所有节点
        const afterChildren = [];

        // 添加目标节点的后半部分（如果有内容）
        if (after !== '') {
          afterChildren.push({
            type: 'text',
            value: after,
            marks: targetNode.marks ? [...targetNode.marks] : undefined
          });
        }

        // 添加目标节点之后的所有节点
        afterChildren.push(...paragraphChildren.slice(targetChildIndex + 1));

        if (afterChildren.length > 0) {
          afterAST = [{
            type: "element",
            tag: "p",
            children: afterChildren
          }];
        } else {
          afterAST = [{
            type: "element",
            tag: "p",
            children: [{
              type: "text",
              value: "",
              marks: targetNode.marks ? [...targetNode.marks] : undefined
            }]
          }];
        }

        // 更新 beforeAST
        beforeAST[paragraphIndex] = beforeParagraph as unknown as ASTNode;
      }
    } else {
      // 处理扁平结构的情况
      if (after !== '') {
        const afterTextNode: ASTNode = {
          type: "text",
          value: after,
          marks: targetNode.marks ? [...targetNode.marks] : undefined
        };

        afterAST = [{
          type: "element",
          tag: "p",
          children: [afterTextNode]
        }];
      } else {
        const emptyTextNode: ASTNode = {
          type: "text",
          value: "",
          marks: targetNode.marks ? [...targetNode.marks] : undefined
        };

        afterAST = [{
          type: "element",
          tag: "p",
          children: [emptyTextNode]
        }];
      }
    }
  }

  // 新光标位置在后面的AST的开始
  const newCursorPosition = 0;

  return {
    beforeAST: cleanupEmptyNodes(beforeAST),
    afterAST,
    newCursorPosition
  };
}


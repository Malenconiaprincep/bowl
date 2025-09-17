import type { ASTNode, TextNode } from "../types/ast";

// 重新导出 Mark 类型
export type { Mark } from "../types/ast";

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

// AST 深拷贝
export function cloneAST(ast: ASTNode[]): ASTNode[] {
  return JSON.parse(JSON.stringify(ast));
}

// 获取目标文本节点
export function getTargetTextNode(ast: ASTNode[], nodeIndex: number): TextNode | null {
  const textNodes = getTextNodes(ast);
  return textNodes[nodeIndex] || null;
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

// 清理空的节点（包括空的文本节点和空的元素节点）
export function cleanupEmptyNodes(ast: ASTNode[]): ASTNode[] {
  function cleanupNode(node: ASTNode): ASTNode | null {
    if (node.type === "text") {
      // 保留非空文本节点
      return node.value !== '' ? node : null;
    } else if (node.type === "element") {
      // 递归清理子节点
      const cleanedChildren = node.children
        .map(cleanupNode)
        .filter((child): child is ASTNode => child !== null);

      // 如果子节点为空，删除整个元素节点
      if (cleanedChildren.length === 0) {
        return null;
      }

      // 合并相邻的相同格式的文本节点
      const mergedChildren = mergeAdjacentTextNodes(cleanedChildren);

      // 保留元素节点，即使只有一个子节点（保持格式化信息）
      return {
        ...node,
        children: mergedChildren
      };
    }
    return node;
  }

  return ast
    .map(cleanupNode)
    .filter((node): node is ASTNode => node !== null);
}

// 合并相邻的相同格式的文本节点
function mergeAdjacentTextNodes(nodes: ASTNode[]): ASTNode[] {
  if (nodes.length === 0) return nodes;

  const result: ASTNode[] = [];
  let current: TextNode | null = null;

  for (const node of nodes) {
    if (node.type === "text") {
      if (current &&
        JSON.stringify(current.marks) === JSON.stringify(node.marks)) {
        // 合并相同格式的文本节点
        current.value += node.value;
      } else {
        // 开始新的文本节点
        if (current) result.push(current);
        current = { ...node };
      }
    } else {
      // 非文本节点，先保存当前的文本节点
      if (current) {
        result.push(current);
        current = null;
      }
      result.push(node);
    }
  }

  // 保存最后一个文本节点
  if (current) result.push(current);

  return result;
}

// 合并空的文本节点（保持向后兼容）
export function mergeEmptyTextNodes(ast: ASTNode[]): ASTNode[] {
  return cleanupEmptyNodes(ast);
}

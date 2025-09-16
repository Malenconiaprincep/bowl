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

// 合并空的文本节点
export function mergeEmptyTextNodes(ast: ASTNode[]): ASTNode[] {
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

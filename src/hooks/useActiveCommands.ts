import { useState, useEffect } from 'react';
import type { ASTNode } from '../types/ast';
import type { Selection } from '../utils';
import { getTextNodes, findNodeAndOffsetBySelectionOffset } from '../utils';

/**
 * 管理工具栏按钮的激活状态
 */
export function useActiveCommands(ast: ASTNode[], selection: Selection) {
  const [activeCommands, setActiveCommands] = useState<string[]>([]);

  // 当 AST 或选区变化时，更新激活状态
  useEffect(() => {
    const textNodes = getTextNodes(ast);
    const { nodeIndex } = findNodeAndOffsetBySelectionOffset(textNodes, selection.start);
    const currentTextNode = textNodes[nodeIndex];

    if (currentTextNode && currentTextNode.marks) {
      setActiveCommands(currentTextNode.marks);
    } else {
      setActiveCommands([]);
    }
  }, [ast, selection.start]);

  return activeCommands;
}

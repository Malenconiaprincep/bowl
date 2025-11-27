import { useState, useEffect } from 'react';
import type { ContentNode } from '../types/ast';
import type { Selection } from '../utils';
import { getTextNodes, findNodeAndOffsetBySelectionOffset } from '../utils';

/**
 * 管理工具栏按钮的激活状态
 */
export function useActiveCommands(content: ContentNode[], selection: Selection) {
  const [activeCommands, setActiveCommands] = useState<string[]>([]);

  // 当内容或选区变化时，更新激活状态
  useEffect(() => {
    const textNodes = getTextNodes(content);
    const { nodeIndex } = findNodeAndOffsetBySelectionOffset(textNodes, selection.start);
    const currentTextNode = textNodes[nodeIndex];

    if (currentTextNode && currentTextNode.marks) {
      setActiveCommands(currentTextNode.marks);
    } else {
      setActiveCommands([]);
    }
  }, [content, selection.start]);

  return activeCommands;
}

// 格式化工具函数
export interface FormatInfo {
  type: 'bold' | 'italic' | 'underline';
  tag: string;
}

export const FORMAT_TAGS: Record<string, FormatInfo> = {
  bold: { type: 'bold', tag: 'strong' },
  italic: { type: 'italic', tag: 'em' },
  underline: { type: 'underline', tag: 'u' }
};

/**
 * 检测选区内容的格式状态
 */
export const detectFormatState = (
  container: HTMLElement,
  startOffset: number,
  endOffset: number
): Record<string, boolean> => {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );

  const formatState = {
    bold: true,
    italic: true,
    underline: true
  };

  let currentTextOffset = 0;
  const selectedNodes: Array<{ node: Node; start: number; end: number }> = [];

  // 收集选区内的所有文本节点
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const nodeLength = node.textContent?.length || 0;
    const nodeStart = currentTextOffset;
    const nodeEnd = currentTextOffset + nodeLength;

    // 检查节点是否与选区重叠
    if (nodeEnd > startOffset && nodeStart < endOffset) {
      selectedNodes.push({ node, start: nodeStart, end: nodeEnd });
    }

    currentTextOffset += nodeLength;
  }

  // 如果没有选中任何文本节点，返回 false
  if (selectedNodes.length === 0) {
    return { bold: false, italic: false, underline: false };
  }

  // 检查每个节点的格式，只有当所有节点都有格式时才返回 true
  for (const { node } of selectedNodes) {
    const nodeFormats = {
      bold: false,
      italic: false,
      underline: false
    };

    let parent = node.parentElement;
    while (parent && parent !== container) {
      const tagName = parent.tagName.toLowerCase();

      if (tagName === 'strong' || tagName === 'b') {
        nodeFormats.bold = true;
      }
      if (tagName === 'em' || tagName === 'i') {
        nodeFormats.italic = true;
      }
      if (tagName === 'u') {
        nodeFormats.underline = true;
      }

      parent = parent.parentElement;
    }

    // 如果当前节点缺少任何格式，更新全局格式状态
    if (!nodeFormats.bold) formatState.bold = false;
    if (!nodeFormats.italic) formatState.italic = false;
    if (!nodeFormats.underline) formatState.underline = false;
  }

  return formatState;
};

/**
 * 移除特定格式
 */
export const removeFormat = (
  html: string,
  formatType: 'bold' | 'italic' | 'underline'
): string => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  const tagsToRemove = getTagsForFormat(formatType);

  // 递归处理所有匹配的标签
  const removeTagsRecursive = (element: Element) => {
    const elementsToRemove: Element[] = [];

    tagsToRemove.forEach(tagName => {
      const elements = element.querySelectorAll(tagName);
      elements.forEach(el => elementsToRemove.push(el));
    });

    // 从内到外移除标签，保留内容和其他格式
    elementsToRemove.forEach(element => {
      const parent = element.parentNode;
      if (parent) {
        // 将子节点移动到父节点中，替换当前元素
        while (element.firstChild) {
          parent.insertBefore(element.firstChild, element);
        }
        parent.removeChild(element);
      }
    });
  };

  removeTagsRecursive(tempDiv);
  return tempDiv.innerHTML;
};

/**
 * 应用格式
 */
export const applyFormat = (
  html: string,
  formatType: 'bold' | 'italic' | 'underline'
): string => {
  const format = FORMAT_TAGS[formatType];
  if (!format) return html;

  return `<${format.tag}>${html}</${format.tag}>`;
};

/**
 * 获取格式对应的标签
 */
const getTagsForFormat = (formatType: 'bold' | 'italic' | 'underline'): string[] => {
  switch (formatType) {
    case 'bold':
      return ['strong', 'b'];
    case 'italic':
      return ['em', 'i'];
    case 'underline':
      return ['u'];
    default:
      return [];
  }
};

/**
 * 清理和优化HTML结构
 * 移除空标签、合并相邻的相同格式标签、优化嵌套结构
 */
export const cleanupHtml = (html: string): string => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // 1. 移除空的格式标签
  removeEmptyFormatTags(tempDiv);

  // 2. 合并相邻的相同格式标签
  mergeAdjacentSameTags(tempDiv);

  // 3. 优化嵌套的相同标签
  optimizeNestedSameTags(tempDiv);

  // 4. 再次移除可能产生的空标签
  removeEmptyFormatTags(tempDiv);

  return tempDiv.innerHTML;
};

/**
 * 移除空的格式标签
 */
const removeEmptyFormatTags = (container: Element): void => {
  const formatTags = ['strong', 'b', 'em', 'i', 'u'];

  let hasChanges = true;
  while (hasChanges) {
    hasChanges = false;

    formatTags.forEach(tagName => {
      const elements = container.querySelectorAll(tagName);
      elements.forEach(element => {
        // 如果标签内容为空或只包含空白字符
        if (!element.textContent?.trim()) {
          element.remove();
          hasChanges = true;
        }
      });
    });
  }
};

/**
 * 合并相邻的相同格式标签
 */
const mergeAdjacentSameTags = (container: Element): void => {
  const formatTags = ['strong', 'b', 'em', 'i', 'u'];

  formatTags.forEach(tagName => {
    let hasChanges = true;
    while (hasChanges) {
      hasChanges = false;

      const elements = container.querySelectorAll(tagName);
      elements.forEach(element => {
        const nextSibling = element.nextElementSibling;

        // 如果下一个元素是相同的标签
        if (nextSibling && nextSibling.tagName.toLowerCase() === tagName) {
          // 将下一个元素的内容移动到当前元素
          while (nextSibling.firstChild) {
            element.appendChild(nextSibling.firstChild);
          }
          nextSibling.remove();
          hasChanges = true;
        }
      });
    }
  });
};

/**
 * 优化嵌套的相同标签
 */
const optimizeNestedSameTags = (container: Element): void => {
  const formatTags = ['strong', 'b', 'em', 'i', 'u'];

  formatTags.forEach(tagName => {
    let hasChanges = true;
    while (hasChanges) {
      hasChanges = false;

      const elements = container.querySelectorAll(tagName);
      elements.forEach(element => {
        // 检查是否有嵌套的相同标签（不一定是直接嵌套）
        const nestedSame = element.querySelector(tagName);
        if (nestedSame && nestedSame !== element) {
          // 将嵌套标签的内容提升到其父级
          const parent = nestedSame.parentNode;
          while (nestedSame.firstChild) {
            parent?.insertBefore(nestedSame.firstChild, nestedSame);
          }
          nestedSame.remove();
          hasChanges = true;
        }
      });
    }
  });
};

/**
 * 智能格式化：根据当前状态决定添加还是移除格式，并清理HTML
 */
export const toggleFormat = (
  selectedHtml: string,
  formatType: 'bold' | 'italic' | 'underline',
  currentState: boolean
): string => {
  let result: string;

  if (currentState) {
    // 如果已有格式，移除它
    result = removeFormat(selectedHtml, formatType);
  } else {
    // 如果没有格式，添加它
    result = applyFormat(selectedHtml, formatType);
  }

  // 清理和优化HTML结构
  return cleanupHtml(result);
};

/**
 * 智能格式切换：更智能地处理格式的添加和移除
 */
export const smartToggleFormat = (
  selectedHtml: string,
  formatType: 'bold' | 'italic' | 'underline'
): string => {
  // 检查选中的HTML是否已经包含目标格式
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = selectedHtml;

  const formatTags = getTagsForFormat(formatType);
  const hasFormat = formatTags.some(tag => tempDiv.querySelector(tag));

  if (hasFormat) {
    // 如果已有格式，移除它
    return cleanupHtml(removeFormat(selectedHtml, formatType));
  } else {
    // 如果没有格式，添加它
    return cleanupHtml(applyFormat(selectedHtml, formatType));
  }
};

/**
 * 处理复杂的嵌套格式，并清理HTML
 */
export const handleNestedFormat = (
  container: HTMLElement,
  startOffset: number,
  endOffset: number,
  formatType: 'bold' | 'italic' | 'underline'
): string => {
  // 获取选区的HTML内容
  const range = document.createRange();
  const startPos = getNodeAndOffsetFromTextOffset(container, startOffset);
  const endPos = getNodeAndOffsetFromTextOffset(container, endOffset);

  if (!startPos || !endPos) return '';

  range.setStart(startPos.node, startPos.offset);
  range.setEnd(endPos.node, endPos.offset);

  const selectedContent = range.cloneContents();
  const tempDiv = document.createElement('div');
  tempDiv.appendChild(selectedContent);

  const selectedHtml = tempDiv.innerHTML;

  // 使用智能格式切换，直接检查HTML内容而不是依赖detectFormatState
  const result = smartToggleFormat(selectedHtml, formatType);

  return result;
};

/**
 * 根据文本偏移量获取节点和偏移量
 */
const getNodeAndOffsetFromTextOffset = (
  container: HTMLElement,
  textOffset: number
): { node: Node; offset: number } | null => {
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );

  let currentOffset = 0;

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const nodeLength = node.textContent?.length || 0;

    if (currentOffset + nodeLength >= textOffset) {
      return {
        node,
        offset: textOffset - currentOffset
      };
    }
    currentOffset += nodeLength;
  }

  return null;
};

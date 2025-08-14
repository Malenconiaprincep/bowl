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
 * 检测格式状态 - 简化版本
 */
export const detectFormatState = (html: string): Record<string, boolean> => {
  if (!html.trim()) {
    return { bold: false, italic: false, underline: false };
  }

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  return {
    bold: tempDiv.querySelector('strong, b') !== null,
    italic: tempDiv.querySelector('em, i') !== null,
    underline: tempDiv.querySelector('u') !== null
  };
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
 * 安全地展开元素，保持子元素顺序
 */
const unwrapElement = (element: Element): void => {
  const parent = element.parentNode;
  if (!parent) return;

  // 创建文档片段来保持顺序
  const fragment = document.createDocumentFragment();

  // 按顺序移动所有子节点到片段中
  while (element.firstChild) {
    fragment.appendChild(element.firstChild);
  }

  // 用片段替换原元素
  parent.replaceChild(fragment, element);
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

  // 使用更安全的方式移除标签
  tagsToRemove.forEach(tagName => {
    const elements = Array.from(tempDiv.querySelectorAll(tagName));

    // 从最深层开始处理，避免影响父子关系
    elements.reverse().forEach(element => {
      unwrapElement(element);
    });
  });

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
 * 清理HTML - 移除空标签和规范化格式
 */
export const cleanupHtml = (html: string): string => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // 移除空的格式标签
  const emptyTags = tempDiv.querySelectorAll('strong:empty, em:empty, u:empty, b:empty, i:empty');
  emptyTags.forEach(tag => tag.remove());

  // 合并相邻的相同格式标签
  const formatTags = ['strong', 'em', 'u', 'b', 'i'];
  formatTags.forEach(tagName => {
    let changed = true;
    while (changed) {
      changed = false;
      const tags = tempDiv.querySelectorAll(tagName);

      tags.forEach(tag => {
        const nextSibling = tag.nextElementSibling;
        if (nextSibling && nextSibling.tagName.toLowerCase() === tagName) {
          // 合并相邻的相同标签
          while (nextSibling.firstChild) {
            tag.appendChild(nextSibling.firstChild);
          }
          nextSibling.remove();
          changed = true;
        }
      });
    }
  });

  return tempDiv.innerHTML;
};

/**
 * 基础格式切换
 */
export const toggleFormat = (
  selectedHtml: string,
  formatType: 'bold' | 'italic' | 'underline'
): string => {
  const formatState = detectFormatState(selectedHtml);
  const hasFormat = formatState[formatType];

  if (hasFormat) {
    return removeFormat(selectedHtml, formatType);
  } else {
    return applyFormat(selectedHtml, formatType);
  }
};

/**
 * 智能格式切换 - 解决元素顺序问题
 */
export const smartToggleFormat = (
  html: string,
  formatType: 'bold' | 'italic' | 'underline'
): string => {
  // 检测当前是否有该格式
  const hasFormat = detectFormatState(html)[formatType];

  if (hasFormat) {
    // 检查是否整个内容都被该格式包围
    if (isFullyFormatted(html, formatType)) {
      // 如果整个内容都被格式包围，则移除格式
      return smartRemoveFormat(html, formatType);
    } else {
      // 如果只有部分内容有格式，则添加外层格式
      return smartApplyFormat(html, formatType);
    }
  } else {
    // 如果没有格式，添加它
    return smartApplyFormat(html, formatType);
  }
};

/**
 * 智能应用格式 - 保持元素顺序
 */
export const smartApplyFormat = (
  html: string,
  formatType: 'bold' | 'italic' | 'underline'
): string => {
  const format = FORMAT_TAGS[formatType];
  if (!format) return html;

  // 简单包装，保持内部结构不变
  return `<${format.tag}>${html}</${format.tag}>`;
};

/**
 * 智能移除格式 - 保持元素顺序和其他格式
 */
export const smartRemoveFormat = (
  html: string,
  formatType: 'bold' | 'italic' | 'underline'
): string => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  const tagsToRemove = getTagsForFormat(formatType);

  // 使用更安全的方式移除标签
  tagsToRemove.forEach(tagName => {
    const elements = Array.from(tempDiv.querySelectorAll(tagName));

    // 从最深层开始处理，避免影响父子关系
    elements.reverse().forEach(element => {
      unwrapElement(element);
    });
  });

  return cleanupHtml(tempDiv.innerHTML);
};

/**
 * 检查是否整个内容都被某种格式包围
 */
export const isFullyFormatted = (
  html: string,
  formatType: 'bold' | 'italic' | 'underline'
): boolean => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  const tagsToCheck = getTagsForFormat(formatType);

  // 检查根级是否只有一个对应格式的元素，且包含所有内容
  const rootChildren = Array.from(tempDiv.childNodes);

  if (rootChildren.length === 1) {
    const onlyChild = rootChildren[0];
    if (onlyChild.nodeType === Node.ELEMENT_NODE) {
      const element = onlyChild as Element;
      return tagsToCheck.includes(element.tagName.toLowerCase());
    }
  }

  return false;
};

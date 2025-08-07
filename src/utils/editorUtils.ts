// 编辑器工具函数

/**
 * 获取选区范围内的文本
 */
export const getSelectedText = (): string => {
  const selection = window.getSelection();
  return selection ? selection.toString() : '';
};

/**
 * 检查当前选区是否在指定元素内
 */
export const isSelectionInElement = (element: HTMLElement): boolean => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;
  
  const range = selection.getRangeAt(0);
  return element.contains(range.commonAncestorContainer);
};

/**
 * 保存当前选区
 */
export const saveSelection = (): Range | null => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  
  return selection.getRangeAt(0).cloneRange();
};

/**
 * 恢复选区
 */
export const restoreSelection = (range: Range | null): void => {
  if (!range) return;
  
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
};

/**
 * 保存光标位置信息（包含文本偏移量）
 */
export const saveCursorPosition = (container: HTMLElement): { offset: number; node: Node | null } => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return { offset: 0, node: null };
  }

  const range = selection.getRangeAt(0);
  const containerNode = range.startContainer;
  
  // 计算在容器中的文本偏移量
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    null
  );
  
  let textOffset = 0;
  let found = false;
  
  while (walker.nextNode() && !found) {
    const node = walker.currentNode;
    if (node === containerNode) {
      textOffset += range.startOffset;
      found = true;
    } else {
      textOffset += node.textContent?.length || 0;
    }
  }
  
  return { offset: textOffset, node: containerNode };
};

/**
 * 恢复光标位置
 */
export const restoreCursorPosition = (
  container: HTMLElement, 
  savedPosition: { offset: number; node: Node | null }
): void => {
  if (savedPosition.offset < 0) return;
  
  try {
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    let currentOffset = 0;
    let targetNode = null;
    let targetOffset = 0;
    
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const nodeLength = node.textContent?.length || 0;
      
      if (currentOffset + nodeLength >= savedPosition.offset) {
        targetNode = node;
        targetOffset = savedPosition.offset - currentOffset;
        break;
      }
      currentOffset += nodeLength;
    }
    
    if (targetNode) {
      const newRange = document.createRange();
      newRange.setStart(targetNode, targetOffset);
      newRange.setEnd(targetNode, targetOffset);
      
      const newSelection = window.getSelection();
      newSelection?.removeAllRanges();
      newSelection?.addRange(newRange);
      
      // 确保容器获得焦点
      container.focus();
    }
  } catch (error) {
    console.error('恢复光标位置失败:', error);
  }
};

/**
 * 安全地更新编辑器内容并保持光标位置
 */
export const updateEditorContent = (
  container: HTMLElement,
  newContent: string,
  currentContent: string
): void => {
  if (container.innerHTML === newContent) return;
  
  // 保存当前光标位置
  const savedPosition = saveCursorPosition(container);
  
  // 更新内容
  container.innerHTML = newContent;
  
  // 恢复光标位置
  setTimeout(() => {
    restoreCursorPosition(container, savedPosition);
  }, 0);
};

/**
 * 检查当前选区是否应用了指定格式
 */
export const hasFormat = (format: string): boolean => {
  return document.queryCommandState(format);
};

/**
 * 清理HTML内容，移除不必要的标签
 */
export const cleanHtml = (html: string): string => {
  // 移除空的段落
  html = html.replace(/<p>\s*<\/p>/g, '');
  
  // 移除空的span标签
  html = html.replace(/<span>\s*<\/span>/g, '');
  
  // 移除空的div标签
  html = html.replace(/<div>\s*<\/div>/g, '');
  
  return html.trim();
};

/**
 * 获取纯文本内容
 */
export const getPlainText = (html: string): string => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}; 
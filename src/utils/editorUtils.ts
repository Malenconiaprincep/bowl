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
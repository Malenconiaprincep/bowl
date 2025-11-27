import { useState, useRef, useCallback } from "react";
import type { ASTNode } from "../types/ast";
import type { Selection } from "../utils";
import { findSelectionOffsetFromDOM, getTextNodes, findNodeAndOffsetBySelectionOffset, hasSelection } from "../utils";

export function useCursorPosition(ast: ASTNode[]) {
  const [selection, setSelection] = useState<Selection>({
    start: 0,
    end: 0
  });
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingFromState = useRef(false);
  const pendingSelection = useRef<Selection | null>(null);
  const isComposing = useRef(false);
  // 用于在组合输入结束时强制重建 DOM，避免 React diff 与浏览器修改的 DOM 冲突
  const [compositionKey, setCompositionKey] = useState(0);

  // 恢复光标位置（使用 selection 参数）
  const restoreCursorPosition = useCallback((selection: Selection) => {
    if (!editorRef.current) return;

    const textNodes = getTextNodes(ast);
    const { nodeIndex, textOffset } = findNodeAndOffsetBySelectionOffset(textNodes, selection.start);
    const targetNode = textNodes[nodeIndex];

    if (targetNode) {
      // 找到对应的 DOM 文本节点
      const walker = document.createTreeWalker(
        editorRef.current,
        NodeFilter.SHOW_TEXT,
        null
      );

      let currentIndex = 0;
      let targetTextNode = null;

      while (walker.nextNode()) {
        if (currentIndex === nodeIndex) {
          targetTextNode = walker.currentNode;
          break;
        }
        currentIndex++;
      }

      if (targetTextNode) {
        const range = document.createRange();
        const offset = Math.min(textOffset, targetTextNode.textContent?.length || 0);
        range.setStart(targetTextNode, offset);
        range.setEnd(targetTextNode, offset);

        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }, [ast]);

  // 恢复选区
  const restoreSelection = useCallback((selection: Selection) => {
    if (!editorRef.current || !hasSelection(selection)) return;

    const textNodes = getTextNodes(ast);
    const startNodeInfo = findNodeAndOffsetBySelectionOffset(textNodes, selection.start);
    const endNodeInfo = findNodeAndOffsetBySelectionOffset(textNodes, selection.end);

    if (!startNodeInfo || !endNodeInfo) return;

    // 找到起始和结束的 DOM 文本节点
    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentIndex = 0;
    let startTextNode = null;
    let endTextNode = null;

    while (walker.nextNode()) {
      if (currentIndex === startNodeInfo.nodeIndex) {
        startTextNode = walker.currentNode;
      }
      if (currentIndex === endNodeInfo.nodeIndex) {
        endTextNode = walker.currentNode;
        break;
      }
      currentIndex++;
    }

    if (startTextNode && endTextNode) {
      const range = document.createRange();
      const startOffset = Math.min(startNodeInfo.textOffset, startTextNode.textContent?.length || 0);
      const endOffset = Math.min(endNodeInfo.textOffset, endTextNode.textContent?.length || 0);

      range.setStart(startTextNode, startOffset);
      range.setEnd(endTextNode, endOffset);

      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [ast]);


  // 处理选区变化
  const handleSelectionChange = useCallback(() => {
    if (!editorRef.current || isUpdatingFromState.current || isComposing.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const hasSelection = !range.collapsed;

    if (hasSelection) {
      // 计算选区的开始和结束位置
      const startPosition = findSelectionOffsetFromDOM(editorRef.current, ast, range.startContainer, range.startOffset);
      const endPosition = findSelectionOffsetFromDOM(editorRef.current, ast, range.endContainer, range.endOffset);

      console.log('选区信息:', {
        startContainer: range.startContainer,
        startOffset: range.startOffset,
        endContainer: range.endContainer,
        endOffset: range.endOffset,
        startPosition,
        endPosition
      });

      setSelection({
        start: startPosition,
        end: endPosition
      });
    } else {
      // 计算光标位置
      const cursorPos = findSelectionOffsetFromDOM(editorRef.current, ast, range.startContainer, range.startOffset);

      console.log('光标信息:', {
        container: range.startContainer,
        offset: range.startOffset,
        textContent: range.startContainer.textContent,
        cursorPos
      });

      // 更新选区信息，光标时 start 和 end 相同
      setSelection({
        start: cursorPos,
        end: cursorPos
      });

    }
  }, [ast]);


  // 处理组合输入开始
  const handleCompositionStart = useCallback(() => {
    console.log('组合输入开始');
    isComposing.current = true;
  }, []);

  // 处理组合输入结束
  const handleCompositionEnd = useCallback(() => {
    console.log('组合输入结束');
    isComposing.current = false;
    // 递增 compositionKey，强制 React 重建 contentEditable DOM
    // 这样可以避免 React diff 与浏览器修改的 DOM 产生冲突
    setCompositionKey(prev => prev + 1);
    // 组合输入结束后，重新计算光标位置
    setTimeout(() => {
      handleSelectionChange();
    }, 0);
  }, [handleSelectionChange]);

  return {
    selection,
    setSelection,
    editorRef,
    isUpdatingFromState,
    pendingSelection,
    restoreCursorPosition,
    restoreSelection,
    handleSelectionChange,
    handleCompositionStart,
    handleCompositionEnd,
    isComposing,
    compositionKey // 用于组合输入结束后强制重建 DOM
  };
}

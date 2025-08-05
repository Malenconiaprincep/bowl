import { useState, useCallback, useRef, useEffect } from 'react';
import type { EditorState, SelectionState, EditorCommand } from '../types/editor';

export const useEditor = (initialContent = '') => {
  const [editorState, setEditorState] = useState<EditorState>({
    content: initialContent,
    selection: { start: 0, end: 0, collapsed: true },
    history: { past: [], present: initialContent, future: [] }
  });

  const editorRef = useRef<HTMLDivElement>(null);

  // 获取当前选区
  const getSelection = useCallback((): SelectionState => {
    const selection = window.getSelection();
    if (!selection || !editorRef.current) {
      return { start: 0, end: 0, collapsed: true };
    }

    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);

    const start = preCaretRange.toString().length;
    const end = start + range.toString().length;

    return {
      start,
      end,
      collapsed: start === end
    };
  }, []);

  // 设置选区
  const setSelection = useCallback((start: number, end: number) => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    const range = document.createRange();

    let currentPos = 0;
    let startNode: Node | null = null;
    let startOffset = 0;
    let endNode: Node | null = null;
    let endOffset = 0;

    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node: Node | null;
    while (node = walker.nextNode()) {
      const nodeLength = node.textContent?.length || 0;

      if (!startNode && currentPos + nodeLength >= start) {
        startNode = node;
        startOffset = start - currentPos;
      }

      if (!endNode && currentPos + nodeLength >= end) {
        endNode = node;
        endOffset = end - currentPos;
        break;
      }

      currentPos += nodeLength;
    }

    if (startNode && endNode) {
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, []);

  // 执行编辑器命令
  const executeCommand = useCallback((command: EditorCommand) => {
    switch (command.type) {
      case 'bold':
        document.execCommand('bold', false);
        break;
      case 'italic':
        document.execCommand('italic', false);
        break;
      case 'underline':
        document.execCommand('underline', false);
        break;
      case 'insertText':
        if (command.payload) {
          document.execCommand('insertText', false, command.payload);
        }
        break;
      case 'deleteContent':
        document.execCommand('delete', false);
        break;
    }

    // 更新编辑器状态
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setEditorState(prev => ({
        ...prev,
        content: newContent,
        selection: getSelection()
      }));
    }
  }, [getSelection]);

  // 处理编辑器内容变化
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setEditorState(prev => ({
        ...prev,
        content: newContent,
        selection: getSelection(),
        history: {
          ...prev.history,
          past: [...prev.history.past, prev.history.present],
          present: newContent,
          future: []
        }
      }));
    }
  }, [getSelection]);

  // 处理选区变化
  const handleSelectionChange = useCallback(() => {
    setEditorState(prev => ({
      ...prev,
      selection: getSelection()
    }));
  }, [getSelection]);

  // 监听选区变化
  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  return {
    editorRef,
    editorState,
    executeCommand,
    handleInput,
    getSelection,
    setSelection
  };
}; 
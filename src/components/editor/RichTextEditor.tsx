import React, { useEffect } from 'react';
import { useEditor } from '../../hooks/useEditor';
import type { EditorProps } from '../../types/editor';
import '../../styles/editor.css';

export const RichTextEditor: React.FC<EditorProps> = ({
  initialContent = '',
  placeholder = '开始输入...',
  onChange,
  onSelectionChange,
  onReady
}) => {
  const {
    editorRef,
    editorState,
    executeCommand,
    handleInput
  } = useEditor(initialContent);

  // 监听内容变化
  useEffect(() => {
    if (onChange) {
      onChange(editorState.content);
    }
  }, [editorState.content, onChange]);

  // 监听选区变化
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(editorState.selection);
    }
  }, [editorState.selection, onSelectionChange]);

  // 通知父组件编辑器已准备就绪
  useEffect(() => {
    if (onReady) {
      onReady(executeCommand);
    }
  }, [executeCommand, onReady]);

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 处理快捷键
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          executeCommand({ type: 'bold' });
          break;
        case 'i':
          e.preventDefault();
          executeCommand({ type: 'italic' });
          break;
        case 'u':
          e.preventDefault();
          executeCommand({ type: 'underline' });
          break;
      }
    }
  };

  // 处理粘贴事件，清理格式
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    executeCommand({ type: 'insertText', payload: text });
  };

  return (
    <div className="rich-text-editor">
      <div
        ref={editorRef}
        className="editor-content"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        dangerouslySetInnerHTML={{ __html: editorState.content }}
      />
    </div>
  );
}; 
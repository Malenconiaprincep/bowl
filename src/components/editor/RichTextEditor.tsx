import React, { useEffect, useRef } from "react";
import { useEditor } from "../../hooks/useEditor";
import type { EditorProps } from "../../types/editor";
import "../../styles/editor.css";

export const RichTextEditor: React.FC<EditorProps> = ({
  initialContent = "",
  placeholder = "开始输入...",
  onReady,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const {
    editorState,
    handleInput,
    updateContent,
    executeCommand,
    setEditorRef
  } = useEditor(initialContent);

  console.log('editorState', editorState);

  // 设置编辑器引用
  useEffect(() => {
    setEditorRef(editorRef.current);
  }, [setEditorRef]);

  // 传递 executeCommand 给父组件
  useEffect(() => {
    if (onReady) {
      onReady(executeCommand);
    }
  }, [onReady, executeCommand]);

  // 初始化内容
  useEffect(() => {
    if (initialContent) {
      updateContent(initialContent);
    }
  }, [initialContent, updateContent]);



  return (
    <div>
      {/* 测试按钮 */}
      <div style={{ marginBottom: '10px', padding: '10px' }}>
        <span style={{ marginLeft: '10px', fontSize: '12px', color: '#666' }}>
          <p>内容长度: {editorState.content.length}</p>
          <p>{editorState.content}</p>
        </span>
      </div>
      <div className="rich-text-editor">
        <div
          ref={editorRef}
          className="editor-content"
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          data-placeholder={placeholder}
        />
      </div>
    </div>

  );
};

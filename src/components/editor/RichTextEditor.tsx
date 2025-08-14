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

  // 测试外部更新的按钮
  const handleExternalUpdate = () => {
    updateContent(editorState.content + '<strong>外部添加的内容</strong>');
  };

  return (
    <div>
      {/* 测试按钮 */}
      <div style={{ marginBottom: '10px', padding: '10px' }}>
        <div onClick={handleExternalUpdate} style={{ padding: '5px 10px', border: '1px solid #ddd' }}>
          外部更新内容（测试数据驱动）
        </div>
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


      <div contentEditable={true} dangerouslySetInnerHTML={{ __html: `这是<strong><em>加粗斜体</em></strong>文本` }}>

      </div>


    </div>

  );
};

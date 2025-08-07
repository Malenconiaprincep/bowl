import React, { useEffect, useRef } from "react";
import { useEditor } from "../../hooks/useEditor";
import type { EditorProps } from "../../types/editor";
import { updateEditorContent } from "../../utils/editorUtils";
import "../../styles/editor.css";

export const RichTextEditor: React.FC<EditorProps> = ({
  initialContent = "",
  placeholder = "开始输入...",
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const { editorState, setContentState, handleInput } = useEditor(initialContent);

  // 初始化内容
  useEffect(() => {
    if (editorRef.current && initialContent) {
      editorRef.current.innerHTML = initialContent;
    }
  }, [initialContent]);

  // 状态同步：当 React 状态变化时，同步到 DOM
  useEffect(() => {
    if (editorRef.current) {
      updateEditorContent(editorRef.current, editorState.content, editorRef.current.innerHTML);
    }
  }, [editorState.content]);

  const handleInputDirect = (event: React.ChangeEvent<HTMLDivElement>) => {
    // 直接更新状态，不通过 dangerouslySetInnerHTML
    handleInput(event);
  };

  // 测试外部同步的按钮
  const handleExternalUpdate = () => {
    // 模拟外部更新内容（比如工具栏按钮）
    setContentState(prev => prev + '<strong>外部添加的内容</strong>');
  };

  console.log(editorState.content);

  return (
    <div className="rich-text-editor">
      {/* 添加测试按钮 */}
      <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f0f0f0' }}>
        <button onClick={handleExternalUpdate} style={{ padding: '5px 10px' }}>
          外部更新内容（测试光标保持）
        </button>
        <span style={{ marginLeft: '10px', fontSize: '12px', color: '#666' }}>
          点击按钮后，光标应该保持在原位置
        </span>
      </div>

      <div
        ref={editorRef}
        className="editor-content"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInputDirect}
        data-placeholder={placeholder}
      />
    </div>
  );
};

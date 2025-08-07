import React, { useEffect, useRef } from "react";
import { useEditor } from "../../hooks/useEditor";
import type { EditorProps } from "../../types/editor";
import "../../styles/editor.css";

export const RichTextEditor: React.FC<EditorProps> = ({
  initialContent = "",
  placeholder = "开始输入...",
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const { editorState, handleInput } = useEditor(initialContent);

  // 初始化内容
  useEffect(() => {
    if (editorRef.current && initialContent) {
      editorRef.current.innerHTML = initialContent;
    }
  }, [initialContent]);

  const handleInputDirect = (event: React.ChangeEvent<HTMLDivElement>) => {
    // 直接更新状态，不通过 dangerouslySetInnerHTML
    handleInput(event);
  };

  console.log(editorState.content);

  return (
    <div className="rich-text-editor">
      <div
        className="editor-content"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInputDirect}
        data-placeholder={placeholder}
      />
    </div>
  );
};

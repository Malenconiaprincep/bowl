import React from 'react';
import { useEditor } from '../../hooks/useEditor';
import type { EditorProps } from '../../types/editor';
import '../../styles/editor.css';

export const RichTextEditor: React.FC<EditorProps> = ({
  initialContent = '',
  placeholder = '开始输入...',
}) => {
  const {
    editorState,
    handleInput,
  } = useEditor(initialContent);
  

  return (
    <div className="rich-text-editor">
      <div
        className="editor-content"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        dangerouslySetInnerHTML={{ __html: editorState.content }}
      />
    </div>
  );
}; 
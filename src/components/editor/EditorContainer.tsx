import React from 'react';
import { RichTextEditor } from './RichTextEditor';

interface EditorContainerProps {
  initialContent?: string;
  value?: string;
  placeholder?: string;
}

export const EditorContainer: React.FC<EditorContainerProps> = ({
  initialContent = '',
  value,
  placeholder,
}) => {

  // 从 RichTextEditor 获取 executeCommand 函数

  return (
    <div className="editor-container">
      <RichTextEditor
        initialContent={initialContent}
        value={value}
        placeholder={placeholder}
      />
    </div>
  );
}; 
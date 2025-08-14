import React, { useState } from 'react';
import { RichTextEditor } from './RichTextEditor';
import { EditorToolbar } from '../toolbar/EditorToolbar';
import type { EditorCommand } from '../../types/editor';

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
  const [executeCommand, setExecuteCommand] = useState<((command: EditorCommand) => void) | null>(null);

  const handleEditorReady = (commandExecutor: (command: EditorCommand) => void) => {
    setExecuteCommand(() => commandExecutor);
  };

  const handleToolbarCommand = (command: EditorCommand) => {
    if (executeCommand) {
      executeCommand(command);
    }
  };

  return (
    <div className="editor-container">
      <EditorToolbar onCommand={handleToolbarCommand} />
      <RichTextEditor
        initialContent={initialContent}
        value={value}
        placeholder={placeholder}
        onReady={handleEditorReady}
      />
    </div>
  );
}; 
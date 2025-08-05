import React, { useState, useCallback } from 'react';
import { RichTextEditor } from './RichTextEditor';
import { EditorToolbar } from '../toolbar/EditorToolbar';
import type { EditorCommand } from '../../types/editor';

interface EditorContainerProps {
  initialContent?: string;
  placeholder?: string;
  onChange?: (content: string) => void;
}

export const EditorContainer: React.FC<EditorContainerProps> = ({
  initialContent = '',
  placeholder,
  onChange
}) => {
  const [activeCommands, setActiveCommands] = useState<string[]>([]);
  const [executeCommand, setExecuteCommand] = useState<((command: EditorCommand) => void) | null>(null);

  // 处理工具栏命令
  const handleToolbarCommand = useCallback((command: EditorCommand) => {
    if (executeCommand) {
      executeCommand(command);
    }

    // 更新活动状态
    setActiveCommands(prev => {
      const isActive = prev.includes(command.type);
      if (isActive) {
        return prev.filter(cmd => cmd !== command.type);
      } else {
        return [...prev, command.type];
      }
    });
  }, [executeCommand]);

  // 从 RichTextEditor 获取 executeCommand 函数
  const handleEditorReady = useCallback((commandExecutor: (command: EditorCommand) => void) => {
    setExecuteCommand(() => commandExecutor);
  }, []);

  return (
    <div className="editor-container">
      <EditorToolbar
        onCommand={handleToolbarCommand}
        activeCommands={activeCommands}
      />
      <RichTextEditor
        initialContent={initialContent}
        placeholder={placeholder}
        onChange={onChange}
        onReady={handleEditorReady}
      />
    </div>
  );
}; 
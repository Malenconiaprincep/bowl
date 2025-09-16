import React from 'react';
import type { EditorCommand, ToolbarButton } from '../../types/editor';
import '../../styles/toolbar.css';

interface EditorToolbarProps {
  onCommand: (command: EditorCommand) => void;
  activeCommands?: string[];
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onCommand,
  activeCommands = []
}) => {
  const toolbarButtons: ToolbarButton[] = [
    {
      id: 'bold',
      label: '加粗',
      icon: 'B',
      command: { type: 'bold' }
    },
    {
      id: 'italic',
      label: '斜体',
      icon: 'I',
      command: { type: 'italic' }
    },
    {
      id: 'underline',
      label: '下划线',
      icon: 'U',
      command: { type: 'underline' }
    },
    {
      id: 'strikethrough',
      label: '删除线',
      icon: 'S',
      command: { type: 'strikethrough' }
    }
  ];

  const handleButtonClick = (button: ToolbarButton) => {
    onCommand(button.command);
  };

  return (
    <div className="editor-toolbar">
      {toolbarButtons.map((button) => (
        <button
          key={button.id}
          className={`toolbar-button ${activeCommands.includes(button.command.type) ? 'active' : ''}`}
          onClick={() => handleButtonClick(button)}
          title={button.label}
        >
          <span className="button-icon">{button.icon}</span>
        </button>
      ))}
    </div>
  );
}; 
// 富文本编辑器的核心类型定义

export interface EditorState {
  content: string;
  selection: SelectionState;
  history: HistoryState;
}

export interface SelectionState {
  start: number;
  end: number;
  collapsed: boolean;
}

export interface HistoryState {
  past: string[];
  present: string;
  future: string[];
}

export interface EditorCommand {
  type: 'bold' | 'italic' | 'underline' | 'insertText' | 'deleteContent';
  payload?: string;
}

export interface ToolbarButton {
  id: string;
  label: string;
  icon: string;
  command: EditorCommand;
  isActive?: boolean;
}

export interface EditorProps {
  initialContent?: string;
  placeholder?: string;
  onChange?: (content: string) => void;
  onSelectionChange?: (selection: SelectionState) => void;
  onReady?: (executeCommand: (command: EditorCommand) => void) => void;
} 
import { useState, useCallback } from 'react';

export const useEditor = (initialContent = '') => {
  const [content, setContentState] = useState(initialContent);

  // 处理编辑器内容变化
  const handleInput = useCallback((event: React.ChangeEvent<HTMLDivElement>) => {
    setContentState(event.target.innerHTML);
  }, []);

  return {
    editorState: {
      content,
    },
    handleInput,
  };
}; 
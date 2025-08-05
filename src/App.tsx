import React, { useState } from 'react';
import { EditorContainer } from './components/editor/EditorContainer';
import './App.css';

function App() {
  const [content, setContent] = useState('');

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    console.log('编辑器内容变化:', newContent);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>富文本编辑器</h1>
        <p>基于 React + contentEditable 实现</p>
      </header>
      
      <main>
        <EditorContainer
          initialContent="<p>欢迎使用富文本编辑器！</p><p>您可以：</p><ul><li>使用工具栏按钮进行格式化</li><li>使用快捷键 Ctrl+B (加粗)、Ctrl+I (斜体)、Ctrl+U (下划线)</li><li>选择文本后应用格式</li></ul>"
          placeholder="开始输入您的内容..."
          onChange={handleContentChange}
        />
        
        <div className="content-preview">
          <h3>内容预览：</h3>
          <div 
            className="preview-content"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </main>
    </div>
  );
}

export default App;

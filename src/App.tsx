import "./App.css";
import PageBlock from "./blocks/page";
import type { Block } from "./types/blocks";
import { v4 as uuidv4 } from 'uuid';
import { useYjs } from "./hooks/useYjs";

// 初始数据定义
const initialBlocks: Block[] = [
  {
    type: "paragraph",
    id: uuidv4(),
    content: [{
      type: "element",
      tag: "p",
      children: [
        { type: "text", value: "Hello        " },
        // { type: "text", value: "world", marks: ["b"] },
        // { type: "text", value: "! " },
      ],
    }],
  },
  {
    type: "paragraph",
    id: uuidv4(),
    content: [{
      type: "element",
      tag: "p",
      children: [
        { type: "text", value: "Hello " },
        { type: "text", value: "world", marks: ["b"] },
        { type: "text", value: "! " },
      ],
    }],
  },
];

function App() {
  // 使用 yjs hook 管理数据
  const { blocks, doc, dispatch } = useYjs({ initialBlocks });

  // doc 可以用于协同编辑，传递给 WebSocket provider 等
  console.log('Y.Doc:', doc);

  return (
    <div className="App">
      <PageBlock blocks={blocks} dispatch={dispatch} />
    </div>
  );
}

export default App;

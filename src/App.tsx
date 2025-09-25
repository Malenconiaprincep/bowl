import "./App.css";
import PageBlock from "./blocks/page";
import type { Block } from "./types/blocks";

function App() {

  const initialBlocks: Block[] = [
    {
      type: "paragraph",
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
    {
      type: "paragraph",
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

  return (
    <div className="App">
      <PageBlock initialBlocks={initialBlocks} />
    </div>
  );
}

export default App;

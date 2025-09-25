import TextBlock from "../blocks/text";
import type { Block } from "../types/blocks";
import type { ASTNode } from "../types/ast";

interface BlockContainerProps {
  block: Block;
  blockIndex: number;
  onInsertBlock?: (blockIndex: number, newBlock: Block) => void;
  onUpdateBlock?: (blockIndex: number, newContent: ASTNode[]) => void;
}

export default function BlockContainer({
  block,
  blockIndex,
  onInsertBlock,
  onUpdateBlock
}: BlockContainerProps) {

  let component = null

  console.log(JSON.stringify(block.content), '>>>1')
  switch (block.type) {
    // case "media":
    //   return <MediaBlock block={block} />;

    case "paragraph":
    case "heading":
      component = (
        <TextBlock
          block={block}
          blockIndex={blockIndex}
          onInsertBlock={onInsertBlock}
          onUpdateBlock={onUpdateBlock}
        />
      );
      break;
    default:
      component = <div>Unknown block type: {block.type}</div>;
      break;
  }


  return <div key={block.id} data-block-id={block.id}>
    {component}
  </div>
}
import TextBlock from "../blocks/text";
import type { Block } from "../types/blocks";

interface BlockContainerProps {
  block: Block;
}

export default function BlockContainer({ block }: BlockContainerProps) {
  switch (block.type) {
    // case "paragraph":
    //   return <ParagraphBlock block={block} />;
    // case "heading":
    //   return <HeadingBlock block={block} />;
    // case "media":
    //   return <MediaBlock block={block} />;

    case "paragraph":
    case "heading":
      return <TextBlock block={block} />;
    default:
      return <div>Unknown block type: {block.type}</div>;
  }
}
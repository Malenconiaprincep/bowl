import type { ContentNode } from "./ast";


export type ParagraphBlock = {
  type: "paragraph";
  content: ContentNode[];
};

export type HeadingBlock = {
  type: "heading";
  content: ContentNode[];
};

export type MediaBlock = {
  type: "media";
  content: string;
};


export type TextBlock = ParagraphBlock | HeadingBlock;

export type Blocks = MediaBlock | TextBlock;

export type Block = Blocks & {
  id: string; // 改为必需的 id
};
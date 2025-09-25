import type { ASTNode } from "./ast";


export type ParagraphBlock = {
  type: "paragraph";
  content: ASTNode[];
};

export type HeadingBlock = {
  type: "heading";
  content: ASTNode[];
};

export type MediaBlock = {
  type: "media";
  content: string;
};


export type TextBlock = ParagraphBlock | HeadingBlock;

export type Block = MediaBlock | TextBlock;
import type { ElementNode } from "./ast";

export type Block = {
  type: "paragraph" | "heading" | "media";
  content: string;
};

export type ParagraphBlock = {
  type: "paragraph";
  content: ElementNode;
};

export type HeadingBlock = {
  type: "heading";
  content: ElementNode;
};

export type MediaBlock = {
  type: "media";
  content: string;
};
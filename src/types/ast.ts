export type Mark = "b" | "i" | "u" | "s";

export type TextNode = {
  type: "text";
  value: string;
  marks?: Mark[];
};

export type ElementNode = {
  type: "element";
  tag: "p" | "div" | "span";
  children: ASTNode[];
};

export type ASTNode = TextNode | ElementNode;
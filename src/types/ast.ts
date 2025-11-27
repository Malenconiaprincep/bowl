export type Mark = "b" | "i" | "u" | "s";

export type TextNode = {
  type: "text";
  value: string;
  marks?: Mark[];
};

export type ElementTag = "p" | "span" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export type ElementNode = {
  type: "element";
  tag: ElementTag;
  children: ContentNode[];
};

// 新的推荐命名
export type ContentNode = TextNode | ElementNode;
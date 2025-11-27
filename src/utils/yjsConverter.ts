import * as Y from 'yjs';
import type { Block } from '../types/blocks';
import type { ContentNode, TextNode, ElementNode, Mark } from '../types/ast';

/**
 * 将 Block[] 转换为 Y.Doc
 */
export function blocksToYDoc(blocks: Block[]): Y.Doc {
  const doc = new Y.Doc();
  const yBlocks = doc.getArray<Y.Map<unknown>>('blocks');

  blocks.forEach(block => {
    const yBlock = blockToYMap(block, doc);
    yBlocks.push([yBlock]);
  });

  return doc;
}

/**
 * 将单个 Block 转换为 Y.Map
 */
export function blockToYMap(block: Block, doc: Y.Doc): Y.Map<unknown> {
  const yBlock = new Y.Map<unknown>();

  yBlock.set('id', block.id);
  yBlock.set('type', block.type);

  if (block.type === 'media') {
    yBlock.set('content', block.content);
  } else {
    const yContent = new Y.Array<Y.Map<unknown>>();
    block.content.forEach(node => {
      const yNode = contentNodeToYMap(node, doc);
      yContent.push([yNode]);
    });
    yBlock.set('content', yContent);
  }

  return yBlock;
}

/**
 * 将 ContentNode 转换为 Y.Map
 */
export function contentNodeToYMap(node: ContentNode, doc: Y.Doc): Y.Map<unknown> {
  const yNode = new Y.Map<unknown>();

  if (node.type === 'text') {
    yNode.set('type', 'text');
    yNode.set('value', node.value);
    if (node.marks && node.marks.length > 0) {
      const yMarks = new Y.Array<string>();
      yMarks.push(node.marks);
      yNode.set('marks', yMarks);
    }
  } else {
    yNode.set('type', 'element');
    yNode.set('tag', node.tag);

    const yChildren = new Y.Array<Y.Map<unknown>>();
    node.children.forEach(child => {
      const yChild = contentNodeToYMap(child, doc);
      yChildren.push([yChild]);
    });
    yNode.set('children', yChildren);
  }

  return yNode;
}

/**
 * 从 Y.Doc 转换为 Block[]
 */
export function yDocToBlocks(doc: Y.Doc): Block[] {
  const yBlocks = doc.getArray<Y.Map<unknown>>('blocks');
  const blocks: Block[] = [];

  yBlocks.forEach((yBlock: Y.Map<unknown>) => {
    const block = yMapToBlock(yBlock);
    if (block) {
      blocks.push(block);
    }
  });

  return blocks;
}

/**
 * 将 Y.Map 转换为 Block
 */
export function yMapToBlock(yBlock: Y.Map<unknown>): Block | null {
  const id = yBlock.get('id') as string;
  const type = yBlock.get('type') as Block['type'];

  if (!id || !type) return null;

  if (type === 'media') {
    return {
      id,
      type,
      content: yBlock.get('content') as string,
    };
  }

  const yContent = yBlock.get('content') as Y.Array<Y.Map<unknown>>;
  const content: ContentNode[] = [];

  if (yContent) {
    yContent.forEach((yNode: Y.Map<unknown>) => {
      const node = yMapToContentNode(yNode);
      if (node) {
        content.push(node);
      }
    });
  }

  return {
    id,
    type,
    content,
  } as Block;
}

/**
 * 将 Y.Map 转换为 ContentNode
 */
export function yMapToContentNode(yNode: Y.Map<unknown>): ContentNode | null {
  const type = yNode.get('type') as string;

  if (type === 'text') {
    const textNode: TextNode = {
      type: 'text',
      value: yNode.get('value') as string,
    };

    const yMarks = yNode.get('marks') as Y.Array<string> | undefined;
    if (yMarks && yMarks.length > 0) {
      textNode.marks = yMarks.toArray() as Mark[];
    }

    return textNode;
  }

  if (type === 'element') {
    const yChildren = yNode.get('children') as Y.Array<Y.Map<unknown>>;
    const children: ContentNode[] = [];

    if (yChildren) {
      yChildren.forEach((yChild: Y.Map<unknown>) => {
        const child = yMapToContentNode(yChild);
        if (child) {
          children.push(child);
        }
      });
    }

    return {
      type: 'element',
      tag: yNode.get('tag'),
      children,
    } as ElementNode;
  }

  return null;
}

/**
 * 创建一个带有初始数据的 Y.Doc
 */
export function createYDocWithBlocks(initialBlocks: Block[]): Y.Doc {
  return blocksToYDoc(initialBlocks);
}

/**
 * 观察 Y.Doc 变化并同步到回调
 */
export function observeYDoc(
  doc: Y.Doc,
  callback: (blocks: Block[]) => void
): () => void {
  const yBlocks = doc.getArray<Y.Map<unknown>>('blocks');

  const observer = () => {
    const blocks = yDocToBlocks(doc);
    callback(blocks);
  };

  yBlocks.observeDeep(observer);

  // 返回取消订阅函数
  return () => {
    yBlocks.unobserveDeep(observer);
  };
}

/**
 * 在 Y.Doc 中更新指定 block
 */
export function updateBlockInYDoc(
  doc: Y.Doc,
  blockId: string,
  updater: (block: Block) => Block
): void {
  const yBlocks = doc.getArray<Y.Map<unknown>>('blocks');

  doc.transact(() => {
    for (let i = 0; i < yBlocks.length; i++) {
      const yBlock = yBlocks.get(i);
      if (yBlock.get('id') === blockId) {
        const block = yMapToBlock(yBlock);
        if (block) {
          const updatedBlock = updater(block);
          const newYBlock = blockToYMap(updatedBlock, doc);
          yBlocks.delete(i, 1);
          yBlocks.insert(i, [newYBlock]);
        }
        break;
      }
    }
  });
}

/**
 * 在 Y.Doc 中添加新 block
 */
export function addBlockToYDoc(
  doc: Y.Doc,
  block: Block,
  index?: number
): void {
  const yBlocks = doc.getArray<Y.Map<unknown>>('blocks');
  const yBlock = blockToYMap(block, doc);

  doc.transact(() => {
    if (index !== undefined && index >= 0 && index <= yBlocks.length) {
      yBlocks.insert(index, [yBlock]);
    } else {
      yBlocks.push([yBlock]);
    }
  });
}

/**
 * 从 Y.Doc 中删除 block
 */
export function removeBlockFromYDoc(doc: Y.Doc, blockId: string): void {
  const yBlocks = doc.getArray<Y.Map<unknown>>('blocks');

  doc.transact(() => {
    for (let i = 0; i < yBlocks.length; i++) {
      const yBlock = yBlocks.get(i);
      if (yBlock.get('id') === blockId) {
        yBlocks.delete(i, 1);
        break;
      }
    }
  });
}


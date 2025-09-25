import type { TextBlock } from '../../types/blocks';
import ASTEditor from '../../components/editor/AstRichTextEditor';

interface TextBlockProps {
  block: TextBlock;
}

export default function TextBlock({ block }: TextBlockProps) {
  return <div>
    <ASTEditor initialAST={block.content} />
  </div>;
}
import { useState } from 'react'
import type { Block } from '../../types/blocks'
import BlockContainer from '../../components/BlockContainer'

interface PageBlockProps {
  initialBlocks: Block[]
}

export default function PageBlock({ initialBlocks }: PageBlockProps) {
  const [blocks] = useState<Block[]>(initialBlocks)

  return (
    <div>
      {blocks.map((block, index) => (
        <BlockContainer key={index} block={block} />
      ))}
    </div>
  )
}

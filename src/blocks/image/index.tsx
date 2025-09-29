import { useImperativeHandle, useRef, useState, forwardRef } from 'react';
import type { MediaBlock } from '../../types/blocks';
import type { BlockComponentMethods } from '../../types/blockComponent';
import { BlockWrapper } from '../../components/BlockWrapper';

interface ImageBlockProps {
  block: MediaBlock;
  blockIndex: number;
}

const ImageBlockComponent = forwardRef<BlockComponentMethods, ImageBlockProps>(({
  block,
}, ref) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const [isSelected, setIsSelected] = useState(false);

  // 暴露聚焦方法
  useImperativeHandle(ref, () => ({
    focus: () => {
      // 聚焦到图片元素
      if (imageRef.current) {
        imageRef.current.focus();
        setIsSelected(true);
      }
    },
    blur: () => {
      // 失焦
      if (imageRef.current) {
        imageRef.current.blur();
        setIsSelected(false);
      }
    },
    getElement: () => {
      return imageRef.current;
    }
  }));

  const handleImageClick = () => {
    setIsSelected(!isSelected);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsSelected(!isSelected);
    }
  };

  return (
    <div className="image-block-container">
      <img
        ref={imageRef}
        src={block.content}
        alt="Block image"
        className={`image-block ${isSelected ? 'selected' : ''}`}
        onClick={handleImageClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        style={{
          maxWidth: '100%',
          height: 'auto',
          cursor: 'pointer',
          border: isSelected ? '2px solid #007bff' : '2px solid transparent',
          borderRadius: '4px',
          transition: 'border-color 0.2s ease'
        }}
      />
      {isSelected && (
        <div className="image-controls" style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          已选中
        </div>
      )}
    </div>
  );
});

// 使用高阶组件包裹 ImageBlock
const ImageBlock = BlockWrapper(ImageBlockComponent);
ImageBlock.displayName = 'ImageBlock';

export default ImageBlock;

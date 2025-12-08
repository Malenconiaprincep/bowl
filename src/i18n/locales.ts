export const locales = {
  en: {
    badge: 'Real-time Collaborative Editor',
    title: {
      think: 'Think,',
      collaborate: 'Collaborate,',
      create: 'Create.'
    },
    desc: 'Bowl is a modern rich-text collaborative editor with real-time multi-user editing, rich formatting, and block-based editing for efficient teamwork.',
    status: {
      connected: 'Connected',
      connecting: 'Connecting...',
      online: 'online'
    },
    features: {
      realtime: {
        title: 'Real-time Collaboration',
        desc: 'Built on Yjs CRDT, supports simultaneous multi-user editing with automatic conflict resolution'
      },
      richtext: {
        title: 'Rich Text Editing',
        desc: 'Supports bold, italic, underline and more formats, what you see is what you get'
      },
      blocks: {
        title: 'Block-based Editing',
        desc: 'Flexible block structure for easy content organization and rearrangement'
      }
    },
    footer: 'Built with React + Yjs + TypeScript',
    editor: {
      placeholder: 'Start typing...'
    }
  },
  zh: {
    badge: '实时协作编辑器',
    title: {
      think: '思考，',
      collaborate: '协作，',
      create: '创造。'
    },
    desc: 'Bowl 是一个现代化的富文本协作编辑器，支持多人实时编辑、富文本格式化、块级编辑，让团队协作更高效。',
    status: {
      connected: '已连接',
      connecting: '连接中...',
      online: '人在线'
    },
    features: {
      realtime: {
        title: '实时协作',
        desc: '基于 Yjs CRDT，支持多人同时编辑，冲突自动解决'
      },
      richtext: {
        title: '富文本编辑',
        desc: '支持粗体、斜体、下划线等格式，所见即所得'
      },
      blocks: {
        title: '块级编辑',
        desc: '灵活的块状结构，轻松组织和重排内容'
      }
    },
    footer: '使用 React + Yjs + TypeScript 构建',
    editor: {
      placeholder: '输入内容...'
    }
  }
} as const;

export type Locale = keyof typeof locales;
export type Translations = typeof locales.en;


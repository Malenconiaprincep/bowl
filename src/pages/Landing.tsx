import { useState, useEffect, type ReactNode } from 'react'
import { useI18n } from '../i18n'
import './Landing.css'

interface LandingProps {
  editor: ReactNode
  connected: boolean
  userCount: number
}

export default function Landing({ editor, connected, userCount }: LandingProps) {
  const [mounted, setMounted] = useState(false)
  const { t, locale, toggleLocale } = useI18n()

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="landing">
      {/* 背景装饰 */}
      <div className="landing-bg">
        <div className="landing-bg-gradient" />
        <div className="landing-bg-grid" />
        <div className="landing-bg-glow" />
      </div>

      {/* 导航栏 */}
      <nav className="landing-nav">
        <div className="landing-nav-logo">
          <span className="logo-icon">🥣</span>
          <span className="logo-text">Bowl</span>
        </div>
        <div className="landing-nav-links">
          <button className="lang-toggle" onClick={toggleLocale}>
            {locale === 'en' ? '中文' : 'EN'}
          </button>
          <a href="https://x.com/makuta22923984" target="_blank" rel="noopener noreferrer" title="X (Twitter)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
          <a href="https://github.com/Malenconiaprincep/bowl" target="_blank" rel="noopener noreferrer" title="GitHub">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        </div>
      </nav>

      {/* 主内容区 */}
      <main className={`landing-main ${mounted ? 'mounted' : ''}`}>
        <div className="landing-badge">
          <span className="badge-dot" />
          {t.badge}
        </div>

        <h1 className="landing-title">
          {t.title.think}<span className="title-gradient">{t.title.collaborate}</span>{t.title.create}
        </h1>

        <p className="landing-desc">
          {t.desc}
        </p>

        {/* 编辑器预览区域 */}
        <div className="landing-editor-wrapper">
          <div className="landing-editor-header">
            <div className="editor-window-dots">
              <span className="dot red" />
              <span className="dot yellow" />
              <span className="dot green" />
            </div>
            <div className="editor-status">
              <span className={`status-indicator ${connected ? 'connected' : ''}`} />
              <span className="status-text">{connected ? t.status.connected : t.status.connecting}</span>
              <span className="user-count">👥 {userCount} {t.status.online}</span>
            </div>
          </div>
          <div className="landing-editor-content">
            {editor}
          </div>
        </div>

        {/* 特性卡片 */}
        <div className="landing-features">
          <div className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>{t.features.realtime.title}</h3>
            <p>{t.features.realtime.desc}</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">✨</div>
            <h3>{t.features.richtext.title}</h3>
            <p>{t.features.richtext.desc}</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🧱</div>
            <h3>{t.features.blocks.title}</h3>
            <p>{t.features.blocks.desc}</p>
          </div>
        </div>
      </main>

      {/* 底部 */}
      <footer className="landing-footer">
        <p>{t.footer}</p>
      </footer>
    </div>
  )
}

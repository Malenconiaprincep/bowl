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
          <a href="https://github.com/user/bowl" target="_blank" rel="noopener noreferrer">GitHub</a>
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

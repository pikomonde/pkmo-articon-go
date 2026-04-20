import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ProjectList } from './components/ProjectList';
import { ArticleList } from './components/ArticleList';
import { ChatPanel } from './components/ChatPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { isOnboardingComplete } from '../core/storage/settings';
import { ONBOARDING_PATH } from '../shared/constants';
import type { Project, Article } from '../shared/types';
import './sidebar.css';

function Sidebar() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    isOnboardingComplete().then(setOnboarded);
  }, []);

  function handleOpenOnboarding() {
    chrome.tabs.create({ url: chrome.runtime.getURL(ONBOARDING_PATH) });
  }

  function handleSelectProject(project: Project) {
    setSelectedProject(project);
    setSelectedArticle(null);
  }

  function handleOpenReader(article: Article) {
    chrome.runtime.sendMessage({ type: 'OPEN_READER', articleId: article.id });
  }

  if (onboarded === null) {
    return <div className="sidebar-loading">Loading…</div>;
  }

  if (!onboarded) {
    return (
      <div className="sidebar-onboard">
        <div className="sidebar-logo">◈ Articon</div>
        <p>Complete setup to start saving articles and chatting with your collection.</p>
        <button className="btn-primary" onClick={handleOpenOnboarding}>
          Set Up AI Provider →
        </button>
      </div>
    );
  }

  return (
    <div className="sidebar-root">
      <div className="sidebar-header">
        <span className="sidebar-logo">◈ Articon</span>
        <button className="icon-btn" title="Settings" onClick={() => setShowSettings((v) => !v)}>⚙</button>
      </div>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      <div className="sidebar-panels">
        <ProjectList
          selectedProject={selectedProject}
          onSelectProject={handleSelectProject}
        />
        <ArticleList
          project={selectedProject}
          selectedArticle={selectedArticle}
          onSelectArticle={setSelectedArticle}
          onOpenReader={handleOpenReader}
        />
        <ChatPanel project={selectedProject} />
      </div>
    </div>
  );
}

const root = document.getElementById('root')!;
createRoot(root).render(<Sidebar />);

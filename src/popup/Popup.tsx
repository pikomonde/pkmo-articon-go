import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { getAllProjects, createProject } from '../core/storage/projects';
import { isOnboardingComplete } from '../core/storage/settings';
import { ONBOARDING_PATH } from '../shared/constants';
import type { Project } from '../shared/types';
import './popup.css';

type Status = 'idle' | 'saving' | 'saved' | 'error' | 'warning';

function Popup() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [onboarded, setOnboarded] = useState(true);

  useEffect(() => {
    async function init() {
      const complete = await isOnboardingComplete();
      setOnboarded(complete);
      if (!complete) return;

      const projs = await getAllProjects();
      setProjects(projs);
      if (projs.length > 0) setSelectedProjectId(projs[0].id);
    }
    init();
  }, []);

  async function handleSave() {
    if (!selectedProjectId) {
      setStatus('error');
      setMessage('Please select or create a project first.');
      return;
    }

    setStatus('saving');
    setMessage('Extracting article…');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_ARTICLE',
        projectId: selectedProjectId,
      });

      if (response?.error) {
        setStatus('error');
        setMessage(response.error);
      } else if (response?.warning) {
        setStatus('warning');
        setMessage(response.warning);
      } else if (response?.success) {
        setStatus('saved');
        setMessage(`Saved: "${response.article.title}"`);
      }
    } catch (err) {
      setStatus('error');
      setMessage('Failed to save article. Try refreshing the page.');
    }
  }

  async function handleOpenSidebar() {
    // chrome.sidePanel.open() must be called directly in the popup
    // (user gesture context). Routing through background loses the gesture.
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.windowId) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    }
    window.close();
  }

  async function handleCreateProject() {
    const name = newProjectName.trim();
    if (!name) return;
    const project = await createProject(name);
    setProjects((prev) => [...prev, project]);
    setSelectedProjectId(project.id);
    setNewProjectName('');
    setShowNewProject(false);
  }

  function handleOpenOnboarding() {
    chrome.tabs.create({ url: chrome.runtime.getURL(ONBOARDING_PATH) });
    window.close();
  }

  if (!onboarded) {
    return (
      <div className="popup">
        <div className="popup-header">
          <span className="logo">◈ Articon</span>
        </div>
        <div className="onboard-prompt">
          <p>Set up your AI provider to get started.</p>
          <button className="btn-primary" onClick={handleOpenOnboarding}>
            Complete Setup →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="popup">
      <div className="popup-header">
        <span className="logo">◈ Articon</span>
      </div>

      <div className="popup-body">
        <label className="field-label">Save to project</label>

        {projects.length === 0 ? (
          <p className="empty-hint">No projects yet. Create one below.</p>
        ) : (
          <select
            className="project-select"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        {showNewProject ? (
          <div className="new-project-row">
            <input
              autoFocus
              className="project-input"
              placeholder="Project name…"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
            />
            <button className="btn-ghost" onClick={() => setShowNewProject(false)}>
              ✕
            </button>
            <button className="btn-small" onClick={handleCreateProject}>
              Add
            </button>
          </div>
        ) : (
          <button className="btn-ghost new-project-btn" onClick={() => setShowNewProject(true)}>
            + New project
          </button>
        )}
      </div>

      {message && (
        <div className={`status-bar status-${status}`}>{message}</div>
      )}

      <div className="popup-actions">
        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={status === 'saving' || !selectedProjectId}
        >
          {status === 'saving' ? 'Saving…' : status === 'saved' ? '✓ Saved' : '💾 Save Article'}
        </button>
        <button className="btn-secondary" onClick={handleOpenSidebar}>
          Open Sidebar →
        </button>
      </div>
    </div>
  );
}

const root = document.getElementById('root')!;
createRoot(root).render(<Popup />);

import { downloadProjectAsZip } from '../../core/export/projectExport';
import { useState, useEffect, useCallback } from 'react';
import { getAllProjects, createProject, renameProject, deleteProject } from '../../core/storage/projects';
import type { Project } from '../../shared/types';

interface Props {
  selectedProject: Project | null;
  onSelectProject: (project: Project) => void;
}

export function ProjectList({ selectedProject, onSelectProject }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newName, setNewName] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const load = useCallback(async () => {
    const projs = await getAllProjects();
    setProjects(projs);
    // Auto-select the first project if none is selected
    if (!selectedProject && projs.length > 0) {
      onSelectProject(projs[0]);
    }
  }, [selectedProject, onSelectProject]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    const project = await createProject(name);
    setNewName('');
    setShowInput(false);
    await load();
    onSelectProject(project);
  }

  async function handleRename(id: string) {
    const name = editName.trim();
    if (!name) return;
    await renameProject(id, name);
    setEditingId(null);
    setEditName('');
    await load();
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this project and all its articles?')) return;
    await deleteProject(id);
    await load();
  }

  async function handleDownload(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const count = await downloadProjectAsZip(id);
      if (count === 0) alert('This project has no articles to download.');
    } catch (err) {
      alert(`Download failed: ${String(err)}`);
    }
  }

  return (
    <div className="panel panel-projects">
      <div className="panel-header">
        <span className="panel-title">Projects</span>
        <button
          className="icon-btn"
          title="New project"
          onClick={() => setShowInput(true)}
        >
          +
        </button>
      </div>

      <div className="panel-body">
        {projects.length === 0 && !showInput && (
          <p className="empty-state">No projects yet.<br />Create one to get started.</p>
        )}

        {projects.map((p) => (
          <div
            key={p.id}
            className={`project-item ${selectedProject?.id === p.id ? 'active' : ''}`}
            onClick={() => onSelectProject(p)}
          >
            {editingId === p.id ? (
              <input
                autoFocus
                className="inline-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename(p.id);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                onBlur={() => setEditingId(null)}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <span className="project-icon">📁</span>
                <span className="project-name">{p.name}</span>
                <div className="project-actions">
                  <button
                    className="icon-btn-sm"
                    title="Download as ZIP"
                    onClick={(e) => handleDownload(p.id, e)}
                  >
                    ⬇
                  </button>
                  <button
                    className="icon-btn-sm"
                    title="Rename"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(p.id);
                      setEditName(p.name);
                    }}
                  >
                    ✎
                  </button>
                  <button
                    className="icon-btn-sm danger"
                    title="Delete"
                    onClick={(e) => handleDelete(p.id, e)}
                  >
                    ✕
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {showInput && (
          <div className="new-project-input-row">
            <input
              autoFocus
              className="inline-input"
              placeholder="Project name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') setShowInput(false);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

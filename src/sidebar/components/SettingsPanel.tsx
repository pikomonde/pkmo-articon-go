import { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../../core/storage/settings';
import { LLM_DEFAULTS, MODEL_HINTS, MODEL_DOCS, PROVIDER_INFO } from '../../shared/constants';
import type { LLMProvider } from '../../shared/types';

type ProviderName = 'gemini' | 'openai' | 'groq';

interface Props {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: Props) {
  const [provider, setProvider] = useState<ProviderName>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getSettings().then((s) => {
      if (s.provider) {
        setProvider(s.provider.name);
        setApiKey(s.provider.apiKey);
        setModelName(s.provider.model);
      }
    });
  }, []);

  function handleSelectProvider(name: ProviderName) {
    setProvider(name);
    setModelName(LLM_DEFAULTS[name].model);
    setSaved(false);
  }

  async function handleSave() {
    const key = apiKey.trim();
    const model = modelName.trim();
    if (!key || !model) {
      setError('API key and model name are required.');
      return;
    }

    const updatedProvider: LLMProvider = { name: provider, apiKey: key, model };
    const settings = await getSettings();
    await saveSettings({ ...settings, provider: updatedProvider, onboardingComplete: true });
    setSaved(true);
    setError('');
    setTimeout(onClose, 800);
  }

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <span className="settings-title">⚙ Settings</span>
        <button className="icon-btn" onClick={onClose}>✕</button>
      </div>

      <div className="settings-body">
        <div className="section-label">AI Provider</div>
        <div className="settings-provider-list">
          {PROVIDER_INFO.map((p) => (
            <button
              key={p.name}
              className={`settings-provider-btn ${provider === p.name ? 'active' : ''}`}
              onClick={() => handleSelectProvider(p.name)}
            >
              {p.label}
              {provider === p.name && ' ✓'}
            </button>
          ))}
        </div>

        <div className="section-label" style={{ marginTop: '12px' }}>
          Model
          <a
            href={MODEL_DOCS[provider]}
            target="_blank"
            rel="noopener noreferrer"
            className="settings-link"
          >
            see models →
          </a>
        </div>
        <input
          className="settings-input"
          type="text"
          placeholder={MODEL_HINTS[provider]}
          value={modelName}
          onChange={(e) => { setModelName(e.target.value); setSaved(false); }}
        />

        <div className="section-label" style={{ marginTop: '12px' }}>API Key</div>
        <input
          className="settings-input"
          type="password"
          placeholder="Paste your API key…"
          value={apiKey}
          onChange={(e) => { setApiKey(e.target.value); setSaved(false); }}
        />

        {error && <div className="settings-error">{error}</div>}

        <button
          className="settings-save-btn"
          onClick={handleSave}
          disabled={!apiKey.trim() || !modelName.trim()}
        >
          {saved ? '✓ Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { completeOnboarding } from '../core/storage/settings';
import { createProject } from '../core/storage/projects';
import { PROVIDER_INFO, LLM_DEFAULTS, MODEL_HINTS, MODEL_DOCS } from '../shared/constants';
import type { LLMProvider } from '../shared/types';
import './onboarding.css';

type ProviderName = 'gemini' | 'openai' | 'groq';

function Onboarding() {
  const [step, setStep] = useState<'provider' | 'key' | 'done'>('provider');
  const [selectedProvider, setSelectedProvider] = useState<ProviderName>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState(LLM_DEFAULTS['gemini'].model);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleSelectProvider(name: ProviderName) {
    setSelectedProvider(name);
    // Reset model name to the default for the newly selected provider
    setModelName(LLM_DEFAULTS[name].model);
  }

  async function handleSubmit() {
    const key = apiKey.trim();
    const model = modelName.trim();

    if (!key) {
      setError('Please enter your API key.');
      return;
    }
    if (!model) {
      setError('Please enter a model name.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const provider: LLMProvider = {
        name: selectedProvider,
        apiKey: key,
        model,
      };

      await completeOnboarding(provider);
      await createProject('My Articles');
      setStep('done');
    } catch (err) {
      setError(`Setup failed: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  function handleFinish() {
    window.close();
  }

  if (step === 'done') {
    return (
      <div className="onboarding-root">
        <div className="onboarding-card">
          <div className="success-icon">✓</div>
          <h1>You're all set!</h1>
          <p>
            Articon is ready. Click the extension icon in your browser toolbar to
            save your first article, then open the sidebar to chat with it.
          </p>
          <button className="btn-primary" onClick={handleFinish}>
            Start using Articon →
          </button>
        </div>
      </div>
    );
  }

  const currentProvider = PROVIDER_INFO.find((p) => p.name === selectedProvider)!;

  return (
    <div className="onboarding-root">
      <div className="onboarding-card">
        <div className="onboarding-logo">◈ Articon</div>
        <h1>Welcome to Articon</h1>
        <p className="onboarding-subtitle">
          Save articles offline and chat with your collection using AI.
          <br />
          Your data stays on your machine — no account required.
        </p>

        <div className="onboarding-features">
          {['💾 Save articles from any page', '📖 Read offline, no paywalls', '🤖 Chat with your collection'].map((f) => (
            <div key={f} className="feature-row">{f}</div>
          ))}
        </div>

        {/* Provider selection */}
        <div className="section-label">Choose your AI provider</div>
        <div className="provider-list">
          {PROVIDER_INFO.map((p) => (
            <button
              key={p.name}
              className={`provider-btn ${selectedProvider === p.name ? 'active' : ''}`}
              onClick={() => handleSelectProvider(p.name)}
            >
              <div className="provider-btn-inner">
                <span className="provider-name">{p.label}</span>
                <span className="provider-note">{p.note}</span>
              </div>
              {selectedProvider === p.name && <span className="provider-check">✓</span>}
            </button>
          ))}
        </div>

        {/* Model name */}
        <div className="key-section">
          <div className="key-label-row">
            <span className="section-label">Model</span>
            <a
              href={MODEL_DOCS[selectedProvider]}
              target="_blank"
              rel="noopener noreferrer"
              className="get-key-link"
            >
              See available models →
            </a>
          </div>
          <input
            type="text"
            className="key-input"
            placeholder={MODEL_HINTS[selectedProvider]}
            value={modelName}
            onChange={(e) => {
              setModelName(e.target.value);
              setError('');
            }}
          />
        </div>

        {/* API key */}
        <div className="key-section">
          <div className="key-label-row">
            <span className="section-label">API Key</span>
            <a
              href={currentProvider.keyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="get-key-link"
            >
              Get a key →
            </a>
          </div>
          <input
            type="password"
            className="key-input"
            placeholder={`Paste your ${currentProvider.label} API key…`}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <p className="key-note">
            🔒 Stored locally in your browser. Never sent to any server.
          </p>
        </div>

        {error && <div className="onboarding-error">{error}</div>}

        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={saving || !apiKey.trim() || !modelName.trim()}
        >
          {saving ? 'Setting up…' : 'Get Started →'}
        </button>
      </div>
    </div>
  );
}

const root = document.getElementById('root')!;
createRoot(root).render(<Onboarding />);

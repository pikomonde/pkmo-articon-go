import { useState, useEffect, useRef, useCallback } from 'react';
import { runChatPipeline } from '../../core/rag/pipeline';
import { getChatHistory, clearChatHistory } from '../../core/storage/chat';
import type { Project, ChatMessage } from '../../shared/types';

interface Props {
  project: Project | null;
}

export function ChatPanel({ project }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    if (!project) {
      setMessages([]);
      return;
    }
    const history = await getChatHistory(project.id);
    setMessages(history);
  }, [project]);

  useEffect(() => {
    loadHistory();
    setInput('');
    setError('');
  }, [loadHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend() {
    if (!project) return;
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setError('');
    setLoading(true);

    // Optimistically add the user message
    const optimisticUser: ChatMessage = {
      id: `tmp-${Date.now()}`,
      projectId: project.id,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      await runChatPipeline(project.id, text);
      // Replace with persisted messages
      await loadHistory();
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes('No LLM provider')
          ? 'No AI provider configured. Please complete setup.'
          : `Error: ${String(err)}`
      );
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    if (!project) return;
    if (!confirm('Clear all chat history for this project?')) return;
    await clearChatHistory(project.id);
    setMessages([]);
  }

  if (!project) {
    return (
      <div className="panel panel-chat">
        <div className="panel-header">
          <span className="panel-title">Chat</span>
        </div>
        <div className="panel-body">
          <p className="empty-state">Select a project to start chatting with its articles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel panel-chat">
      <div className="panel-header">
        <span className="panel-title">Chat · {project.name}</span>
        {messages.length > 0 && (
          <button className="icon-btn-sm" title="Clear history" onClick={handleClear}>
            ↺
          </button>
        )}
      </div>

      <div className="chat-messages">
        {messages.length === 0 && !loading && (
          <div className="chat-welcome">
            <div className="chat-welcome-icon">◈</div>
            <p>Ask anything about the articles in <strong>{project.name}</strong>.</p>
            <div className="chat-suggestions">
              {[
                'Summarize the articles in this project',
                'What are the main themes?',
                'What did the articles say about AI?',
              ].map((s) => (
                <button
                  key={s}
                  className="suggestion-chip"
                  onClick={() => {
                    setInput(s);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`chat-msg chat-msg-${msg.role}`}>
            <div className="chat-msg-label">
              {msg.role === 'user' ? 'You' : '◈ Articon'}
            </div>
            <div className="chat-msg-content">{msg.content}</div>
          </div>
        ))}

        {loading && (
          <div className="chat-msg chat-msg-assistant">
            <div className="chat-msg-label">◈ Articon</div>
            <div className="chat-msg-content chat-thinking">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        )}

        {error && <div className="chat-error">{error}</div>}

        <div ref={bottomRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          className="chat-input"
          placeholder="Ask about your articles…"
          value={input}
          rows={2}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={loading}
        />
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={!input.trim() || loading}
        >
          ↑
        </button>
      </div>
    </div>
  );
}

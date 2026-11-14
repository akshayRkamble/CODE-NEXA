import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import './chat.css';

type Message = { role: 'user' | 'assistant'; content: string };
type Chat = { id: string; title: string; model: string; messages: Message[]; updatedAt: number };
const storageKey = 'nexa-ai-chats-v1';
const modelStorageKey = 'nexa-ai-model-v1';
const historyLimit = 20;
const historyCharacterLimit = 20_000;

function loadChats(): Chat[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is Chat =>
      typeof item === 'object'
      && item !== null
      && typeof item.id === 'string'
      && typeof item.title === 'string'
      && typeof item.model === 'string'
      && Array.isArray(item.messages)
      && item.messages.every((message: unknown) =>
        typeof message === 'object'
        && message !== null
        && 'role' in message
        && (message.role === 'user' || message.role === 'assistant')
        && 'content' in message
        && typeof message.content === 'string')
      && typeof item.updatedAt === 'number');
  } catch {
    return [];
  }
}

function newChat(model: string): Chat {
  return { id: crypto.randomUUID(), title: 'New chat', model, messages: [], updatedAt: Date.now() };
}

function recentHistory(messages: Message[]): Message[] {
  const selected: Message[] = [];
  let characters = 0;
  for (const message of messages.slice(-historyLimit).reverse()) {
    if (characters + message.content.length > historyCharacterLimit) break;
    selected.push(message);
    characters += message.content.length;
  }
  return selected.reverse();
}

export default function ChatSection() {
  const [chats, setChats] = useState<Chat[]>(loadChats);
  const [activeId, setActiveId] = useState<string>(() => loadChats()[0]?.id || '');
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem(modelStorageKey) || '');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState('');
  const [catalogBusy, setCatalogBusy] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const activeChat = chats.find(chat => chat.id === activeId);

  useEffect(() => {
    let active = true;
    void fetch('/api/chat/models')
      .then(async response => {
        const payload = await response.json() as { models?: unknown; error?: string };
        if (!response.ok) throw new Error(payload.error || `Could not load models (HTTP ${response.status}).`);
        if (!Array.isArray(payload.models) || !payload.models.every(model => typeof model === 'string')) {
          throw new Error('FreeModel returned an invalid model catalog.');
        }
        if (!active) return;
        const nextModels = payload.models as string[];
        setModels(nextModels);
        setSelectedModel(current => {
          const next = nextModels.includes(current) ? current : nextModels[0] || '';
          if (next) localStorage.setItem(modelStorageKey, next);
          return next;
        });
      })
      .catch(cause => {
        if (active) setCatalogError(cause instanceof Error ? cause.message : 'Could not load FreeModel models.');
      })
      .finally(() => {
        if (active) setCatalogBusy(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(chats));
    } catch {
      setError('Could not save chat history in this browser. Free some local storage and try again.');
    }
  }, [chats]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeChat?.messages.length, busy]);

  function createChat() {
    if (busy) return;
    const chat = newChat(selectedModel);
    setChats(current => [chat, ...current]);
    setActiveId(chat.id);
    setDraft('');
    setError('');
  }

  function updateChat(id: string, update: (chat: Chat) => Chat) {
    setChats(current => current.map(chat => chat.id === id ? update(chat) : chat));
  }

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || !selectedModel || busy) return;
    const chat = activeChat || newChat(selectedModel);
    const userMessage: Message = { role: 'user', content };
    const history = [...chat.messages, userMessage];
    const title = chat.messages.length ? chat.title : content.replace(/\s+/g, ' ').slice(0, 48);

    setBusy(true);
    setError('');
    setDraft('');
    setChats(current => {
      const exists = current.some(item => item.id === chat.id);
      return exists
        ? current.map(item => item.id === chat.id ? { ...item, title, model: selectedModel, messages: history, updatedAt: Date.now() } : item)
        : [{ ...chat, title, model: selectedModel, messages: history, updatedAt: Date.now() }, ...current];
    });
    setActiveId(chat.id);

    try {
      const response = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedModel, messages: recentHistory(history) })
      });
      const payload = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error || `Chat request failed (HTTP ${response.status}).`);
      if (typeof payload.message !== 'string' || !payload.message.trim()) {
        throw new Error('The model returned an empty response.');
      }

      const assistantMessage: Message = { role: 'assistant', content: payload.message };
      updateChat(chat.id, current => ({
        ...current,
        messages: [...current.messages, assistantMessage],
        updatedAt: Date.now()
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reach FreeModel.');
      setDraft(content);
      updateChat(chat.id, current => ({
        ...current,
        messages: current.messages.at(-1)?.role === 'user' && current.messages.at(-1)?.content === content
          ? current.messages.slice(0, -1)
          : current.messages
      }));
    } finally {
      setBusy(false);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  async function copyMessage(id: string, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(''), 1500);
    } catch {
      setError('Could not copy to clipboard. Select and copy the response instead.');
    }
  }

  return (
    <section className="chat-page" aria-label="AI chat workspace">
      <aside className="chat-list">
        <div className="chat-list-head">
          <div><small>BUILD WITH AI</small><h1>Chats</h1></div>
          <button type="button" className="chat-new" onClick={createChat} disabled={busy} aria-label="Start a new chat">+</button>
        </div>
        <p className="chat-list-caption">Saved on this device</p>
        <div className="chat-history" aria-label="Saved chats">
          {chats.map(chat => (
            <div className={`chat-history-item ${chat.id === activeId ? 'active' : ''}`} key={chat.id}>
              <button type="button" className="chat-select" onClick={() => {
                setActiveId(chat.id);
                if (models.includes(chat.model)) {
                  setSelectedModel(chat.model);
                  localStorage.setItem(modelStorageKey, chat.model);
                }
                setError('');
              }}>
                <strong>{chat.title}</strong>
                <small>{chat.messages.length ? `${chat.messages.length} messages` : 'New conversation'}</small>
              </button>
              <button type="button" className="chat-delete" aria-label={`Delete ${chat.title}`} title="Delete chat" disabled={busy && chat.id === activeId} onClick={() => {
                const remaining = chats.filter(item => item.id !== chat.id);
                setChats(remaining);
                if (activeId === chat.id) setActiveId(remaining[0]?.id || '');
              }}>×</button>
            </div>
          ))}
          {!chats.length && <p className="chat-empty-list">Your conversations will appear here.</p>}
        </div>
        <div className="chat-model-picker">
          <label htmlFor="chat-model">MODEL</label>
          <select id="chat-model" value={selectedModel} disabled={catalogBusy || !models.length || busy} onChange={event => {
            setSelectedModel(event.target.value);
            localStorage.setItem(modelStorageKey, event.target.value);
          }}>
            {catalogBusy && <option value="">Loading models…</option>}
            {!catalogBusy && !models.length && <option value="">No models available</option>}
            {models.map(model => <option value={model} key={model}>{model}</option>)}
          </select>
          <small>FreeModel catalog · {models.length || '—'} models</small>
        </div>
      </aside>

      <div className="chat-thread">
        <header className="chat-thread-head">
          <div><small>FREEMODEL</small><h2>{activeChat?.title || 'Create with chat'}</h2></div>
          <span>{selectedModel || (catalogBusy ? 'Loading models…' : 'Choose a model')}</span>
        </header>

        {catalogError && <div className="chat-error chat-catalog-error" role="alert">{catalogError}</div>}
        {!catalogBusy && !catalogError && (
          <div className="chat-messages" aria-live="polite">
            {!activeChat?.messages.length && (
              <div className="chat-welcome">
                <div className="chat-welcome-mark">✦</div>
                <h3>What would you like to create?</h3>
                <p>Plan a project, build an app, write code, or explore an idea. Choose any model from FreeModel.</p>
                <div className="chat-suggestions">
                  {['Build a responsive landing page', 'Help me plan a small app', 'Create a useful Python script'].map(suggestion => (
                    <button type="button" key={suggestion} onClick={() => setDraft(suggestion)}>{suggestion}<span>↗</span></button>
                  ))}
                </div>
              </div>
            )}
            {activeChat?.messages.map((message, index) => {
              const id = `${activeChat.id}-${index}`;
              return (
                <article className={`chat-message ${message.role}`} key={id}>
                  <div className="chat-message-label">{message.role === 'user' ? 'You' : activeChat.model}</div>
                  <pre>{message.content}</pre>
                  {message.role === 'assistant' && <button type="button" className="chat-copy" onClick={() => void copyMessage(id, message.content)}>{copiedId === id ? 'Copied' : 'Copy response'}</button>}
                </article>
              );
            })}
            {busy && <div className="chat-thinking" role="status"><i/><i/><i/> Thinking…</div>}
            <div ref={endRef}/>
          </div>
        )}

        {error && <div className="chat-error" role="alert">{error}</div>}
        <form className="chat-composer" onSubmit={sendMessage}>
          <label className="visually-hidden" htmlFor="chat-prompt">Message the selected AI model</label>
          <textarea
            id="chat-prompt"
            value={draft}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder="Describe what you want to build…"
            rows={3}
            maxLength={8000}
            disabled={!selectedModel || busy}
          />
          <div className="chat-composer-footer">
            <span>Enter to send · Shift + Enter for a new line</span>
            <button type="submit" className="run" disabled={!draft.trim() || !selectedModel || busy}>
              {busy ? 'Working…' : 'Send ↗'}
            </button>
          </div>
        </form>
        <p className="chat-disclaimer">Responses are generated by FreeModel. Review generated code before using it; chat does not run code or modify workspace files.</p>
      </div>
    </section>
  );
}

import { useEffect, useState } from 'react';

type Source = { id: number; title: string; source: string; topic: string | null; excerpt: string };
type Props = { problemSlug: string; code: string; language: string; lastRunOutput: string; attempts: number; signedIn: boolean };

export default function TutorPanelWithFeedback({ problemSlug, code, language, lastRunOutput, signedIn }: Props) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retryAvailable, setRetryAvailable] = useState(false);
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [feedbackBusy, setFeedbackBusy] = useState(false);
  const [mcpBusy, setMcpBusy] = useState(false);
  const [mcpOutput, setMcpOutput] = useState('');
  const [runApprovalOpen, setRunApprovalOpen] = useState(false);
  const [serviceIssue, setServiceIssue] = useState('');

  useEffect(() => {
    let active = true;
    void fetch('/api/ai/status')
      .then(async response => {
        const status = await response.json() as { ready?: boolean; configured?: boolean; knowledgeBase?: string };
        if (!active || status.ready) return;
        if (status.knowledgeBase === 'empty') setServiceIssue('Tutor knowledge is not indexed yet. Run `npm run ingest` after restoring/configuring the embedding provider.');
        else if (!status.configured) setServiceIssue('The tutor AI provider is not configured on the server.');
        else setServiceIssue('The tutor service is unavailable. Check the API and database configuration.');
      })
      .catch(() => {
        if (active) setServiceIssue('Could not check tutor readiness. Check that the API is running.');
      });
    return () => { active = false; };
  }, []);

  async function ask(text = question) {
    if (!text.trim()) return;
    if (!signedIn) {
      setError('Sign in to use the tutor. Your code and question are sent to the configured AI provider.');
      return;
    }
    setQuestion(text);
    setAnswer('');
    setSources([]);
    setRating(null);
    setError('');
    setRetryAvailable(false);
    setBusy(true);
    try {
      const response = await fetch('/api/ai/ask', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: text, problemSlug, code, language, lastRunOutput }) });
      if (!response.ok) {
        let message = `Tutor request failed (HTTP ${response.status}).`;
        try {
          const data = await response.json() as { error?: string; requestId?: string };
          if (data.error) message = data.requestId ? `${data.error} (Reference: ${data.requestId})` : data.error;
        } catch {
          // Keep the HTTP status when the server or proxy returns non-JSON.
        }
        setRetryAvailable(response.status === 429 || response.status === 503);
        throw new Error(message);
      }
      if (!response.body) throw new Error('Streaming is unavailable in this browser.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let eventName = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('event:')) eventName = line.slice(6).trim();
          if (!line.startsWith('data:')) continue;
          const data = JSON.parse(line.slice(5).trim()) as { text?: string; error?: string } | Source[];
          if (eventName === 'sources') setSources(data as Source[]);
          else if (eventName === 'delta') setAnswer(old => old + ((data as { text?: string }).text || ''));
          else if (eventName === 'error') {
            const message = (data as { error?: string }).error || 'Tutor failed.';
            setError(message);
            setRetryAvailable(/rate.limit|temporarily|try again/i.test(message));
          }
        }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not reach the tutor.');
      if (reason instanceof TypeError) setRetryAvailable(true);
    } finally {
      setBusy(false);
    }
  }

  async function rate(next: 1 | -1) {
    if (!answer || feedbackBusy || rating !== null) return;
    setFeedbackBusy(true);
    try {
      const response = await fetch('/api/ai/feedback', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ problemSlug, question, answer, rating: next }) });
      if (!response.ok) throw new Error('Could not save feedback.');
      setRating(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save feedback.');
    } finally {
      setFeedbackBusy(false);
    }
  }

  async function callMcpTool(toolName: string, args: Record<string, unknown>, approved = false) {
    if (!signedIn) {
      setError('Sign in before using NexaCode MCP tools.');
      return;
    }
    setError('');
    setMcpOutput('');
    setMcpBusy(true);
    try {
      const response = await fetch('/api/ai/mcp-tool', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName, arguments: args, approved })
      });
      const data = await response.json() as { result?: unknown; error?: string };
      if (!response.ok) throw new Error(data.error || 'MCP tool call failed.');
      setMcpOutput(JSON.stringify(data.result, null, 2));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not call the MCP tool.');
    } finally {
      setMcpBusy(false);
      setRunApprovalOpen(false);
    }
  }

  return <div className="tutor-panel">
    <div className="tutor-intro"><b>AI Tutor</b><p>Answers use your question, code, and cited NexaCode learning notes. Full solutions require an explicit request after at least two attempts.</p></div>
    <div className="tutor-actions">
      <button disabled={busy} onClick={() => ask('Give me one progressive hint. Do not reveal the full solution.')}>Give hint</button>
      <button disabled={busy} onClick={() => ask('Explain the last run error and suggest a debugging step.')}>Explain error</button>
      <button disabled={busy} onClick={() => ask('Review the likely time and space complexity without rewriting my code.')}>Review complexity</button>
    </div>
    <div className="tutor-privacy">Your code is sent to the AI provider configured by the site operator.</div>
    {serviceIssue && <div className="auth-error" role="status">{serviceIssue}</div>}
    <section className="mcp-tools" aria-labelledby="mcp-tools-title">
      <b id="mcp-tools-title">MCP tools</b>
      <p>Use NexaCode tools for problem and knowledge lookup. Running code requires your confirmation.</p>
      <div className="tutor-actions">
        <button disabled={mcpBusy} onClick={() => callMcpTool('get_problem', { slug: problemSlug })}>Get problem</button>
        <button disabled={mcpBusy} onClick={() => callMcpTool('search_knowledge', { query: question.trim() || problemSlug })}>Search knowledge</button>
        <button disabled={mcpBusy || !code.trim()} onClick={() => setRunApprovalOpen(true)}>Run code via MCP</button>
      </div>
      {mcpBusy && <p role="status">Calling MCP tool…</p>}
      {mcpOutput && <pre className="mcp-result" aria-label="MCP tool result">{mcpOutput}</pre>}
    </section>
    <div className="tutor-answer">{busy && !answer ? 'Searching notes and asking the tutor...' : answer || 'Ask about the approach, an error, or a concept. The tutor will show its sources.'}</div>
    {answer && !busy && <div className="tutor-actions" aria-label="Rate this tutor response"><span>Was this helpful?</span><button disabled={feedbackBusy || rating !== null} onClick={() => rate(1)} aria-pressed={rating === 1}>Helpful</button><button disabled={feedbackBusy || rating !== null} onClick={() => rate(-1)} aria-pressed={rating === -1}>Not helpful</button>{rating !== null && <small>Thanks for your feedback.</small>}</div>}
    {sources.length > 0 && <div className="tutor-sources"><b>Sources</b>{sources.map(source => <div className="source-chip" key={source.id}>[{source.id}] {source.title}<small>{source.topic || source.source}</small></div>)}</div>}
    {error && <div className="auth-error">{error}</div>}
    <textarea className="tutor-question" value={question} onChange={event => { setQuestion(event.target.value); setRetryAvailable(false); }} placeholder="Ask the tutor..." maxLength={2000} />
    <button className="run" disabled={busy || !question.trim()} onClick={() => ask()}>{busy ? 'Thinking...' : 'Ask tutor'}</button>
    {error && retryAvailable && <button className="outline" disabled={busy} onClick={() => ask(question)}>Retry question</button>}
    {runApprovalOpen && <div className="auth-backdrop" role="presentation">
      <section className="auth-card" role="alertdialog" aria-modal="true" aria-labelledby="mcp-run-title" aria-describedby="mcp-run-description">
        <h2 id="mcp-run-title">Allow code execution?</h2>
        <p id="mcp-run-description">This sends your current {language} code to the configured MCP server and Judge0 sandbox with empty stdin and the platform's time and memory limits.</p>
        <pre className="mcp-result" aria-label="Code that will be sent to the runner">{code}</pre>
        <div className="tutor-actions">
          <button disabled={mcpBusy} onClick={() => setRunApprovalOpen(false)}>Deny</button>
          <button className="run" disabled={mcpBusy} onClick={() => callMcpTool('run_code', { language, code, stdin: '' }, true)}>{mcpBusy ? 'Running…' : 'Allow and run'}</button>
        </div>
      </section>
    </div>}
  </div>;
}

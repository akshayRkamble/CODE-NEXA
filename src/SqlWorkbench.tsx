import { useState } from 'react';
import { sqlProblems } from './sqlProblems';
import { markSqlProblemSolved, readSqlSolvedIds } from './sqlProgress';
import Icon from './Icon';

type Dataset = 'Employees' | 'Orders' | 'Library';
type QueryResult = { columns: string[]; rows: unknown[][]; elapsed: number };
type Reply = { ok: boolean; error?: string; columns?: string[]; rows?: unknown[][]; elapsed?: number; accepted?: boolean };
type Props = { signedIn: boolean; onRequireSignIn: () => void };

const starter = 'SELECT department_id, COUNT(*) AS team_size, ROUND(AVG(salary)) AS avg_salary\nFROM employees\nGROUP BY department_id\nORDER BY avg_salary DESC;';

export default function SqlWorkbench({ signedIn, onRequireSignIn }: Props) {
  const [dataset, setDataset] = useState<Dataset>('Employees');
  const [query, setQuery] = useState(() => localStorage.getItem('nexa-sql-query') || starter);
  const [taskId, setTaskId] = useState(1);
  const [showSolution, setShowSolution] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [message, setMessage] = useState('Run a query to see results.');
  const [history, setHistory] = useState<string[]>(() => JSON.parse(localStorage.getItem('nexa-sql-history') || '[]'));
  const [solvedIds, setSolvedIds] = useState<number[]>(readSqlSolvedIds);
  const [aiBusy, setAiBusy] = useState(false);
  const task = sqlProblems.find(item => item.id === taskId) || sqlProblems[0];

  function selectTask(id: number) {
    const selected = sqlProblems.find(item => item.id === id);
    if (!selected) return;
    setTaskId(id);
    setShowSolution(false);
    setResult(null);
    setMessage('Write a query, then run it.');
    setDataset(selected.solution.toLowerCase().includes('books') ? 'Library' : selected.solution.toLowerCase().includes('orders') ? 'Orders' : 'Employees');
    setQuery('SELECT\n  -- Build your query here\n');
  }

  function run(check = false, queryText = query): Promise<boolean> {
    setMessage(check ? 'Checking your answer...' : 'Running query...');
    return new Promise(resolve => {
      const worker = new Worker(new URL('./lib/workers/sql.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (event: MessageEvent<Reply>) => {
        worker.terminate();
        if (!event.data.ok) {
          setResult(null);
          setMessage(event.data.error || 'Query failed.');
          resolve(false);
          return;
        }
        const next = {
          columns: event.data.columns || [],
          rows: event.data.rows || [],
          elapsed: event.data.elapsed || 0
        };
        setResult(next);
        const accepted = event.data.accepted;
        setMessage(check
          ? accepted ? 'Accepted - result matches the reference.' : 'Not quite - compare your result with the prompt.'
          : `${next.rows.length} rows - ${next.elapsed} ms`);
        if (check && accepted) {
          try {
            setSolvedIds(markSqlProblemSolved(task.id));
          } catch {
            setMessage('Accepted, but SQL practice progress could not be saved in this browser.');
          }
        }
        const updated = [queryText, ...history.filter(item => item !== queryText)].slice(0, 20);
        setHistory(updated);
        localStorage.setItem('nexa-sql-history', JSON.stringify(updated));
        localStorage.setItem('nexa-sql-query', queryText);
        resolve(check ? accepted === true : true);
      };
      worker.onerror = () => {
        worker.terminate();
        setResult(null);
        setMessage('Could not start the SQLite worker.');
        resolve(false);
      };
      worker.postMessage({ id: task.id, query: queryText, dataset, expectedQuery: check ? task.solution : undefined });
    });
  }

  async function solveWithAi() {
    if (!signedIn) {
      setMessage('Sign in to generate a SQL query with AI.');
      onRequireSignIn();
      return;
    }

    setAiBusy(true);
    setMessage('Asking AI to solve this SQL exercise...');
    setShowSolution(false);
    try {
      const response = await fetch('/api/ai/sql-solve', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem: { title: task.title, topic: task.topic, prompt: task.prompt },
          dataset,
          query
        })
      });
      const data = await response.json() as { solution?: string; error?: string };
      if (!response.ok || !data.solution) throw new Error(data.error || 'AI could not generate a SQL query.');

      setQuery(data.solution);
      setMessage('AI query generated. Checking it against the reference...');
      const accepted = await run(true, data.solution);
      if (!accepted) setShowSolution(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not generate an AI query.');
    } finally {
      setAiBusy(false);
    }
  }

  function download(format: 'json' | 'csv') {
    if (!result) return;
    const content = format === 'json'
      ? JSON.stringify(result.rows.map(row => Object.fromEntries(result.columns.map((key, index) => [key, row[index]]))), null, 2)
      : [result.columns.join(','), ...result.rows.map(row => row.map(value => JSON.stringify(value ?? '')).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `nexacode-results.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <div className="sql-view">
    <small className="eyebrow">IN-BROWSER QUERY WORKBENCH</small>
    <h1>Explore your data</h1>
    <div className="sql-practice">
      <label htmlFor="sql-task">SQL practice - {solvedIds.length} / {sqlProblems.length} solved</label>
      <select id="sql-task" value={taskId} onChange={event => selectTask(Number(event.target.value))}>
        {sqlProblems.map(item => <option value={item.id} key={item.id}>{String(item.id).padStart(2, '0')} - {item.title} [{item.topic}]{solvedIds.includes(item.id) ? ' [Solved]' : ''}</option>)}
      </select>
      <p>{task.prompt}{solvedIds.includes(task.id) && <strong> · Completed</strong>}</p>
      <div className="sql-practice-actions">
        <button className="outline" onClick={() => setShowSolution(!showSolution)}>{showSolution ? 'Hide reference query' : 'Show reference query'}</button>
        <button className="run sql-ai-solve" onClick={solveWithAi} disabled={aiBusy}>
          <Icon name="play" /> {aiBusy ? 'Generating...' : 'AI solve'}
        </button>
      </div>
      {showSolution && <pre>{task.solution}</pre>}
    </div>
    <div className="sql-grid">
      <aside className="card">
        <h3>Schema explorer</h3>
        <p><Icon name="table" /> employees<small>id - name - department_id - salary - hired_at</small></p>
        <p><Icon name="table" /> departments<small>id - name - location</small></p>
        <p><Icon name="table" /> orders<small>id - employee_id - total - status - created_at</small></p>
        <p><Icon name="table" /> books <small>(Library dataset)</small></p>
        <h3>Sample database</h3>
        <select className="dataset-select" value={dataset} onChange={event => setDataset(event.target.value as Dataset)}>
          <option>Employees</option><option>Orders</option><option>Library</option>
        </select>
        <p className="muted">Queries run against an in-memory, read-only SQLite worker.</p>
      </aside>
      <section className="card">
        <h3>query.sql
          <button className="outline" onClick={() => void run(true)}>Check answer</button>
          <button className="run" onClick={() => void run()}><Icon name="play" /> Run query</button>
          <button className="outline" onClick={() => { setQuery(starter); setResult(null); setMessage('Starter query restored.'); }}>Reset</button>
        </h3>
        <textarea aria-label="SQL query" className="sql-code" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => {
          if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            void run();
          }
        }} />
        <p className="sql-result" role="status">{message}</p>
        {result && <>
          <div className="sql-export">
            <button onClick={() => download('json')}>Export JSON</button>
            <button onClick={() => download('csv')}>Export CSV</button>
            <span>Ctrl+Enter to run</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead><tr>{result.columns.map(column => <th key={column}>{column}</th>)}</tr></thead>
              <tbody>{result.rows.map((row, index) => <tr key={index}>{row.map((value, column) => <td key={column}>{String(value ?? 'NULL')}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </>}
        <div className="history"><b>Query history</b>{history.slice(0, 4).map((item, index) =>
          <button key={`${item}-${index}`} onClick={() => setQuery(item)}>{item.split('\n')[0].slice(0, 72)}</button>
        )}</div>
      </section>
    </div>
  </div>;
}

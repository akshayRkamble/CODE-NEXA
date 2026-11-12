import { useEffect, useMemo, useState } from 'react';
import { sqlProblems } from './sqlProblems';
import { readSqlSolvedIds, SQL_PROGRESS_EVENT, SQL_PROGRESS_STORAGE_KEY } from './sqlProgress';

type Plan = { id: string; title: string; durationDays: number; description: string };
type PlanDay = { day: number; problems: string[] };
type Enrollment = { planId: string; startedAt: string };
type ActivityDay = { day: string; submissions: number; accepted: number };
type Progress = {
  solved: { problem_slug: string; solved_at: string }[];
  byVerdict: { verdict: string; count: number }[];
  byTopic: { topic: string; solved: number }[];
  byDifficulty: { difficulty: string; solved: number }[];
  activity: ActivityDay[];
  recent: { id: string; problem_slug: string | null; language: string; verdict: string; created_at: string }[];
  totalSolved: number;
  totalSubmissions: number;
};
type Leader = { display_name: string; solved: number };

function previousDay(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export default function ProgressDashboard({ count, total, signedIn }: { count: number; total: number; signedIn: boolean }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState('30-day');
  const [days, setDays] = useState<PlanDay[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [sqlSolvedIds, setSqlSolvedIds] = useState<number[]>(readSqlSolvedIds);
  const [message, setMessage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(false);

  useEffect(() => {
    const refreshSqlProgress = () => setSqlSolvedIds(readSqlSolvedIds());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === SQL_PROGRESS_STORAGE_KEY) refreshSqlProgress();
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener(SQL_PROGRESS_EVENT, refreshSqlProgress);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(SQL_PROGRESS_EVENT, refreshSqlProgress);
    };
  }, []);

  useEffect(() => {
    fetch('/api/study-plans').then(r => r.ok ? r.json() : null).then(data => setPlans(data?.items || [])).catch(() => {});
    fetch('/api/leaderboard').then(r => r.ok ? r.json() : null).then(data => setLeaders(data?.items || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setEnrollment(null);
      setProgress(null);
      return;
    }
    let active = true;
    setLoadingProgress(true);
    Promise.all([
      fetch('/api/study-plans/me', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
      fetch('/api/progress', { credentials: 'include' }).then(r => r.ok ? r.json() : null)
    ]).then(([planData, progressData]) => {
      if (!active) return;
      const saved = planData?.enrollment || null;
      setEnrollment(saved);
      if (saved) setSelected(saved.planId);
      setProgress(progressData?.solved ? progressData as Progress : null);
    }).catch(() => { if (active) setMessage('Could not load account progress. Check your connection and try again.'); })
      .finally(() => { if (active) setLoadingProgress(false); });
    return () => { active = false; };
  }, [signedIn]);

  useEffect(() => {
    fetch(`/api/study-plans/${selected}`).then(r => r.ok ? r.json() : null).then(data => setDays(data?.days || [])).catch(() => setDays([]));
  }, [selected]);

  const solvedSlugs = useMemo(() => new Set(progress?.solved.map(item => item.problem_slug) || []), [progress]);
  const today = enrollment?.planId === selected
    ? Math.floor((Date.now() - new Date(`${enrollment.startedAt.slice(0, 10)}T00:00:00`).getTime()) / 86400000) + 1
    : 0;
  const task = today > 0 && today <= days.length ? days.find(day => day.day === today) : undefined;
  const taskComplete = Boolean(task?.problems.length && task.problems.every(slug => solvedSlugs.has(slug)));
  const activityDays = progress?.activity || [];
  const activityDates = useMemo(() => new Set(activityDays.filter(item => item.submissions > 0).map(item => item.day)), [activityDays]);
  const todayKey = new Date().toISOString().slice(0, 10);
  let cursor = activityDates.has(todayKey) ? todayKey : previousDay(todayKey);
  let streak = 0;
  while (activityDates.has(cursor)) { streak++; cursor = previousDay(cursor); }
  const week = activityDays.slice(-7);
  const weekMax = Math.max(1, ...week.map(item => item.submissions));
  const topics = progress?.byTopic || [];
  const topicMax = Math.max(1, ...topics.map(item => item.solved));
  const solvedCount = signedIn && progress ? progress.totalSolved : count;
  const weeklySubmissions = week.reduce((sum, item) => sum + item.submissions, 0);
  const totalAttempts = signedIn && progress ? progress.totalSubmissions : 0;
  const acceptedAttempts = progress?.byVerdict.find(item => item.verdict === 'Accepted')?.count || 0;
  const acceptance = totalAttempts ? Math.round(100 * acceptedAttempts / totalAttempts) : 0;

  async function startPlan() {
    setMessage('');
    try {
      const response = await fetch('/api/study-plans/me', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: selected }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not start this plan.');
      setEnrollment(data.enrollment);
      setMessage('Plan started. Your schedule begins today.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not start this plan.'); }
  }

  return <div className="dashboard">
    <small className="eyebrow">YOUR LEARNING OVERVIEW</small>
    <h1>Progress</h1>
    <p>{signedIn ? 'Your accepted solutions and practice activity sync with your account. SQL practice progress is saved in this browser.' : 'Sign in to sync solved problems and practice activity across devices. SQL practice progress is saved in this browser.'}</p>
    <div className="stats">
      <div className="stat stat-progress"><span>Problems solved</span><strong>{solvedCount}<small> / {total}</small></strong><div className="stat-meter" role="progressbar" aria-label="Problems solved" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(solvedCount, total)}><i style={{ width: `${total ? Math.min(100, 100 * solvedCount / total) : 0}%` }} /></div><small>{signedIn ? 'Account accepted solutions' : 'This browser'}</small></div>
      <div className="stat"><span>Current streak</span><strong>{signedIn ? `${streak} ${streak === 1 ? 'day' : 'days'}` : '—'}</strong><small>{signedIn ? 'Consecutive days with submissions' : 'Sign in to track your streak'}</small></div>
      <div className="stat"><span>Acceptance rate</span><strong>{signedIn ? `${acceptance}%` : '—'}</strong><small>{signedIn ? `${totalAttempts} total submissions` : 'Account statistic'}</small></div>
      <div className="stat"><span>Study plan</span><strong>{selected === '30-day' ? '30' : '60'} days</strong><small>{taskComplete ? `Day ${today} complete` : task ? `Day ${today} of ${days.length}` : enrollment?.planId === selected ? 'Plan complete' : 'Not started'}</small></div>
      <div className="stat"><span>SQL practice</span><strong>{sqlSolvedIds.length}<small> / {sqlProblems.length}</small></strong><div className="stat-meter" role="progressbar" aria-label="SQL exercises solved" aria-valuemin={0} aria-valuemax={sqlProblems.length} aria-valuenow={sqlSolvedIds.length}><i style={{ width: `${100 * sqlSolvedIds.length / sqlProblems.length}%` }} /></div><small>Saved in this browser</small></div>
    </div>

    <div className="dash-cards">
      <div className="card"><h3>Choose a study plan</h3><div className="plan-options">{plans.map(plan => <button className={selected === plan.id ? 'active' : ''} key={plan.id} onClick={() => setSelected(plan.id)}><b>{plan.title}</b><small>{plan.description}</small></button>)}</div>{signedIn && enrollment?.planId !== selected && <button className="outline" onClick={startPlan}>Start this plan</button>}{!signedIn && <p className="muted">Sign in to save your plan schedule.</p>}{task && <div className="today-task"><b>Day {task.day} · today’s practice {taskComplete ? '· complete' : ''}</b><p>{task.problems.join(', ')}</p></div>}{message && <p className="muted" role="status">{message}</p>}</div>
      <div className="card"><h3>Weekly leaderboard</h3>{leaders.length ? leaders.map((row, i) => <div className="leader-row" key={`${row.display_name}-${i}`}><span>{i + 1}. {row.display_name}</span><b>{row.solved} solved</b></div>) : <p className="muted">Accepted submissions appear here once the database is running.</p>}</div>
    </div>

    <div className="dash-cards">
      <div className="card"><h3><span>Activity · last 7 days</span><small>{weeklySubmissions} submissions</small></h3>{signedIn && loadingProgress ? <p className="muted">Loading account activity…</p> : <div className="bars">{(week.length ? week : Array.from({ length: 7 }, (_, i) => ({ day: '', submissions: 0, accepted: 0, label: 'MTWTFSS'[i] }))).map((item, i) => <div key={item.day || i} title={`${item.day || 'No activity'} · ${item.submissions} submissions`} aria-label={`${item.day || 'No activity'}: ${item.submissions} submissions, ${item.accepted} accepted`}><b className="bar-count">{item.submissions || ''}</b><i style={{ height: `${Math.max(5, 48 * item.submissions / weekMax)}px`, opacity: item.submissions ? .45 + .55 * item.submissions / weekMax : .16 }} /><small>{item.day ? new Date(`${item.day}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' }).slice(0, 1) : 'MTWTFSS'[i]}</small></div>)}</div>}{signedIn && <p className="muted">{activityDates.size} active days in the past year</p>}</div>
      <div className="card"><h3><span>Accepted problems by difficulty</span></h3>{signedIn ? (progress?.byDifficulty.length ? progress.byDifficulty.map(item => <div className="topic" key={item.difficulty}><span className="topic-label"><span>{item.difficulty}</span><b className="topic-count">{item.solved}</b></span><i role="progressbar" aria-label={`${item.difficulty} problems solved`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(item.solved, total)}><b className={item.difficulty.toLowerCase()} style={{ width: `${Math.min(100, 100 * item.solved / Math.max(1, total))}%` }} /></i></div>) : <p className="muted">Solve a problem to see your difficulty breakdown.</p>) : <p className="muted">Sign in to see your account breakdown.</p>}</div>
    </div>

    <div className="dash-cards">
      <div className="card"><h3><span>Topic focus</span></h3>{signedIn ? (topics.length ? topics.map(item => <div className="topic" key={item.topic}><span className="topic-label"><span>{item.topic}</span><b className="topic-count">{item.solved}</b></span><i role="progressbar" aria-label={`${item.topic}: ${item.solved} solved`} aria-valuemin={0} aria-valuemax={topicMax} aria-valuenow={item.solved}><b style={{ width: `${100 * item.solved / topicMax}%` }} /></i></div>) : <p className="muted">Accepted solutions will build your topic breakdown.</p>) : <p className="muted">Sign in to see solved problems grouped by topic.</p>}</div>
      <div className="card"><h3><span>Recent submissions</span></h3>{signedIn ? (progress?.recent.length ? progress.recent.slice(0, 6).map(item => <div className="leader-row" key={item.id}><span>{item.problem_slug || 'Code run'} · {item.language}</span><b className={item.verdict === 'Accepted' ? 'easy' : 'hard'}>{item.verdict}</b></div>) : <p className="muted">Your submitted solutions will appear here.</p>) : <p className="muted">Sign in to view submission history.</p>}</div>
    </div>
  </div>;
}

import Icon from './Icon';

type HomeProblem = { id: number; title: string; topic: string; level: string };
type HomeView = 'Practice' | 'Editor' | 'SQL' | 'Progress' | 'Chat';

export default function HomePage({
  solved,
  total,
  nextProblem,
  displayName,
  onOpenPractice,
  onNavigate
}: {
  solved: number;
  total: number;
  nextProblem?: HomeProblem;
  displayName?: string;
  onOpenPractice: (problemId?: number) => void;
  onNavigate: (view: HomeView) => void;
}) {
  const firstName = displayName?.trim().split(/\s+/)[0] || 'builder';
  const progress = total ? Math.min(100, Math.round((solved / total) * 100)) : 0;

  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-copy">
          <span className="home-kicker"><span aria-hidden="true" /> YOUR SPACE TO GROW</span>
          <h1 id="home-title">Hey {firstName},<br />little steps add up.</h1>
          <p>Build your skills at your own pace. Explore a new idea, try it out, and celebrate what you learn along the way.</p>
          <div className="home-hero-actions">
            <button type="button" className="home-primary" onClick={() => onOpenPractice(nextProblem?.id)}>
              {nextProblem ? 'Continue learning' : 'Explore practice'} <Icon name="arrow-right" />
            </button>
            <button type="button" className="home-secondary" onClick={() => onNavigate('Progress')}>See your progress</button>
          </div>
          <div className="home-reassurance"><span aria-hidden="true">✦</span> No rush. Every bit of practice counts.</div>
        </div>
        <div className="home-hero-art" aria-hidden="true">
          <div className="home-orbit home-orbit-one" />
          <div className="home-orbit home-orbit-two" />
          <div className="home-idea-card">
            <span className="home-idea-label">A thought to keep</span>
            <span className="home-idea-mark">“</span>
            <strong>Progress is built<br />one curious moment<br />at a time.</strong>
            <span className="home-idea-spark">✳</span>
          </div>
          <span className="home-art-dot home-art-dot-one" />
          <span className="home-art-dot home-art-dot-two" />
        </div>
      </section>

      <section className="home-momentum" aria-labelledby="home-momentum-title">
        <div className="home-section-heading">
          <div><span className="home-kicker">YOUR JOURNEY</span><h2 id="home-momentum-title">Look how far you’ve come</h2></div>
          <button type="button" className="home-text-link" onClick={() => onNavigate('Progress')}>View progress <Icon name="arrow-right" /></button>
        </div>
        <div className="home-progress-card">
          <div className="home-progress-copy">
            <span className="home-progress-icon" aria-hidden="true">✦</span>
            <div><strong>{solved} {solved === 1 ? 'problem' : 'problems'} solved</strong><span>Every solution is a skill you’ve made your own.</span></div>
          </div>
          <div className="home-progress-track" role="progressbar" aria-label="Practice problems solved" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.min(solved, total)}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <span className="home-progress-count">{solved}<small> / {total}</small></span>
        </div>
      </section>

      <section className="home-next-steps" aria-labelledby="home-next-title">
        <div className="home-section-heading">
          <div><span className="home-kicker">MAKE IT YOURS</span><h2 id="home-next-title">Choose what feels right today</h2></div>
          <p>There’s no single path. Follow your curiosity.</p>
        </div>
        <div className="home-action-grid">
          <button type="button" className="home-action-card home-action-practice" onClick={() => onOpenPractice(nextProblem?.id)}>
            <span className="home-action-icon"><Icon name="practice" /></span>
            <span className="home-action-title">{nextProblem ? `Try ${nextProblem.title}` : 'Explore practice'}</span>
            <span className="home-action-description">{nextProblem ? `${nextProblem.topic} · ${nextProblem.level}` : 'Take on a small challenge, one step at a time.'}</span>
            <span className="home-action-link">Practice <Icon name="arrow-right" /></span>
          </button>
          <button type="button" className="home-action-card home-action-editor" onClick={() => onNavigate('Editor')}>
            <span className="home-action-icon"><Icon name="editor" /></span>
            <span className="home-action-title">Make something</span>
            <span className="home-action-description">Open a blank editor and see where an idea takes you.</span>
            <span className="home-action-link">Open editor <Icon name="arrow-right" /></span>
          </button>
          <button type="button" className="home-action-card home-action-sql" onClick={() => onNavigate('SQL')}>
            <span className="home-action-icon"><Icon name="sql" /></span>
            <span className="home-action-title">Explore data</span>
            <span className="home-action-description">Practice asking good questions with SQL.</span>
            <span className="home-action-link">Try SQL <Icon name="arrow-right" /></span>
          </button>
        </div>
      </section>

      <footer className="home-footer">
        <span aria-hidden="true">✳</span> Keep showing up for your curiosity. That’s how growth begins.
      </footer>
    </div>
  );
}

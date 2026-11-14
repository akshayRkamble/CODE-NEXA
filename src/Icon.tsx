import type { ReactNode } from 'react';

export type IconName =
  | 'theme'
  | 'home'
  | 'shortcuts'
  | 'practice'
  | 'editor'
  | 'sql'
  | 'progress'
  | 'chat'
  | 'settings'
  | 'search'
  | 'add'
  | 'flame'
  | 'arrow-right'
  | 'bookmark'
  | 'check'
  | 'arrow-left'
  | 'reset'
  | 'play'
  | 'table'
  | 'minimize'
  | 'maximize'
  | 'restore';

const paths: Record<IconName, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
  theme: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
  shortcuts: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 9h1m3 0h1m3 0h1M7 13h1m3 0h1m3 0h1M8 16h8" /></>,
  practice: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21z" /><path d="M4 5.5v13A2.5 2.5 0 0 1 6.5 16H20M8 7h8m-8 3h6" /></>,
  editor: <><path d="m8 6-6 6 6 6m8-12 6 6-6 6m-2-16-4 20" /></>,
  sql: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" /></>,
  progress: <><path d="M3 3v18h18M8 15l4-4 3 3 6-7" /></>,
  chat: <><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" /><path d="M8 11h8m-8 4h5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
  add: <><path d="M12 5v14M5 12h14" /></>,
  flame: <><path d="M12 22c4.4 0 7-3 7-7 0-3.3-2-5.5-4-8-1 3-2 3.5-3 4-1-3-3-5-4-7-1 4-4 7-4 11 0 4.1 3 7 8 7Z" /><path d="M12 22c-2 0-3-1.5-3-3.2 0-1.3.8-2.4 2-3.8.4 1.1 1.1 1.7 2 2.1.8-1.1 1.2-1.9 1.2-3 .8 1.2 1.8 2.4 1.8 4.4 0 2-1.5 3.5-4 3.5Z" /></>,
  'arrow-right': <><path d="M5 12h14m-7-7 7 7-7 7" /></>,
  bookmark: <><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4z" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  'arrow-left': <><path d="M19 12H5m7 7-7-7 7-7" /></>,
  reset: <><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" /><path d="M3 3v5h5" /></>,
  play: <><path d="m7 4 13 8-13 8z" /></>,
  table: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 10v10m6-10v10" /></>,
  minimize: <path d="M5 12h14" />,
  maximize: <><path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3" /></>,
  restore: <><path d="M8 8V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-3M5 8h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" /></>
};

export default function Icon({ name }: { name: IconName }) {
  return <svg className="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[name]}</svg>;
}

import { sqlProblems } from './sqlProblems';

export const SQL_PROGRESS_STORAGE_KEY = 'nexa-sql-solved';
export const SQL_PROGRESS_EVENT = 'nexa-sql-progress-change';

export function readSqlSolvedIds(): number[] {
  const saved: unknown = JSON.parse(localStorage.getItem(SQL_PROGRESS_STORAGE_KEY) || '[]');
  if (!Array.isArray(saved)) return [];

  const validIds = new Set(sqlProblems.map(problem => problem.id));
  return [...new Set(saved.filter((id): id is number =>
    typeof id === 'number' && Number.isInteger(id) && validIds.has(id)
  ))];
}

export function markSqlProblemSolved(id: number): number[] {
  const solved = readSqlSolvedIds();
  if (!sqlProblems.some(problem => problem.id === id) || solved.includes(id)) return solved;

  const updated = [...solved, id];
  localStorage.setItem(SQL_PROGRESS_STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event(SQL_PROGRESS_EVENT));
  return updated;
}

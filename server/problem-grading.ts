import { problemStarters } from './problem-starters.js';

/** Validates a legal topological order without requiring one exact ordering. */
export function isValidCourseOrder(order: unknown, n: number, prerequisites: number[][]): boolean {
  if (!Number.isInteger(n) || n < 0 || !Array.isArray(order) || !order.every(Number.isInteger)) return false;
  const graph = Array.from({ length: n }, () => [] as number[]);
  const indegree = Array(n).fill(0);
  for (const [course, before] of prerequisites) {
    if (course < 0 || course >= n || before < 0 || before >= n) return false;
    graph[before].push(course);
    indegree[course]++;
  }
  const queue: number[] = [];
  for (let course = 0; course < n; course++) if (!indegree[course]) queue.push(course);
  const sorted: number[] = [];
  for (let head = 0; head < queue.length; head++) {
    const course = queue[head];
    sorted.push(course);
    for (const next of graph[course]) if (--indegree[next] === 0) queue.push(next);
  }
  if (sorted.length < n) return order.length === 0;
  if (order.length !== n || new Set(order).size !== n || order.some(course => course < 0 || course >= n)) return false;
  const positions = new Map(order.map((course, index) => [course, index]));
  return prerequisites.every(([course, before]) => positions.get(before)! < positions.get(course)!);
}

/** Compare answers whose order is intentionally unspecified in the prompt. */
export function outputsMatch(slug: string, actual: unknown, expected: unknown, inputText: string): boolean {
  if (slug === 'course-completion-order') {
    const input = JSON.parse(inputText) as { n: number; prerequisites: number[][] };
    return isValidCourseOrder(actual, input.n, input.prerequisites);
  }
  if (['choose-number-combinations', 'unique-permutations', 'palindrome-partitions'].includes(slug)) {
    if (!Array.isArray(actual) || !Array.isArray(expected)) return false;
    const normalize = (items: unknown[]) => items.map(item => JSON.stringify(item)).sort();
    return JSON.stringify(normalize(actual)) === JSON.stringify(normalize(expected));
  }
  return JSON.stringify(actual) === JSON.stringify(expected);
}

const treeProblems = new Set(['widest-tree-level', 'balanced-tree-depth', 'root-leaf-target-sum', 'tree-right-view', 'tree-common-ancestor', 'tree-level-averages', 'tree-depth']);

/** Calls the named function declared in a submitted solution with the problem JSON input. */
export function wrapProblemCode(slug: string, source: string, input: string) {
  const value = JSON.parse(input) as Record<string, unknown>;
  const match = source.match(/function\s+([A-Za-z_$][\w$]*)\s*\(/);
  const expectedName = problemStarters[slug]?.match(/function\s+([A-Za-z_$][\w$]*)\s*\(/)?.[1];
  const functionName = expectedName || match?.[1];
  if (!functionName) throw Object.assign(new Error('Submit a named function matching the starter signature.'), { status: 422 });
  const serialized = (item: unknown) => JSON.stringify(item);
  let call: string;

  if (slug === 'rotate-grid') {
    call = `(()=>{const grid=${serialized(value.grid)};${functionName}(grid);return grid})()`;
  } else if (treeProblems.has(slug)) {
    const values = serialized(value.values);
    const makeTree = `(()=>{const values=${values};const make=index=>index>=values.length||values[index]===null?null:{val:values[index],left:make(index*2+1),right:make(index*2+2)};return make(0)})()`;
    const extras = slug === 'root-leaf-target-sum' ? `,${serialized(value.target)}` : slug === 'tree-common-ancestor' ? `,${serialized(value.p)},${serialized(value.q)}` : '';
    const result = `${functionName}(${makeTree}${extras})`;
    call = slug === 'tree-common-ancestor' ? `(()=>{const node=${result};return node ? node.val : null})()` : result;
  } else {
    call = `${functionName}(${Object.values(value).map(serialized).join(',')})`;
  }
  return `${source}\n;console.log(JSON.stringify(${call}));`;
}

export function prepareProblemTestRun(slug: string, source: string, language: string, input: string) {
  if (language === 'javascript' || language === 'typescript') {
    return { code: wrapProblemCode(slug, source, input), stdin: '' };
  }
  return { code: source, stdin: input };
}

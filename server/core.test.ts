import { describe,it,expect } from 'vitest';
import { chunkText } from './chunker';
import { redactSecrets } from './rag';
import { problems } from './problem-data';
import { allProblems } from './problem-bank';
import { referenceSolutions } from './problem-solutions';
import { problemStarters } from './problem-starters';
import { isValidCourseOrder, outputsMatch, prepareProblemTestRun, wrapProblemCode } from './problem-grading';
import { problemCases } from './problem-tests';
import { sqlProblems } from '../src/sqlProblems';

describe('knowledge chunking',()=>{
 it('keeps bounded chunks and the configured word overlap',()=>{const words=Array.from({length:820},(_,i)=>`w${i}`),parts=chunkText(words.join(' '),400,50);expect(parts).toHaveLength(3);expect(parts[0].split(' ')).toHaveLength(400);expect(parts[1].split(' ').slice(0,50)).toEqual(parts[0].split(' ').slice(-50));expect(parts[2].split(' ').slice(0,50)).toEqual(parts[1].split(' ').slice(-50))});
 it('rejects invalid overlap settings',()=>expect(()=>chunkText('a b c',4,4)).toThrow(RangeError));
});
describe('RAG secret guard',()=>{
 it('redacts common API keys and bearer tokens',()=>{const text=redactSecrets('sk-abcdefghijklmnop ghp_abcdefghijklmnopqrstuvwxyz Bearer abcdefghijk.123');expect(text).not.toContain('sk-abcdefghijklmnop');expect(text).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz');expect(text).not.toContain('Bearer abcdefghijk');expect(text.match(/REDACTED_SECRET/g)).toHaveLength(3)});
});
describe('course-order grading',()=>{
 it('accepts any valid topological order and rejects invalid or incomplete answers',()=>{
  const prerequisites=[[1,0],[2,0],[3,1],[3,2]];
  expect(isValidCourseOrder([0,1,2,3],4,prerequisites)).toBe(true);
  expect(isValidCourseOrder([0,2,1,3],4,prerequisites)).toBe(true);
  expect(isValidCourseOrder([1,0,2,3],4,prerequisites)).toBe(false);
  expect(isValidCourseOrder([0,1,2],4,prerequisites)).toBe(false);
  expect(isValidCourseOrder([],2,[[1,0],[0,1]])).toBe(true);
  expect(isValidCourseOrder([0],2,[[1,0],[0,1]])).toBe(false);
  expect(outputsMatch('course-completion-order',[0,2,1,3],[0,1,2,3],JSON.stringify({n:4,prerequisites}))).toBe(true);
  expect(outputsMatch('choose-number-combinations',[[2,3],[1,4]],[[1,4],[2,3]],'{}')).toBe(true);
  expect(outputsMatch('unique-permutations',[[1,2],[2,1]],[[2,1],[1,2]],'{}')).toBe(true);
  expect(outputsMatch('palindrome-partitions',[["aa","b"],["a","a","b"]],[["a","a","b"],["aa","b"]],'{}')).toBe(true);
 });
 describe('multi-language problem test execution',()=>{
  it('wraps JavaScript and TypeScript function solutions while passing JSON input to other runtimes',()=>{
   const input='{"values":[1,2]}',code='function answer(values) { return values.length; }';
   for(const language of ['javascript','typescript']){
    const prepared=prepareProblemTestRun('count-values',code,language,input);
    expect(prepared.code).toContain('console.log(JSON.stringify(answer([1,2])))');
    expect(prepared.stdin).toBe('');
   }
   for(const language of ['python','java','c','cpp','csharp','go','rust','php','ruby','kotlin']){
    expect(prepareProblemTestRun('count-values',code,language,input)).toEqual({code,stdin:input});
   }
  });
 });
});
describe('starter problem content',()=>{
 it('has unique problem slugs, original statements, starters, and references',()=>{expect(problems).toHaveLength(12);expect(allProblems).toHaveLength(150);expect(new Set(allProblems.map(problem=>problem.slug)).size).toBe(150);expect(allProblems.every(problem=>problem.description.length>30&&problemStarters[problem.slug]&&referenceSolutions[problem.slug])).toBe(true)});
 it('passes every seeded visible and hidden case with its reference solution',()=>{
  expect(problemCases).toHaveLength(450);
  expect(new Set(problemCases.map(([slug])=>slug)).size).toBe(150);
  for(const problem of allProblems){const cases=problemCases.filter(([slug])=>slug===problem.slug);expect(cases).toHaveLength(3);expect(cases.filter(([, , ,hidden])=>hidden)).toHaveLength(2);expect(cases.filter(([, , ,hidden])=>!hidden)).toHaveLength(1)}
  for(const [slug,input,expected] of problemCases){
   const output:string[]=[];
   const log=(...values:unknown[])=>output.push(values.map(value=>String(value)).join(' '));
   new Function('console',wrapProblemCode(slug,referenceSolutions[slug],input))({log});
   expect(output).toHaveLength(1);
   if(!outputsMatch(slug,JSON.parse(output[0]),JSON.parse(expected),input))throw new Error(`Reference mismatch for ${slug}: input ${input}, expected ${expected}, got ${output[0]}`);
  }
 });
 it('provides working reference solutions for all 150 shipped problems',()=>{
  expect(Object.keys(referenceSolutions)).toHaveLength(150);
  const run=(slug:string,call:string)=>new Function(`${referenceSolutions[slug]}\nreturn ${call};`)();
  const makeTree=(values:(number|null)[],i=0):unknown=>i>=values.length||values[i]===null?null:{val:values[i],left:makeTree(values,2*i+1),right:makeTree(values,2*i+2)};
  expect(run('pair-sum','pairSum([4,1,8,3],7)')).toEqual([0,3]);
  expect(run('balanced-brackets','isBalanced("{[()]}")')).toBe(true);
  expect(run('longest-unique-window','longestUniqueWindow("abcaefbb")')).toBe(5);
  expect(run('merge-time-blocks','mergeBlocks([[2,5],[4,8],[11,13]])')).toEqual([[2,8],[11,13]]);
  expect(run('ways-up-the-steps','countWays(10)')).toBe(89);
  expect(new Function(referenceSolutions['widest-tree-level']+`\nreturn widestLevel(${JSON.stringify(makeTree([8,4,12,2,6,null,14]))});`)()).toBe(3);
  expect(new Function(referenceSolutions['rotate-grid']+'\nconst grid=[[1,2],[3,4]];rotateGrid(grid);return grid;')()).toEqual([[3,1],[4,2]]);
  expect(run('graph-reachability','canReach([["a","b"],["b","c"]],"a","c")')).toBe(true);
  expect(run('minimum-coin-count','minCoins([1,3,4],6)')).toBe(2);
  expect(run('find-a-cycle','hasCycle(3,[[0,1],[1,2],[2,0]])')).toBe(true);
  expect(JSON.stringify(run('product-except-self','productExceptSelf([-1,1,0,-3,3])'))).toBe('[0,0,9,0,0]');
  expect(run('search-sorted-grid','searchGrid([[1,4,7],[9,12,16]],12)')).toBe(true);
  expect(run('pair-sum','pairSum([6,2,5],7)')).toEqual([1,2]);
  expect(run('balanced-brackets','isBalanced("([)]")')).toBe(false);
  expect(run('longest-unique-window','longestUniqueWindow("")')).toBe(0);
  expect(run('merge-time-blocks','mergeBlocks([])')).toEqual([]);
  expect(run('ways-up-the-steps','countWays(0)')).toBe(1);
  expect(new Function(referenceSolutions['widest-tree-level']+'\nreturn widestLevel(null);')()).toBe(0);
  expect(new Function(referenceSolutions['rotate-grid']+'\nconst grid=[[1]];rotateGrid(grid);return grid;')()).toEqual([[1]]);
  expect(run('graph-reachability','canReach([["a","b"],["c","d"]],"a","d")')).toBe(false);
  expect(run('minimum-coin-count','minCoins([2],3)')).toBe(-1);
  expect(run('find-a-cycle','hasCycle(3,[[0,1],[1,2]])')).toBe(false);
  expect(JSON.stringify(run('product-except-self','productExceptSelf([0,5,2])'))).toBe('[10,0,0]');
  expect(run('search-sorted-grid','searchGrid([],3)')).toBe(false);
  expect(run('stable-parity-partition','partitionParity([5,2,7,4,3,6])')).toEqual([2,4,6,5,7,3]);
  expect(run('closest-sorted-pair','closestPair([1,3,6,9],10)')).toEqual([1,9]);
  expect(run('longest-budget-window','maxAffordableWindow([2,1,2,1,3],5)')).toBe(3);
  expect(run('next-warmer-day','nextWarmerDays([68,70,69,72])')).toEqual([1,2,1,0]);
  expect(run('insertion-position','insertionPosition([1,3,3,5],3)')).toBe(1);
  expect(run('middle-chain-value','middleValue([4,8,3,9,2,7])')).toBe(9);
  expect(new Function(referenceSolutions['balanced-tree-depth']+`\nreturn isBalancedTree(${JSON.stringify(makeTree([6,3,9,2,4]))});`)()).toBe(true);
  expect(run('prefix-word-count','countPrefix(["tree","track","trie","map"],"tr")')).toBe(3);
  expect(run('top-k-frequent-values','topKFrequent([4,2,4,3,2,4],2)')).toEqual([4,2]);
  expect(run('choose-number-combinations','chooseCombinations(5,2,6)')).toEqual([[1,5],[2,4]]);
  expect(run('course-completion-order','courseOrder(4,[[1,0],[2,0],[3,1],[3,2]])')).toEqual([0,1,2,3]);
  expect(run('maximum-nonadjacent-score','maxNonadjacentScore([3,2,7,10])')).toBe(13);
  expect(run('stable-parity-partition','partitionParity([-3,-2,0,5])')).toEqual([-2,0,-3,5]);
  expect(run('closest-sorted-pair','closestPair([2,4],100)')).toEqual([2,4]);
  expect(run('longest-budget-window','maxAffordableWindow([3,4],1)')).toBe(0);
  expect(run('next-warmer-day','nextWarmerDays([70,70,70])')).toEqual([0,0,0]);
  expect(run('insertion-position','insertionPosition([],4)')).toBe(0);
  expect(run('middle-chain-value','middleValue([])')).toBe(null);
  const unbalancedTree=makeTree([1,2,2,3,null,null,3,4,null,null,4]);
  expect(new Function(referenceSolutions['balanced-tree-depth']+`\nreturn isBalancedTree(${JSON.stringify(unbalancedTree)});`)()).toBe(false);
  expect(run('prefix-word-count','countPrefix([],"")')).toBe(0);
  expect(run('top-k-frequent-values','topKFrequent([5,1,5,1,2],2)')).toEqual([1,5]);
  expect(run('choose-number-combinations','chooseCombinations(3,3,7)')).toEqual([]);
  expect(run('course-completion-order','courseOrder(2,[[1,0],[0,1]])')).toEqual([]);
  expect(run('maximum-nonadjacent-score','maxNonadjacentScore([])')).toBe(0);
  expect(run('count-equal-pairs','countEqualPairs([1,1,1,2,2])')).toBe(4);
  expect(run('shortest-target-window','shortestTargetWindow([2,3,1,2,4,3],7)')).toBe(2);
  expect(run('evaluate-postfix-expression','evaluatePostfix(["4","13","5","/","+"])')).toBe(6);
  expect(run('target-range','targetRange([1,2,2,2,5],2)')).toEqual([1,3]);
  expect(run('reverse-chain-values','reverseChainValues([2,4,6,8])')).toEqual([8,6,4,2]);
  const sumTree=makeTree([5,4,8,11,null,13,4,7,2]);
  expect(new Function(referenceSolutions['root-leaf-target-sum']+`\nreturn hasRootLeafTarget(${JSON.stringify(sumTree)},22);`)()).toBe(true);
  expect(run('shared-word-prefix','sharedWordPrefix(["planet","plant","plane"])')).toBe('plan');
  expect(run('kth-largest-value','kthLargest([7,1,5,3],2)')).toBe(5);
  expect(run('unique-permutations','uniquePermutations([1,1,2])')).toEqual([[1,1,2],[1,2,1],[2,1,1]]);
  expect(run('network-component-count','countComponents(5,[[0,1],[1,2],[3,4]])')).toBe(2);
  expect(run('digit-message-count','digitMessageCount("226")')).toBe(3);
  expect(run('obstacle-grid-paths','obstacleGridPaths([[0,0,0],[0,1,0],[0,0,0]])')).toBe(2);
 });
 it('contains 50 distinct SQL exercises',()=>{expect(sqlProblems).toHaveLength(50);expect(new Set(sqlProblems.map(problem=>problem.title)).size).toBe(50);expect(sqlProblems.every(problem=>problem.solution.trim().toLowerCase().startsWith('select')||problem.solution.trim().toLowerCase().startsWith('with'))).toBe(true)});
});

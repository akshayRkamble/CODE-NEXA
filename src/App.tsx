import { lazy, Suspense, useEffect, useState, type CSSProperties } from 'react';
import Icon, { type IconName } from './Icon';
import SqlWorkbench from './SqlWorkbench';
import TutorPanel from './TutorPanelWithFeedback';
import ProgressDashboard from './ProgressDashboard';
import AuthDialog, { type SessionUser } from './AuthDialogFixed';
import { balancedBracketsStarters } from './problemLanguageStarters';
import { getPracticeLanguage, practiceLanguages, standaloneStarters, type PracticeLanguage } from './editorLanguages';
const CodeEditor = lazy(() => import('./CodeEditor'));
const StandaloneEditor = lazy(() => import('./StandaloneEditor'));
type Problem={id:number;slug:string;title:string;level:string;topic:string;description:string;starter:string;sample:string;hints:string[]};
const problems=[
{id:1,title:'Pair Sum',level:'Easy',topic:'Arrays & Hashing',description:'Given a list of integers and a target value, return the indices of two distinct entries whose values add up to the target. Assume exactly one pair exists.',starter:'function pairSum(values, target) {\n  // Your solution\n}\n\nconsole.log(pairSum([4, 1, 8, 3], 7));',sample:'Input: [4, 1, 8, 3], target = 7\nOutput: [0, 3]',hints:['Try checking every pair first.','Store values already visited in a map.','Look for target - x before storing x.']},
{id:2,title:'Balanced Brackets',level:'Easy',topic:'Stack',description:'Determine whether a string of (), [] and {} brackets is correctly nested and closed.',starter:'function isBalanced(text) {\n  // Your solution\n}\nconsole.log(isBalanced("{[()]}"));',sample:'Input: "{[()]}"\nOutput: true',hints:['The most recent opener closes first.','A stack tracks the latest opening bracket.','Compare each closer with the stack top.']},
{id:3,title:'Longest Unique Window',level:'Medium',topic:'Sliding Window',description:'Return the length of the longest contiguous substring without repeated characters.',starter:'function longestUniqueWindow(text) {\n  // Your solution\n}\nconsole.log(longestUniqueWindow("abcaefbb"));',sample:'Input: "abcaefbb"\nOutput: 5',hints:['Try a moving window.','Track each character’s latest index.','Move left past duplicates, never backwards.']},
{id:4,title:'Merge Time Blocks',level:'Medium',topic:'Intervals',description:'Combine overlapping time blocks and return them in start-time order.',starter:'function mergeBlocks(blocks) {\n  // Your solution\n}\nconsole.log(mergeBlocks([[2,5],[4,8],[11,13]]));',sample:'Input: [[2,5], [4,8], [11,13]]\nOutput: [[2,8], [11,13]]',hints:['Sort by start time.','Compare to the last merged end.','Extend when the next block overlaps.']},
{id:5,title:'Tree Level Width',level:'Medium',topic:'Trees',description:'For a binary tree, return the largest number of nodes appearing at any depth level.',starter:'function widestLevel(root) {\n  // Your solution\n}',sample:'Input: [8, 4, 12, 2, 6, null, 14]\nOutput: 3',hints:['Visit nodes level by level.','A queue holds the current frontier.','Measure queue length for each level.']},
{id:6,title:'Ways Up the Steps',level:'Easy',topic:'Dynamic Programming',description:'You may climb one or two steps at a time. Return the number of ways to reach step n.',starter:'function countWays(n) {\n  // Your solution\n}\nconsole.log(countWays(4));',sample:'Input: n = 4\nOutput: 5',hints:['Consider the final move into step n.','Combine ways to reach n-1 and n-2.','Keep the previous two counts.']},
{id:7,title:'Rotate a Grid',level:'Medium',topic:'Matrix',description:'Rotate a square matrix 90 degrees clockwise in place.',starter:'function rotateGrid(grid) {\n  // Your solution\n}',sample:'Input: [[1,2],[3,4]]\nOutput: [[3,1],[4,2]]',hints:['Transpose then reverse rows.','Swap across the main diagonal.','Reverse each row after transposing.']},
{id:8,title:'Graph Reachability',level:'Medium',topic:'Graphs',description:'Given an undirected graph and two labels, decide whether a path connects them.',starter:'function canReach(edges, start, end) {\n  // Your solution\n}',sample:'Input: edges [[a,b],[b,c]], a to c\nOutput: true',hints:['Build an adjacency list.','Start BFS or DFS.','Track visited nodes.']},
{id:9,title:'Minimum Coin Count',level:'Medium',topic:'Dynamic Programming',description:'Return the fewest coins needed to make an amount, or -1 when impossible.',starter:'function minCoins(coins, amount) {\n  // Your solution\n}',sample:'Input: coins [1,3,4], amount 6\nOutput: 2',hints:['Try each coin as the last coin.','Build answers for smaller amounts.','Mark unreachable amounts above target.']},
{id:10,title:'Find a Cycle',level:'Hard',topic:'Graphs',description:'Given a directed graph, determine whether it contains a cycle.',starter:'function hasCycle(nodeCount, edges) {\n  // Your solution\n}',sample:'Input: edges [[0,1],[1,2],[2,0]]\nOutput: true',hints:['DFS can reveal back edges.','Track the active recursion path.','Reaching an active node means a cycle.']},
{id:11,title:'Product Except Self',level:'Medium',topic:'Arrays & Hashing',description:'For every position, return the product of all other values without division.',starter:'function productExceptSelf(values) {\n  // Your solution\n}',sample:'Input: [2,3,4]\nOutput: [12,8,6]',hints:['Compute products from left and right.','Prefix excludes the current element.','Combine prefix and suffix passes.']},
{id:12,title:'Search a Sorted Grid',level:'Hard',topic:'Binary Search',description:'Rows are sorted and each row begins above the previous row’s end. Return whether target is present.',starter:'function searchGrid(grid, target) {\n  // Your solution\n}',sample:'Input: [[1,4,7],[9,12,16]], target 12\nOutput: true',hints:['Treat the matrix as one sorted sequence.','Map flat index to row and column.','Binary search all positions.']}
];
const slugById:Record<number,string>={1:'pair-sum',2:'balanced-brackets',3:'longest-unique-window',4:'merge-time-blocks',5:'widest-tree-level',6:'ways-up-the-steps',7:'rotate-grid',8:'graph-reachability',9:'minimum-coin-count',10:'find-a-cycle',11:'product-except-self',12:'search-sorted-grid'};
const activityItems: {name:string;icon:IconName}[]=[{name:'Practice',icon:'practice'},{name:'Editor',icon:'editor'},{name:'SQL',icon:'sql'},{name:'Progress',icon:'progress'}];
const starterFor=(language:PracticeLanguage,javascriptStarter:string)=>/function isBalanced\s*\(/.test(javascriptStarter)?balancedBracketsStarters[language]||javascriptStarter:language==='javascript'||language==='typescript'?javascriptStarter:standaloneStarters[language]||'// Read the JSON test input from stdin and print the JSON result to stdout.';
export default function App(){
 const [initialLanguage] = useState<PracticeLanguage>(()=>getPracticeLanguage(localStorage.getItem('nexa-language')||'javascript').id);
 const [questionsVisible,setQuestionsVisible]=useState(true);
 const [codingPanelMode,setCodingPanelMode]=useState<'normal'|'maximized'|'minimized'>('normal');
 const [problemList,setProblemList]=useState<Problem[]>(()=>problems.map(p=>({...p,slug:slugById[p.id]}))),[view,setView]=useState('Practice'),[problem,setProblem]=useState<Problem>(()=>({...problems[0],slug:slugById[1]})),[filter,setFilter]=useState('All'),[search,setSearch]=useState(''),[language,setLanguage]=useState<PracticeLanguage>(initialLanguage),[tab,setTab]=useState('Description'),[consoleTab,setConsoleTab]=useState<'Testcase'|'Test Result'>('Testcase'),[splitPercent,setSplitPercent]=useState(47),[consoleHeight,setConsoleHeight]=useState(225),[code,setCode]=useState(()=>{const saved=localStorage.getItem(`nexa-code-1-${initialLanguage}`);return saved||(['javascript','typescript'].includes(initialLanguage)?localStorage.getItem('nexa-code-1')||problems[0].starter:starterFor(initialLanguage,problems[0].starter))}),[output,setOutput]=useState('Ready when you are. Run your code to see output.'),[referenceSolution,setReferenceSolution]=useState<string|null>(null),[referenceAvailable,setReferenceAvailable]=useState(false),[solved,setSolved]=useState<number[]>(()=>JSON.parse(localStorage.getItem('nexa-solved')||'[]')),[font,setFont]=useState(()=>Number(localStorage.getItem('nexa-font-size'))||13),[hints,setHints]=useState<Record<number,number>>({}),[theme,setTheme]=useState(()=>localStorage.getItem('nexa-theme')==='light'),[bookmarks,setBookmarks]=useState<string[]>(()=>JSON.parse(localStorage.getItem('nexa-bookmarks')||'[]')),[note,setNote]=useState(()=>localStorage.getItem('note-1')||''),[authOpen,setAuthOpen]=useState(false),[aiSolveBusy,setAiSolveBusy]=useState(false),[user,setUser]=useState<SessionUser|null>(null);
 const [wordWrap,setWordWrap]=useState(false),[minimap,setMinimap]=useState(true),[cursorPosition,setCursorPosition]=useState({line:1,column:1,lineCount:1});
 useEffect(()=>{let active=true;(async()=>{try{const first=await fetch('/api/problems?page=1&limit=100').then(r=>r.ok?r.json():null);if(!first?.items?.length)return;let items=[...first.items];for(let page=2;page<=Math.ceil(first.total/100);page++){const next=await fetch(`/api/problems?page=${page}&limit=100`).then(r=>r.ok?r.json():null);if(next?.items)items.push(...next.items)}if(!active)return;const mapped=items.map((p:{slug:string;title:string;topic:string;difficulty:string;description:string;examples:{input:string;output:string}[];hints:string[];starterCode?:{javascript?:string}},index)=>({id:index+1,slug:p.slug,title:p.title,level:p.difficulty,topic:p.topic,description:p.description,starter:p.starterCode?.javascript||'// Implement the requested function',sample:p.examples?.[0]?`Input: ${p.examples[0].input}\nOutput: ${p.examples[0].output}`:'No example available.',hints:p.hints||[]}));setProblemList(mapped);setProblem(current=>mapped.find(p=>p.slug===current.slug)||mapped[0]);}catch{/* Keep the bundled starter list available when the API is offline. */}})();return()=>{active=false}},[]);useEffect(()=>{localStorage.setItem(`nexa-code-${problem.id}-${language}`,code);if(language==='javascript')localStorage.setItem('nexa-code-'+problem.id,code)},[problem,code,language]);
 useEffect(()=>{localStorage.setItem('nexa-language',language);localStorage.setItem('nexa-font-size',String(font));localStorage.setItem('nexa-theme',theme?'light':'dark')},[font,language,theme]);
 useEffect(()=>{fetch('/api/auth/me',{credentials:'include'}).then(r=>r.ok?r.json():null).then(data=>{if(data?.user)setUser(data.user)}).catch(()=>{})},[]);
 useEffect(()=>{if(!user)return;fetch('/api/bookmarks',{credentials:'include'}).then(r=>r.ok?r.json():null).then(data=>{if(data?.items){const next=data.items.map((x:{problem_slug:string})=>x.problem_slug);setBookmarks(next);localStorage.setItem('nexa-bookmarks',JSON.stringify(next))}}).catch(()=>{})},[user]);
 useEffect(()=>{if(!user)return;fetch('/api/progress',{credentials:'include'}).then(r=>r.ok?r.json():null).then(data=>{if(Array.isArray(data?.solved)){const next=problemList.filter(p=>data.solved.some((item:{problem_slug:string})=>item.problem_slug===p.slug)).map(p=>p.id);setSolved(next);localStorage.setItem('nexa-solved',JSON.stringify(next))}}).catch(()=>{})},[user,problemList]);
 useEffect(()=>{if(tab!=='Notes'||!user)return;fetch('/api/notes/'+problem.slug,{credentials:'include'}).then(r=>r.ok?r.json():null).then(data=>{if(typeof data?.note?.body==='string'){setNote(data.note.body);localStorage.setItem('note-'+problem.id,data.note.body)}}).catch(()=>{})},[tab,problem,user]);
 const list=problemList.filter(p=>(filter==='All'||p.level===filter)&&`${p.title} ${p.topic}`.toLowerCase().includes(search.toLowerCase()));
 function choose(p:Problem){setProblem(p);setReferenceSolution(null);setReferenceAvailable(false);setCode(localStorage.getItem(`nexa-code-${p.id}-${language}`)||(language==='javascript'?localStorage.getItem('nexa-code-'+p.id):null)||starterFor(language,p.starter));setNote(localStorage.getItem('note-'+p.id)||'');setTab('Description')}
 async function run(){await runProblemTests()}
 async function runProblemTests(source=code){setCodingPanelMode('normal');setConsoleTab('Test Result');setOutput('Running visible sample tests…');try{const response=await fetch(`/api/problems/${problem.slug}/run`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({language,code:source,stdin:''})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Sample run failed.');if(!data.total){setOutput('No sample test cases are configured for this problem yet.');return false}const results=data.results.map((result:{verdict:string;passed:boolean;input:string;expected:string;actual:string;stderr:string},index:number)=>[`Case ${index+1} · ${result.verdict}`,`Input: ${result.input}`,`Expected: ${result.expected}`,`Output: ${result.actual||'(no output)'}`,result.stderr?`Details: ${result.stderr}`:''].filter(Boolean).join('\n'));setOutput(`Sample tests: ${data.passed}/${data.total} passed\n\n${results.join('\n\n')}`);return data.passed===data.total}catch(e){setOutput(e instanceof Error?e.message:'Could not run sample tests.');return false}}
 async function submit(source=code){if(!user){setAuthOpen(true);return false}setOutput('Checking hidden tests…');const slug=problem.slug;try{const response=await fetch(`/api/problems/${slug}/submit`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({language,code:source,stdin:''})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Submission failed.');setOutput(`${data.submission.verdict} · ${data.tests} hidden tests`);setReferenceAvailable(data.submission.verdict==='Accepted');setReferenceSolution(null);if(data.submission.verdict==='Accepted'&&!solved.includes(problem.id)){const next=[...solved,problem.id];setSolved(next);localStorage.setItem('nexa-solved',JSON.stringify(next))}return data.submission.verdict==='Accepted'}catch(e){setOutput(e instanceof Error?e.message:'Could not submit solution.');return false}}
 async function solveWithAi(){if(aiSolveBusy)return;if(!user){setAuthOpen(true);setOutput('Sign in to generate and submit an AI solution.');return}const slug=problem.slug;setAiSolveBusy(true);setOutput('Asking Gemini to solve this problem…');setReferenceAvailable(false);setReferenceSolution(null);try{const response=await fetch('/api/ai/solve',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({problemSlug:slug,language,code})});const data=await response.json() as {solution?:string;error?:string};if(!response.ok||!data.solution)throw new Error(data.error||'Gemini could not generate a solution.');const candidate=data.solution;setCode(candidate);setOutput('Gemini generated a solution. Checking visible tests before submission…');const passesVisible=await runProblemTests(candidate);if(!passesVisible){setOutput(current=>`AI solution was added to the editor but not submitted: visible tests did not all pass or the runner is unavailable.\n${current}`);return}await submit(candidate)}catch(error){setOutput(error instanceof Error?error.message:'Could not generate an AI solution.')}finally{setAiSolveBusy(false)}}
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();run()}if(e.key==='/'&&!['INPUT','TEXTAREA'].includes((document.activeElement as HTMLElement)?.tagName)){e.preventDefault();document.getElementById('search')?.focus()}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)});
 const count=solved.length;
 return (
  <div className={`app ${theme?'light':''} ${questionsVisible?'':'questions-hidden'}`}>
   <header className="topbar">
    <div className="brand"><span className="brand-mark">N</span>NEXA<span className="brand-muted">CODE</span></div>
    <div className="workspace"><i/> Workspace <span>/</span> {view.toLowerCase()}</div>
    <div className="top-actions">
     <button type="button" aria-label={theme?'Switch to dark theme':'Switch to light theme'} title={theme?'Switch to dark theme':'Switch to light theme'} onClick={()=>setTheme(!theme)}><Icon name="theme"/></button>
     <button type="button" aria-label="Keyboard shortcuts" title="Keyboard shortcuts" onClick={()=>alert('Ctrl or Cmd + Enter runs code; / focuses search')}><Icon name="shortcuts"/></button>
     <button type="button" className="account-button" title={user?.email||'Sign in'} aria-label={user?.email||'Sign in'} onClick={async()=>{if(user){await fetch('/api/auth/logout',{method:'POST',credentials:'include'});setUser(null)}else setAuthOpen(true)}}>{user?.display_name?.slice(0,2).toUpperCase()||'AK'}</button>
    </div>
   </header>
   <nav className="activity" aria-label="Workspace navigation">
    {activityItems.map(({name,icon})=><button type="button" key={name} className={view===name?'active':''} aria-label={name} onClick={()=>setView(name)}><b><Icon name={icon}/></b><small>{name}</small></button>)}
    <button type="button" className="settings" aria-label="Settings" onClick={()=>alert('Browser autosave is on')}><b><Icon name="settings"/></b><small>Settings</small></button>
   </nav>
   <aside className="sidebar">
    <div className="side-title">
     <div><small>YOUR WORKSPACE</small><h2>{view}</h2></div>
     <button type="button" className="question-slider" aria-label={questionsVisible?'Hide question list':'Show question list'} title={questionsVisible?'Hide question list':'Show question list'} aria-expanded={questionsVisible} onClick={()=>setQuestionsVisible(visible=>!visible)}>
      <span className="question-slider-label">Questions</span><Icon name={questionsVisible?'arrow-left':'arrow-right'}/>
     </button>
    </div>
    <label className="search"><Icon name="search"/><input id="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search problems..."/><kbd>/</kbd></label>
    <div className="filters">{['All','Easy','Medium','Hard'].map(f=><button type="button" key={f} className={filter===f?'active':''} onClick={()=>setFilter(f)}>{f}{f==='All'&&<small>{problemList.length}</small>}</button>)}</div>
    <div className="problem-list">
     {list.map(p=><button type="button" key={p.id} className={`problem ${p.id===problem.id?'selected':''}`} aria-current={p.id===problem.id?'page':undefined} onClick={()=>choose(p)}>
      <span className="problem-name"><small>{String(p.id).padStart(2,'0')}</small>{p.title}{solved.includes(p.id)&&<Icon name="check"/>}</span>
      <span className="meta"><em className={p.level.toLowerCase()}>{p.level}</em>{p.topic}</span>
     </button>)}
    </div>
    <div className="streak"><b><Icon name="flame"/></b><span><strong>3 day streak</strong><small>Keep your momentum</small></span><i><Icon name="arrow-right"/></i></div>
   </aside>
   <main className="main">
    {view==='Practice'?<>
     <div className="view-head">
      <div>Practice <span>/</span> <strong>{problem.topic}</strong></div>
      <div className="head-actions">
       <button type="button" aria-label={bookmarks.includes(problem.slug)?'Remove bookmark':'Save bookmark'} title={bookmarks.includes(problem.slug)?'Remove bookmark':'Save bookmark'} onClick={async()=>{const slug=problem.slug,has=bookmarks.includes(slug),next=has?bookmarks.filter(x=>x!==slug):[...bookmarks,slug];setBookmarks(next);localStorage.setItem('nexa-bookmarks',JSON.stringify(next));if(user)await fetch('/api/bookmarks/'+slug,{method:has?'DELETE':'POST',credentials:'include'})}}><Icon name="bookmark"/><span>{bookmarks.includes(problem.slug)?'Saved':'Save'}</span></button>
       <button type="button" aria-label="Previous problem" title="Previous problem" onClick={()=>choose(problemList[(problem.id-2+problemList.length)%problemList.length])}><Icon name="arrow-left"/></button>
       <button type="button" aria-label="Next problem" title="Next problem" onClick={()=>choose(problemList[problem.id%problemList.length])}><Icon name="arrow-right"/></button>
      </div>
     </div>
     <div className={`split coding-panel-${codingPanelMode}`} style={{'--split-left':`${splitPercent}%`} as CSSProperties}>
      <section className="description">
       <small className="eyebrow">PROBLEM {String(problem.id).padStart(3,'0')} <span>{problem.topic}</span></small>
       <h1>{problem.title}</h1>
       <div className={`level ${problem.level.toLowerCase()}`}>{problem.level} <span>·</span> ~20 min</div>
       <p>{problem.description}</p>
       <div className="tabs">{['Description','Hints','Tutor','Notes','Submissions'].map(t=><button type="button" key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t}</button>)}</div>
       {tab==='Description'?<>
        <h3>Example</h3><pre>{problem.sample}</pre>
        <h3>Constraints</h3><p className="constraints">- Input fits in memory<br/>- Return the result in the requested format<br/>- Consider edge cases and time complexity</p>
       </>:tab==='Hints'?<>
        <h3>Progressive hints</h3>
        {problem.hints.slice(0,Math.max(1,hints[problem.id]||0)).map((h,i)=><div className="hint" key={h}><b>Hint {i+1}.</b> {h}</div>)}
        <button type="button" className="outline" onClick={()=>setHints({...hints,[problem.id]:Math.min(3,(hints[problem.id]||0)+1)})}>{(hints[problem.id]||0)>=3?'All hints revealed':'Reveal next hint'}</button>
       </>:tab==='Tutor'?<TutorPanel problemSlug={problem.slug} code={code} language={language} lastRunOutput={output} attempts={hints[problem.id]||0} signedIn={Boolean(user)}/>:tab==='Notes'?<>
        <h3>Your notes</h3>
        <textarea className="notes" placeholder="Your notes are saved locally" value={note} onChange={e=>{setNote(e.target.value);localStorage.setItem('note-'+problem.id,e.target.value)}} onBlur={async e=>{if(user)await fetch('/api/notes/'+problem.slug,{method:'PUT',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({body:e.currentTarget.value})})}}/>
       </>:<>
        <h3>Recent submissions</h3><p className="constraints">{solved.includes(problem.id)?'Accepted - local demo verdict':'No submissions yet.'}</p>
       </>}
      </section>
      <div
       className="split-handle"
       role="separator"
       aria-label="Resize problem and editor panels"
       aria-orientation="vertical"
       aria-valuemin={30}
       aria-valuemax={65}
       aria-valuenow={splitPercent}
       aria-valuetext={`Problem panel ${splitPercent} percent wide`}
       tabIndex={0}
       onPointerDown={event=>event.currentTarget.setPointerCapture(event.pointerId)}
       onPointerMove={event=>{if(event.buttons!==1)return;const bounds=event.currentTarget.parentElement?.getBoundingClientRect();if(bounds)setSplitPercent(Math.max(30,Math.min(65,Math.round((event.clientX-bounds.left)/bounds.width*100))))}}
       onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();setSplitPercent(value=>Math.max(30,Math.min(65,value+(event.key==='ArrowRight'?2:-2))))}}}
      ><span/></div>
      <section className="editor">
       <div className="editor-bar">
        <div className="editor-file-tab" aria-label={`Current file ${getPracticeLanguage(language).fileName}`}>
         <i className={`language-dot language-${language}`} aria-hidden="true"/>
         <span>{getPracticeLanguage(language).fileName}</span>
         <small>{problem.title}</small>
        </div>
        <div className="editor-controls">
         <button type="button" aria-label="Decrease editor font size" title="Decrease font size" onClick={()=>setFont(Math.max(11,font-1))}>A-</button>
         <button type="button" aria-label="Increase editor font size" title="Increase font size" onClick={()=>setFont(Math.min(20,font+1))}>A+</button>
         <button type="button" aria-label={wordWrap?'Disable word wrap':'Enable word wrap'} aria-pressed={wordWrap} title={wordWrap?'Disable word wrap':'Enable word wrap'} onClick={()=>setWordWrap(value=>!value)}>Wrap</button>
         <button type="button" aria-label={minimap?'Hide minimap':'Show minimap'} aria-pressed={minimap} title={minimap?'Hide minimap':'Show minimap'} onClick={()=>setMinimap(value=>!value)}>Map</button>
         <button type="button" aria-label="Reset starter code" title="Reset starter code" onClick={()=>setCode(starterFor(language,problem.starter))}><Icon name="reset"/></button>
         <select aria-label="Programming language" value={language} onChange={e=>{const next=practiceLanguages.find(item=>item.id===e.target.value)?.id;if(!next)return;setLanguage(next);setCode(localStorage.getItem(`nexa-code-${problem.id}-${next}`)||(next==='javascript'?localStorage.getItem(`nexa-code-${problem.id}`):null)||starterFor(next,problem.starter))}}>{practiceLanguages.map(({id,label})=><option value={id} key={id}>{label}</option>)}</select>
         <div className="coding-panel-controls">
          {codingPanelMode!=='minimized'&&<button type="button" className="outline" aria-label="Minimize coding panel" title="Minimize coding panel" onClick={()=>setCodingPanelMode('minimized')}><Icon name="minimize"/></button>}
          {codingPanelMode==='normal'
            ? <button type="button" className="outline" aria-label="Maximize coding panel" title="Maximize coding panel" onClick={()=>setCodingPanelMode('maximized')}><Icon name="maximize"/></button>
            : <button type="button" className="outline" aria-label="Restore coding panel" title="Restore coding panel" onClick={()=>setCodingPanelMode('normal')}><Icon name="restore"/></button>}
         </div>
        </div>
       </div>
       <div className="monaco"><Suspense fallback={<div className="editor-loading">Loading editor…</div>}><CodeEditor height="100%" language={language} theme={theme?'nexa-light':'nexa-dark'} value={code} onChange={setCode} fontSize={font} minimap={minimap} wordWrap={wordWrap} onCursorChange={setCursorPosition}/></Suspense></div>
       <div
        className="console-handle"
        role="separator"
        aria-label="Resize editor and test panel"
        aria-orientation="horizontal"
        aria-valuemin={140}
        aria-valuemax={420}
        aria-valuenow={consoleHeight}
        aria-valuetext={`Test panel ${consoleHeight} pixels tall`}
        tabIndex={0}
        onPointerDown={event=>event.currentTarget.setPointerCapture(event.pointerId)}
        onPointerMove={event=>{if(event.buttons!==1)return;const bounds=event.currentTarget.parentElement?.getBoundingClientRect();if(bounds)setConsoleHeight(Math.max(140,Math.min(420,Math.round(bounds.bottom-event.clientY))))}}
        onKeyDown={event=>{if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();setConsoleHeight(value=>Math.max(140,Math.min(420,value+(event.key==='ArrowUp'?10:-10))))}}}
       ><span/></div>
       <div className="output" style={{height:consoleHeight,flexBasis:consoleHeight}}>
        <div className="output-head">
         <div className="console-tabs" role="tablist" aria-label="Code test panel">
          {(['Testcase','Test Result'] as const).map(name=><button type="button" id={`console-tab-${name==='Testcase'?'case':'result'}`} role="tab" aria-controls={`console-panel-${name==='Testcase'?'case':'result'}`} aria-selected={consoleTab===name} className={consoleTab===name?'active':''} key={name} onClick={()=>setConsoleTab(name)}>{name}</button>)}
         </div>
         <button type="button" className="outline" onClick={()=>runProblemTests()}>Run samples</button>
         {referenceAvailable&&<button type="button" className="outline" onClick={async()=>{if(referenceSolution){setReferenceSolution(null);return}const response=await fetch(`/api/problems/${problem.slug}/solution`,{credentials:'include'});const data=await response.json();setReferenceSolution(data.solutions?.javascript||data.error||'Reference unavailable.')}}>{referenceSolution?'Hide reference':'Reference solution (JavaScript)'}</button>}
         <button type="button" className="outline" onClick={()=>submit()} disabled={aiSolveBusy}>Submit</button>
         <button type="button" className="run" onClick={solveWithAi} disabled={aiSolveBusy} title={`Generate ${language} with Gemini, run visible tests, then submit passing code`}>{aiSolveBusy?'Gemini solving...':'AI solve & submit'}</button>
         <button type="button" className="run" onClick={run}><Icon name="play"/>Run</button>
        </div>
        {codingPanelMode!=='minimized'&&<>
         {consoleTab==='Testcase'?<div className="testcase-content" id="console-panel-case" role="tabpanel" aria-labelledby="console-tab-case"><div><b>Sample case 1</b><span>Read-only example</span></div><pre>{problem.sample}</pre><p>Run samples to check your solution against the configured examples.</p></div>:<pre className="test-result" id="console-panel-result" role="tabpanel" aria-labelledby="console-tab-result">{output}</pre>}
         {referenceSolution&&<pre className="reference-solution">{referenceSolution}</pre>}
         <footer><span>{language.toUpperCase()}</span><span>JSON stdin / stdout</span><span>Auto-save on</span></footer>
        </>}
       </div>
       <footer className="editor-statusbar" aria-label="Editor status">
        <span className="status-language"><i className={`language-dot language-${language}`} aria-hidden="true"/>{getPracticeLanguage(language).label}</span>
        <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
        <span>{cursorPosition.lineCount} lines</span>
        <span>Spaces: 2</span>
        <span>UTF-8</span>
        <span>LF</span>
        <span className="status-saved">Saved locally</span>
       </footer>
      </section>
     </div>
    </>:view==='Progress'?<ProgressDashboard count={count} total={problemList.length} signedIn={Boolean(user)}/>:view==='SQL'?<SqlWorkbench signedIn={Boolean(user)} onRequireSignIn={()=>setAuthOpen(true)}/>:<Suspense fallback={<div className="editor-loading">Loading workspace…</div>}><StandaloneEditor theme={theme?'nexa-light':'nexa-dark'} onOpenPractice={()=>setView('Practice')}/></Suspense>}
   </main>
   {authOpen&&<AuthDialog onClose={()=>setAuthOpen(false)} onUser={setUser}/>}
  </div>
 );
}

import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent } from 'react';
import { getPracticeLanguage, practiceLanguages, type PracticeLanguage } from './editorLanguages';
import Icon from './Icon';

const CodeEditor = lazy(() => import('./CodeEditor'));

type EditorFile = {
  id: string;
  name: string;
  language: PracticeLanguage;
  code: string;
};

type RunResult = {
  verdict?: string;
  stdout?: string;
  stderr?: string;
  compileOutput?: string;
  compileStdout?: string;
  compileStderr?: string;
  compileExitCode?: number | null;
  compileStatus?: 'passed' | 'failed' | 'not-reported';
  exitCode?: number | null;
  signal?: string | null;
  runnerMessage?: string | null;
  runnerStatus?: string | null;
  status?: string;
  error?: string;
};

type Props = {
  onOpenPractice: () => void;
  theme: string;
};

const projectKey = 'nexa-editor-project-v1';
const projectName = 'my-project';

const starterCode: Record<PracticeLanguage, string> = {
  javascript: 'console.log("Hello, NexaCode!");\n',
  typescript: 'const greeting: string = "Hello, NexaCode!";\nconsole.log(greeting);\n',
  python: 'print("Hello, NexaCode!")\n',
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, NexaCode!");\n    }\n}\n',
  c: '#include <stdio.h>\n\nint main(void) {\n    printf("Hello, NexaCode!\\n");\n    return 0;\n}\n',
  cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, NexaCode!\\n";\n    return 0;\n}\n',
  csharp: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, NexaCode!");\n    }\n}\n',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, NexaCode!")\n}\n',
  rust: 'fn main() {\n    println!("Hello, NexaCode!");\n}\n',
  php: '<?php\necho "Hello, NexaCode!\\n";\n',
  ruby: 'puts "Hello, NexaCode!"\n',
  kotlin: 'fun main() {\n    println("Hello, NexaCode!")\n}\n'
};

const projectExamples = {
  'javascript-task-tracker': {
    name: 'task-tracker.js',
    language: 'javascript' as const,
    code: [
      'const tasks = [];',
      '',
      'function addTask(title) {',
      '  const task = { title, done: false };',
      '  tasks.push(task);',
      '  return task;',
      '}',
      '',
      'function completeTask(title) {',
      '  const task = tasks.find(item => item.title === title);',
      '  if (task) task.done = true;',
      '}',
      '',
      'addTask("Sketch the project");',
      'addTask("Build the first feature");',
      'completeTask("Sketch the project");',
      'console.table(tasks);',
      ''
    ].join('\n')
  },
  'python-text-analyzer': {
    name: 'text-analyzer.py',
    language: 'python' as const,
    code: [
      'from collections import Counter',
      'import re',
      '',
      'text = "Small projects are a fun way to practice code."',
      'words = re.findall(r"[a-z]+", text.lower())',
      'counts = Counter(words)',
      '',
      'print(f"Words: {len(words)}")',
      'print(f"Unique words: {len(counts)}")',
      'print(f"Most common: {counts.most_common(3)}")',
      ''
    ].join('\n')
  }
} as const;

const initialFile: EditorFile = {
  id: 'main.js',
  name: 'main.js',
  language: 'javascript',
  code: starterCode.javascript
};

function readProject(): EditorFile[] {
  try {
    const stored = localStorage.getItem(projectKey);
    if (!stored) return [initialFile];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed) || !parsed.length) return [initialFile];
    const files = parsed.filter((file): file is EditorFile =>
      typeof file === 'object' &&
      file !== null &&
      'id' in file && typeof file.id === 'string' &&
      'name' in file && typeof file.name === 'string' &&
      'language' in file && practiceLanguages.some(language => language.id === file.language) &&
      'code' in file && typeof file.code === 'string'
    );
    return files.length ? files : [initialFile];
  } catch (error) {
    console.error('Could not load the saved editor project.', error);
    return [initialFile];
  }
}

function languageFromFileName(name: string): PracticeLanguage {
  const extension = name.split('.').pop()?.toLowerCase();
  const languageByExtension: Record<string, PracticeLanguage> = {
    js: 'javascript', mjs: 'javascript', cjs: 'javascript',
    ts: 'typescript',
    py: 'python',
    java: 'java',
    c: 'c', h: 'c',
    cc: 'cpp', cpp: 'cpp', cxx: 'cpp', hpp: 'cpp',
    cs: 'csharp',
    go: 'go',
    rs: 'rust',
    php: 'php',
    rb: 'ruby',
    kt: 'kotlin', kts: 'kotlin'
  };
  return extension ? languageByExtension[extension] || 'javascript' : 'javascript';
}

export default function StandaloneEditor({ onOpenPractice, theme }: Props) {
  const [files, setFiles] = useState<EditorFile[]>(readProject);
  const [activeId, setActiveId] = useState(() => files[0].id);
  const [newFileName, setNewFileName] = useState('');
  const [creatingFile, setCreatingFile] = useState(false);
  const [stdin, setStdin] = useState('');
  const [consoleTab, setConsoleTab] = useState<'output' | 'input'>('output');
  const [output, setOutput] = useState('Run your program to see its output here.');
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [showFiles, setShowFiles] = useState(true);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });

  const activeFile = files.find(file => file.id === activeId) || files[0];
  const languageInfo = getPracticeLanguage(activeFile.language);
  const lineCount = useMemo(() => activeFile.code.split('\n').length, [activeFile.code]);

  useEffect(() => {
    try {
      localStorage.setItem(projectKey, JSON.stringify(files));
    } catch (error) {
      console.error('Could not save the editor project.', error);
      setRunResult(null);
      setOutput('Could not save this project in browser storage.');
      setRunStatus('error');
    }
  }, [files]);

  function updateActiveFile(update: Partial<EditorFile>) {
    setFiles(current => current.map(file => file.id === activeId ? { ...file, ...update } : file));
  }

  function createFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newFileName.trim();
    if (!/^[\w.-]{1,80}$/.test(name) || !name.includes('.') || files.some(file => file.name === name)) {
      setRunResult(null);
      setOutput('Use a unique file name with an extension, such as main.py.');
      setRunStatus('error');
      return;
    }

    const language = languageFromFileName(name);
    const file: EditorFile = { id: `${Date.now()}-${name}`, name, language, code: starterCode[language] };
    setFiles(current => [...current, file]);
    setActiveId(file.id);
    setNewFileName('');
    setCreatingFile(false);
    setConsoleTab('output');
    setRunResult(null);
    setOutput(`Created ${name}.`);
    setRunStatus('idle');
  }

  function createExample(exampleId: string) {
    const example = projectExamples[exampleId as keyof typeof projectExamples];
    if (!example || files.some(file => file.name === example.name)) {
      setOutput(example ? `${example.name} is already in this project.` : 'Choose a project example.');
      setRunStatus('idle');
      setRunResult(null);
      return;
    }

    const file: EditorFile = {
      id: `${Date.now()}-${example.name}`,
      name: example.name,
      language: example.language,
      code: example.code
    };
    setFiles(current => [...current, file]);
    setActiveId(file.id);
    setConsoleTab('output');
    setRunResult(null);
    setOutput(`Added ${example.name}. Select Run to try it.`);
    setRunStatus('idle');
  }

  function deleteFile(file: EditorFile) {
    if (files.length === 1) return;
    const remaining = files.filter(item => item.id !== file.id);
    setFiles(remaining);
    if (activeId === file.id) setActiveId(remaining[0].id);
  }

  async function runCode() {
    setConsoleTab('output');
    setRunResult(null);
    setOutput('Running your program in the code sandbox…');
    setRunStatus('running');
    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: activeFile.language, code: activeFile.code, stdin })
      });
      let result: RunResult;
      try {
        result = await response.json() as RunResult;
      } catch {
        throw new Error('The code runner returned an invalid response. Check that the API service is running.');
      }
      if (!response.ok) throw new Error(result.error || 'Code execution failed.');
      setRunResult(result);
      setOutput('');
      setRunStatus('done');
    } catch (error) {
      setRunResult(null);
      setOutput(error instanceof Error ? error.message : 'Could not run code.');
      setRunStatus('error');
    }
  }

  function clearTerminal() {
    setRunResult(null);
    setOutput('');
    setRunStatus('idle');
  }

  const topActions = (
    <div className="standalone-actions">
      <label className="standalone-example">
        <span>Try an example</span>
        <select aria-label="Add a small project example" value="" onChange={event => createExample(event.target.value)}>
          <option value="">Add an example…</option>
          <option value="javascript-task-tracker">JavaScript task tracker</option>
          <option value="python-text-analyzer">Python text analyzer</option>
        </select>
      </label>
      <button type="button" className="outline" onClick={() => { setCreatingFile(true); setShowFiles(true); }}>New file</button>
      <button type="button" className="outline" onClick={() => { updateActiveFile({ code: starterCode[activeFile.language] }); setOutput('Starter code restored.'); setRunStatus('idle'); }}>Reset</button>
      <button type="button" className="standalone-run" onClick={() => void runCode()} disabled={runStatus === 'running'}><Icon name="play"/>{runStatus === 'running' ? 'Running…' : 'Run'}</button>
    </div>
  );

  return (
    <div className="standalone-workspace">
      <header className="standalone-heading">
        <div>
          <small className="eyebrow">CODE WORKSPACE</small>
          <h1>Editor</h1>
          <p>Build small projects, try examples, or run code in a safe sandbox.</p>
        </div>
        {topActions}
      </header>
      <div className={`standalone-ide ${showFiles ? '' : 'files-hidden'}`}>
        <aside className="project-explorer" aria-label="Project files">
          <div className="explorer-heading">
            <span>EXPLORER</span>
            <button type="button" aria-label="Create file" title="Create file" onClick={() => setCreatingFile(true)}>+</button>
            <button type="button" aria-label="Hide file explorer" title="Hide file explorer" onClick={() => setShowFiles(false)}>‹</button>
          </div>
          <div className="project-folder"><span aria-hidden="true">⌄</span>{projectName}</div>
          {files.map(file => (
            <div className={`project-file ${file.id === activeId ? 'active' : ''}`} key={file.id}>
              <button type="button" className="project-file-select" onClick={() => setActiveId(file.id)} aria-current={file.id === activeId ? 'page' : undefined}>
                <i className={`language-dot language-${file.language}`} aria-hidden="true"/>
                <span>{file.name}</span>
              </button>
              {files.length > 1 && <button type="button" className="project-file-delete" aria-label={`Delete ${file.name}`} title={`Delete ${file.name}`} onClick={() => deleteFile(file)}>×</button>}
            </div>
          ))}
          {creatingFile && (
            <form className="new-file-form" onSubmit={createFile}>
              <input autoFocus aria-label="New file name" placeholder="name.py" value={newFileName} onChange={event => setNewFileName(event.target.value)} />
              <button type="submit" aria-label="Create file">Add</button>
              <button type="button" aria-label="Cancel file creation" onClick={() => { setCreatingFile(false); setNewFileName(''); }}>Cancel</button>
            </form>
          )}
          <div className="explorer-note">Files are saved in this browser.</div>
        </aside>
        <section className="standalone-editor-panel" aria-label="Code editor">
          {!showFiles && <button type="button" className="show-explorer" onClick={() => setShowFiles(true)} aria-label="Show file explorer" title="Show file explorer">›</button>}
          <div className="standalone-tabbar">
            <div className="standalone-file-tab">
              <i className={`language-dot language-${activeFile.language}`} aria-hidden="true"/>
              <span>{activeFile.name}</span>
              <small>{languageInfo.label}</small>
            </div>
            <label className="standalone-language">
              <span>Language</span>
              <select aria-label="File language" value={activeFile.language} onChange={event => {
                const language = practiceLanguages.find(item => item.id === event.target.value)?.id;
                if (language) updateActiveFile({ language });
              }}>
                {practiceLanguages.map(language => <option value={language.id} key={language.id}>{language.label}</option>)}
              </select>
            </label>
          </div>
          <div className="standalone-monaco">
            <Suspense fallback={<div className="editor-loading">Loading editor…</div>}>
              <CodeEditor height="100%" language={activeFile.language} theme={theme} value={activeFile.code} onChange={code => updateActiveFile({ code })} fontSize={14} minimap wordWrap onCursorChange={position => setCursorPosition({ line: position.line, column: position.column })}/>
            </Suspense>
          </div>
          <footer className="standalone-statusbar">
            <span><i className={`language-dot language-${activeFile.language}`} aria-hidden="true"/>{languageInfo.label}</span>
            <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
            <span>{lineCount} lines</span>
            <span>UTF-8</span>
            <span className="standalone-saved">Saved locally</span>
          </footer>
          <section className="standalone-console" aria-label="Terminal">
            <div className="standalone-console-tabs" role="tablist" aria-label="Terminal panels">
              <span className="terminal-title">TERMINAL</span>
              <button type="button" role="tab" aria-selected={consoleTab === 'output'} className={consoleTab === 'output' ? 'active' : ''} onClick={() => setConsoleTab('output')}>OUTPUT</button>
              <button type="button" role="tab" aria-selected={consoleTab === 'input'} className={consoleTab === 'input' ? 'active' : ''} onClick={() => setConsoleTab('input')}>STDIN</button>
              <button type="button" className="terminal-clear" onClick={clearTerminal} disabled={runStatus === 'running'}>Clear</button>
              <span className={`run-indicator ${runStatus}`}>{runStatus === 'running' ? 'RUNNING' : runStatus === 'done' ? 'FINISHED' : runStatus === 'error' ? 'ERROR' : 'READY'}</span>
            </div>
            {consoleTab === 'input'
              ? <textarea className="standalone-stdin" aria-label="Program standard input" placeholder="Optional input passed to your program on stdin" value={stdin} onChange={event => setStdin(event.target.value)}/>
              : runResult
                ? <div className="terminal-results" aria-live="polite">
                    <div className={`terminal-summary ${runStatus}`}>
                      <strong>{runResult.status || runResult.verdict || 'Finished'}</strong>
                      <span>{activeFile.name} · {languageInfo.label}</span>
                      {runResult.signal && <span>Signal: {runResult.signal}</span>}
                    </div>
                    {runResult.runnerMessage && <p className="terminal-runner-message" role="status">
                      {runResult.status === 'Execution Stopped'
                        ? `${runResult.runnerMessage} The sandbox stopped this run to keep the workspace responsive.`
                        : runResult.runnerMessage}
                    </p>}
                    <section className={`terminal-stage ${runResult.compileStatus === 'failed' ? 'failed' : ''}`}>
                      <h2>Compiler <span>{runResult.compileStatus === 'passed' ? 'SUCCEEDED' : runResult.compileStatus === 'failed' ? 'FAILED' : 'NOT REPORTED'}</span></h2>
                      {runResult.compileOutput && !runResult.compileStdout && !runResult.compileStderr && <pre className="terminal-diagnostic">{runResult.compileOutput}</pre>}
                      {runResult.compileStdout && <div className="terminal-stream"><h3>Compiler stdout</h3><pre className="terminal-diagnostic">{runResult.compileStdout}</pre></div>}
                      {runResult.compileStderr && <div className="terminal-stream error"><h3>Compiler stderr</h3><pre className="terminal-diagnostic">{runResult.compileStderr}</pre></div>}
                      {!runResult.compileOutput && !runResult.compileStdout && !runResult.compileStderr && <p className="terminal-empty">{runResult.compileStatus === 'passed' ? 'Compilation completed without diagnostics.' : 'The configured runner does not report a separate compile stage for this run.'}</p>}
                      {runResult.compileExitCode !== null && runResult.compileExitCode !== undefined && <p className="terminal-exit">Compiler exit code: {runResult.compileExitCode}</p>}
                    </section>
                    <section className={`terminal-stage ${runResult.stderr ? 'failed' : ''}`}>
                      <h2>Program output <span>{runResult.compileStatus === 'failed' ? 'NOT RUN' : runResult.stderr ? 'RUNTIME DIAGNOSTICS' : 'STDOUT'}</span></h2>
                      {runResult.compileStatus === 'failed'
                        ? <p className="terminal-empty">Execution did not start because compilation failed.</p>
                        : <>
                            <div className="terminal-stream"><h3>stdout</h3><pre className="terminal-diagnostic">{runResult.stdout || '(no output)'}</pre></div>
                            {runResult.stderr && <div className="terminal-stream error"><h3>stderr</h3><pre className="terminal-diagnostic">{runResult.stderr}</pre></div>}
                          </>}
                    </section>
                  </div>
                : <pre className={`standalone-output ${runStatus === 'error' ? 'terminal-error' : ''}`}>{output || 'Terminal cleared.'}</pre>}
          </section>
        </section>
      </div>
      <div className="standalone-footer-actions">
        <button type="button" className="outline" onClick={onOpenPractice}>Open practice problems</button>
        <span>Execution is isolated by the configured code runner.</span>
      </div>
    </div>
  );
}

import { z } from 'zod';

type RuntimeDefinition = {
  language: string;
  version: string;
  file: string;
  aliases?: string[];
  compileMemoryLimit?: number;
  compileTimeout?: number;
};

const runtimes: Record<string, RuntimeDefinition> = {
  javascript: { language: 'javascript', version: '20.11.1', file: 'main.js', aliases: ['node', 'node-js', 'node-javascript', 'js'] },
  typescript: { language: 'typescript', version: '5.0.3', file: 'main.ts', aliases: ['ts'] },
  python: { language: 'python', version: '3.10.0', file: 'main.py', aliases: ['python3', 'py'] },
  java: { language: 'java', version: '15.0.2', file: 'Main.java', aliases: ['jdk'] },
  c: { language: 'c', version: '8.3.0', file: 'main.c', aliases: ['gcc'] },
  cpp: { language: 'c++', version: '8.3.0', file: 'main.cpp', aliases: ['cpp', 'g++', 'cxx'] },
  csharp: { language: 'csharp', version: '6.12.0', file: 'main.cs', aliases: ['c#', 'dotnet-csharp'] },
  go: { language: 'go', version: '1.16.2', file: 'main.go', aliases: ['golang'] },
  rust: { language: 'rust', version: '1.68.2', file: 'main.rs', aliases: ['rs'] },
  php: { language: 'php', version: '8.2.3', file: 'main.php', aliases: ['php8'] },
  ruby: { language: 'ruby', version: '3.0.1', file: 'main.rb', aliases: ['rb'] },
  kotlin: {
    language: 'kotlin',
    version: '1.8.20',
    file: 'Main.kt',
    aliases: ['kt'],
    compileMemoryLimit: 1_073_741_824,
    compileTimeout: 60_000
  }
};

function normalizeRuntimeName(value: string): string {
  return value.trim().toLowerCase();
}

async function loadInstalledRuntimes(base: string): Promise<Map<string, { language: string; version: string }>> {
  const runtimeMap = new Map<string, { language: string; version: string }>();
  try {
    const response = await fetch(`${base.replace(/\/+$/, '')}/api/v2/runtimes`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5_000)
    });
    if (!response.ok) return runtimeMap;
    const payload = await response.json() as unknown;
    if (!Array.isArray(payload)) return runtimeMap;
    for (const item of payload) {
      if (!item || typeof item !== 'object') continue;
      const runtime = item as {
        language?: string;
        aliases?: string[];
        version?: string;
      };
      const language = typeof runtime.language === 'string' ? normalizeRuntimeName(runtime.language) : '';
      const version = typeof runtime.version === 'string' ? runtime.version : '';
      if (!language || !version) continue;
      runtimeMap.set(language, { language, version });
      for (const alias of Array.isArray(runtime.aliases) ? runtime.aliases : []) {
        const normalizedAlias = normalizeRuntimeName(String(alias));
        if (normalizedAlias) runtimeMap.set(normalizedAlias, { language, version });
      }
    }
  } catch {
    return runtimeMap;
  }
  return runtimeMap;
}

async function resolveRuntime(base: string, language: string): Promise<RuntimeDefinition | undefined> {
  const definition = runtimes[language];
  if (!definition) return undefined;

  const installed = await loadInstalledRuntimes(base);
  const candidates = [language, definition.language, ...(definition.aliases ?? [])]
    .map(normalizeRuntimeName)
    .filter((value, index, values) => value && values.indexOf(value) === index);

  for (const candidate of candidates) {
    const installedRuntime = installed.get(candidate);
    if (installedRuntime) {
      return {
        ...definition,
        language: installedRuntime.language,
        version: installedRuntime.version
      };
    }
  }

  if (installed.size > 0) {
    return undefined;
  }

  return definition;
}

const outputSchema = z.object({
  stdout: z.string().optional(),
  stderr: z.string().optional(),
  code: z.number().nullable().optional(),
  signal: z.string().nullable().optional(),
  memory: z.number().optional(),
  wall_time: z.number().optional()
});

const responseSchema = z.object({
  compile: outputSchema.optional(),
  run: outputSchema
});

export type RunnerResult = {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  compile_stdout: string | null;
  compile_stderr: string | null;
  compile_time: string | null;
  compile_exit_code: number | null;
  time: string | null;
  exit_code: number | null;
  signal: string | null;
  memory: number | null;
  compile_status: 'passed' | 'failed' | 'not-reported';
  status: { id: number; description: string };
};

export async function executeWithPiston(base: string, code: string, language: string, stdin: string): Promise<RunnerResult> {
  const runtime = await resolveRuntime(base, language);
  if (!runtime) throw Object.assign(new Error(`This language is not supported by the local runner: ${language}.`), { status: 422 });

  let response: Response;
  try {
    response = await fetch(`${base.replace(/\/+$/, '')}/api/v2/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(75_000),
      body: JSON.stringify({
        language: runtime.language,
        version: runtime.version,
        files: [{ name: runtime.file, content: code }],
        stdin,
        compile_timeout: runtime.compileTimeout ?? 20_000,
        run_timeout: 10_000,
        compile_memory_limit: runtime.compileMemoryLimit ?? 268_435_456,
        run_memory_limit: 134_217_728
      })
    });
  } catch {
    throw Object.assign(new Error('Could not reach the local code runner. Check that Piston is running.'), { status: 503 });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw Object.assign(new Error('The local code runner returned an invalid response.'), { status: 502 });
  }
  if (!response.ok) {
    const message = typeof payload === 'object' && payload !== null && 'message' in payload && typeof payload.message === 'string'
      ? payload.message
      : `The local code runner rejected the request (HTTP ${response.status}).`;
    throw Object.assign(new Error(message), { status: response.status >= 500 ? 502 : 422 });
  }

  const result = responseSchema.parse(payload);
  const failedCompile = result.compile && result.compile.code !== 0;
  const timedOut = result.run.signal === 'SIGKILL';
  const accepted = !failedCompile && !timedOut && result.run.code === 0;

  return {
    stdout: failedCompile ? null : result.run.stdout || null,
    stderr: failedCompile ? null : result.run.stderr || null,
    compile_output: result.compile?.stderr || (failedCompile ? result.compile?.stdout : null) || null,
    compile_stdout: result.compile?.stdout || null,
    compile_stderr: result.compile?.stderr || null,
    compile_time: result.compile?.wall_time === undefined ? null : (result.compile.wall_time / 1000).toFixed(3),
    compile_exit_code: result.compile?.code ?? null,
    time: failedCompile || result.run.wall_time === undefined ? null : (result.run.wall_time / 1000).toFixed(3),
    exit_code: failedCompile ? null : result.run.code ?? null,
    signal: failedCompile ? null : result.run.signal ?? null,
    memory: failedCompile || result.run.memory === undefined ? null : Math.round(result.run.memory / 1024),
    compile_status: result.compile ? failedCompile ? 'failed' : 'passed' : 'not-reported',
    status: {
      id: failedCompile ? 6 : timedOut ? 5 : accepted ? 3 : 11,
      description: failedCompile ? 'Compilation Error' : timedOut ? 'Time Limit Exceeded' : accepted ? 'Accepted' : 'Runtime Error'
    }
  };
}

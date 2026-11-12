import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import { loader } from '@monaco-editor/react';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

window.MonacoEnvironment = { getWorker: () => new editorWorker() };

loader.config({ monaco });

const languageLoaders: Record<string, () => Promise<unknown>> = {
  javascript: () => import('monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution.js'),
  typescript: () => import('monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution.js'),
  python: () => import('monaco-editor/esm/vs/basic-languages/python/python.contribution.js'),
  java: () => import('monaco-editor/esm/vs/basic-languages/java/java.contribution.js'),
  cpp: () => import('monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution.js'),
  csharp: () => import('monaco-editor/esm/vs/basic-languages/csharp/csharp.contribution.js'),
  go: () => import('monaco-editor/esm/vs/basic-languages/go/go.contribution.js'),
  rust: () => import('monaco-editor/esm/vs/basic-languages/rust/rust.contribution.js'),
  php: () => import('monaco-editor/esm/vs/basic-languages/php/php.contribution.js'),
  ruby: () => import('monaco-editor/esm/vs/basic-languages/ruby/ruby.contribution.js'),
  kotlin: () => import('monaco-editor/esm/vs/basic-languages/kotlin/kotlin.contribution.js')
};

export function loadMonacoLanguage(language: string): Promise<unknown> {
  const loadLanguage = languageLoaders[language === 'c' ? 'cpp' : language];
  if (!loadLanguage) return Promise.reject(new Error(`Unsupported Monaco language: ${language}`));
  return loadLanguage();
}

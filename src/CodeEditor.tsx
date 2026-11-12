import { useEffect, useState } from 'react';
import Editor, { type Monaco } from '@monaco-editor/react';
import { loadMonacoLanguage } from './monacoSetup';
import './monacoSetup';

type Props = {
  height: string;
  language: string;
  value: string;
  onChange: (value: string) => void;
  theme?: string;
  minimap?: boolean;
  fontSize?: number;
  wordWrap?: boolean;
  onCursorChange?: (position: { line: number; column: number; lineCount: number }) => void;
};

export default function CodeEditor({
  height,
  language,
  value,
  onChange,
  theme = 'vs-dark',
  minimap = false,
  fontSize = 14,
  wordWrap = false,
  onCursorChange
}: Props) {
  const [loadedLanguage, setLoadedLanguage] = useState<string | null>(null);
  const [languageError, setLanguageError] = useState('');

  useEffect(() => {
    let active = true;
    setLanguageError('');
    loadMonacoLanguage(language).then(() => {
      if (active) setLoadedLanguage(language);
    }).catch(error => {
      console.error(`Could not load Monaco language support for ${language}.`, error);
      if (active) setLanguageError(error instanceof Error ? error.message : 'Unknown language loading error.');
    });
    return () => { active = false; };
  }, [language]);

  if (languageError) return <div className="editor-loading" role="alert">Could not load {language} support: {languageError}</div>;
  if (loadedLanguage !== language) return <div className="editor-loading" role="status">Loading {language} support…</div>;

  return <Editor
    height={height}
    language={language}
    theme={theme}
    value={value}
    onChange={value => onChange(value || '')}
    options={{
      fontSize,
      minimap: { enabled: minimap },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      tabSize: 2,
      wordWrap: wordWrap ? 'on' : 'off',
      padding: { top: 16 },
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true },
      lineNumbers: 'on'
    }}
    onMount={editor => {
      const reportPosition = () => {
        const position = editor.getPosition();
        const lineCount = editor.getModel()?.getLineCount() ?? 1;
        if (position) onCursorChange?.({ line: position.lineNumber, column: position.column, lineCount });
      };
      reportPosition();
      editor.onDidChangeCursorPosition(reportPosition);
      editor.onDidChangeModelContent(reportPosition);
    }}
    beforeMount={(monaco: Monaco) => {
      monaco.editor.defineTheme('nexa-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#0c1018',
          'editorLineNumber.foreground': '#4b5668',
          'editorCursor.foreground': '#63e6da',
          'editor.selectionBackground': '#25454b'
        }
      });
      monaco.editor.defineTheme('nexa-light', {
        base: 'vs',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#ffffff',
          'editorLineNumber.foreground': '#8993a3',
          'editorCursor.foreground': '#168c78',
          'editor.selectionBackground': '#ccece3'
        }
      });
    }}
  />;
}

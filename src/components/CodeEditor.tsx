'use client'

import { Editor } from '@monaco-editor/react'
import { useRef, useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

interface CodeEditorProps {
  value?: string
  onChange?: (value: string | undefined) => void
  height?: string | number
  width?: string | number
  disabled?: boolean
  className?: string
  highlightedLine?: number
}

export default function CodeEditor({
  value = '',
  onChange,
  height = '100%',
  width = '100%',
  disabled = false,
  className = '',
  highlightedLine
}: CodeEditorProps) {
  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null)
  const decorationsRef = useRef<string[]>([])
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null)
  const { theme, systemTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [editorReady, setEditorReady] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  function handleEditorDidMount(
    editor: import('monaco-editor').editor.IStandaloneCodeEditor, 
    monaco: typeof import('monaco-editor')
  ) {
    editorRef.current = editor
    monacoRef.current = monaco

    // Register assembly language if not already registered
    if (!monaco.languages.getLanguages().some((lang: { id: string }) => lang.id === 'assembly')) {
      monaco.languages.register({ id: 'assembly' })

      // Define assembly language syntax highlighting
      monaco.languages.setMonarchTokensProvider('assembly', {
        tokenizer: {
          root: [
            // Numbers (before comments to catch #4, #1, etc.)
            [/\b0x[0-9a-fA-F]+\b/, 'number.hex'],
            [/#-?[0-9]+\b/, 'number'],
            [/\b[0-9]+\b/, 'number'],
            
            // Comments
            [/;.*$/, 'comment'],
            [/#.*$/, 'comment'],
            [/\/\/.*$/, 'comment'],
            [/@.*$/, 'comment'],
            
            // Labels
            [/^[a-zA-Z_][a-zA-Z0-9_]*:/, 'type'],
            
            // Memory references
            [/\[[^\]]+\]/, 'string.regexp'],
            
            // Strings
            [/"([^"\\]|\\.)*$/, 'string.invalid'],
            [/"/, 'string', '@string'],
            [/'([^'\\]|\\.)*$/, 'string.invalid'],
            [/'/, 'string', '@string_single'],
            
            // ARM registers (before instructions to be more specific)
            [/\b([rR][0-9]|[rR]1[0-5]|[sS][pP]|[lL][rR]|[pP][cC]|[cC][pP][sS][rR])\b/, 'variable.predefined'],
            
            // ARM instructions (before general identifiers) - case insensitive
            [/\b(?:mov|movs|add|adds|sub|subs|mul|div|cmp|cmps|b|bl|bx|blx|beq|bne|blt|ble|bgt|bge|bcc|bcs|bhi|bls|bmi|bpl|bvs|bvc|ldr|ldrb|ldrh|str|strb|strh|ldm|ldmia|ldmdb|ldmib|ldmda|stm|stmia|stmdb|stmib|stmda|push|pop|nop|adr|and|ands|orr|orrs|eor|eors|bic|bics|mvn|mvns|lsl|lsls|lsr|lsrs|asr|asrs|ror|rors|rrx|rrxs|MOV|MOVS|ADD|ADDS|SUB|SUBS|MUL|DIV|CMP|CMPS|B|BL|BX|BLX|BEQ|BNE|BLT|BLE|BGT|BGE|BCC|BCS|BHI|BLS|BMI|BPL|BVS|BVC|LDR|LDRB|LDRH|STR|STRB|STRH|LDM|LDMIA|LDMDB|LDMIB|LDMDA|STM|STMIA|STMDB|STMIB|STMDA|PUSH|POP|NOP|ADR|AND|ANDS|ORR|ORRS|EOR|EORS|BIC|BICS|MVN|MVNS|LSL|LSLS|LSR|LSRS|ASR|ASRS|ROR|RORS|RRX|RRXS)\b/, 'keyword'],
            
            // Identifiers (last to avoid conflicts)
            [/[a-zA-Z_][a-zA-Z0-9_]*/, 'identifier'],
          ],
          
          string: [
            [/[^\\"]+/, 'string'],
            [/\\./, 'string.escape.invalid'],
            [/"/, 'string', '@pop']
          ],
          
          string_single: [
            [/[^\\']+/, 'string'],
            [/\\./, 'string.escape.invalid'],
            [/'/, 'string', '@pop']
          ]
        }
      })

      // Set language configuration
      monaco.languages.setLanguageConfiguration('assembly', {
        comments: {
          lineComment: '@'
        },
        brackets: [
          ['[', ']'],
          ['(', ')']
        ],
        autoClosingPairs: [
          { open: '[', close: ']' },
          { open: '(', close: ')' },
          { open: '"', close: '"' },
          { open: "'", close: "'" }
        ],
        surroundingPairs: [
          { open: '[', close: ']' },
          { open: '(', close: ')' },
          { open: '"', close: '"' },
          { open: "'", close: "'" }
        ]
      })
    }

    // Define light theme
    monaco.editor.defineTheme('custom-assembly-light', {
      base: 'vs',
      inherit: false,
      rules: [
        // Default text - black
        { token: '', foreground: '000000' },
        
        // Comments - #647182
        { token: 'comment', foreground: '647182' },
        
        // Strings - #003d99
        { token: 'string', foreground: '003d99' },
        { token: 'string.invalid', foreground: '003d99' },
        { token: 'string.escape.invalid', foreground: '003d99' },
        { token: 'string.regexp', foreground: '003d99' },
        
        // Keywords (ARM instructions) - #df0c24
        { token: 'keyword', foreground: 'df0c24' },
        
        // Functions/Labels - #894ceb
        { token: 'type', foreground: '894ceb' },
        
        // Variables (ARM registers) - #a24610
        { token: 'variable.predefined', foreground: 'a24610' },
        { token: 'identifier', foreground: '000000' },
        
        // Numbers/Constants - #005fcc
        { token: 'number', foreground: '005fcc' },
        { token: 'number.hex', foreground: '005fcc' }
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#000000',
        'editor.lineHighlightBackground': '#f6f8fa',
        'editor.lineHighlightBorder': '#f6f8fa',
        'editorLineNumber.foreground': '#bdbebf',
        'editorLineNumber.activeForeground': '#000000',
        'editorCursor.foreground': '#000000'
      }
    })

    // Define dark theme
    monaco.editor.defineTheme('custom-assembly-dark', {
      base: 'vs-dark',
      inherit: false,
      rules: [
        // Default text - white
        { token: '', foreground: 'ffffff' },
        
        // Comments - #8b92a3
        { token: 'comment', foreground: '8b92a3' },
        
        // Strings - #4da6ff
        { token: 'string', foreground: '4da6ff' },
        { token: 'string.invalid', foreground: '4da6ff' },
        { token: 'string.escape.invalid', foreground: '4da6ff' },
        { token: 'string.regexp', foreground: '4da6ff' },
        
        // Keywords (ARM instructions) - #ff6b7d
        { token: 'keyword', foreground: 'ff6b7d' },
        
        // Functions/Labels - #b794f6
        { token: 'type', foreground: 'b794f6' },
        
        // Variables (ARM registers) - #ffb366
        { token: 'variable.predefined', foreground: 'ffb366' },
        { token: 'identifier', foreground: 'ffffff' },
        
        // Numbers/Constants - #66b3ff
        { token: 'number', foreground: '66b3ff' },
        { token: 'number.hex', foreground: '66b3ff' }
      ],
      colors: {
        'editor.background': '#262626',
        'editor.foreground': '#ffffff',
        'editor.lineHighlightBackground': '#2f2f2f',
        'editor.lineHighlightBorder': '#2f2f2f',
        'editorLineNumber.foreground': '#6e7681',
        'editorLineNumber.activeForeground': '#ffffff',
        'editorCursor.foreground': '#FFFFFF'
      }
    })

    // Apply the appropriate theme immediately based on DOM class
    const isDark = document.documentElement.classList.contains('dark')
    const currentTheme = isDark ? 'custom-assembly-dark' : 'custom-assembly-light'
    monaco.editor.setTheme(currentTheme)
    
    // Mark editor as ready after a short delay
    setTimeout(() => setEditorReady(true), 10)
  }

  // Effect to update theme when it changes
  useEffect(() => {
    if (!monacoRef.current || !mounted) return

    const monaco = monacoRef.current
    const actualTheme = theme === 'system' ? systemTheme : theme
    
    // Re-define themes to ensure they're up to date
    monaco.editor.defineTheme('custom-assembly-dark', {
      base: 'vs-dark',
      inherit: false,
      rules: [
        { token: '', foreground: 'ffffff' },
        { token: 'comment', foreground: '8b92a3' },
        { token: 'string', foreground: '4da6ff' },
        { token: 'string.invalid', foreground: '4da6ff' },
        { token: 'string.escape.invalid', foreground: '4da6ff' },
        { token: 'string.regexp', foreground: '4da6ff' },
        { token: 'keyword', foreground: 'ff6b7d' },
        { token: 'type', foreground: 'b794f6' },
        { token: 'variable.predefined', foreground: 'ffb366' },
        { token: 'identifier', foreground: 'ffffff' },
        { token: 'number', foreground: '66b3ff' },
        { token: 'number.hex', foreground: '66b3ff' }
      ],
      colors: {
        'editor.background': '#262626',
        'editor.foreground': '#ffffff',
        'editor.lineHighlightBackground': '#2f2f2f',
        'editor.lineHighlightBorder': '#2f2f2f',
        'editorLineNumber.foreground': '#6e7681',
        'editorLineNumber.activeForeground': '#ffffff',
        'editorCursor.foreground': '#FFFFFF'
      }
    })

    monaco.editor.defineTheme('custom-assembly-light', {
      base: 'vs',
      inherit: false,
      rules: [
        { token: '', foreground: '000000' },
        { token: 'comment', foreground: '647182' },
        { token: 'string', foreground: '003d99' },
        { token: 'string.invalid', foreground: '003d99' },
        { token: 'string.escape.invalid', foreground: '003d99' },
        { token: 'string.regexp', foreground: '003d99' },
        { token: 'keyword', foreground: 'df0c24' },
        { token: 'type', foreground: '894ceb' },
        { token: 'variable.predefined', foreground: 'a24610' },
        { token: 'identifier', foreground: '000000' },
        { token: 'number', foreground: '005fcc' },
        { token: 'number.hex', foreground: '005fcc' }
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#000000',
        'editor.lineHighlightBackground': '#f6f8fa',
        'editor.lineHighlightBorder': '#f6f8fa',
        'editorLineNumber.foreground': '#bdbebf',
        'editorLineNumber.activeForeground': '#000000',
        'editorCursor.foreground': '#000000'
      }
    })

    const themeName = actualTheme === 'dark' ? 'custom-assembly-dark' : 'custom-assembly-light'
    monaco.editor.setTheme(themeName)
  }, [theme, systemTheme, mounted])

  // Effect to handle line highlighting
  useEffect(() => {
    if (!editorRef.current || highlightedLine === undefined) {
      return
    }

    const editor = editorRef.current

    // Add new decoration for highlighted line
    // Import monaco dynamically to avoid SSR issues
    import('monaco-editor').then((monaco) => {
      // Clear previous decorations and add new one
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
        {
          range: new monaco.Range(highlightedLine, 1, highlightedLine, Number.MAX_SAFE_INTEGER),
          options: {
            isWholeLine: true,
            className: 'highlighted-line-full',
            marginClassName: 'highlighted-line-margin',
            linesDecorationsClassName: 'highlighted-line-glyph'
          }
        }
      ])
    })

    // Scroll to highlighted line
    editor.revealLineInCenter(highlightedLine)
  }, [highlightedLine])

  // Effect to clear decorations when highlightedLine becomes undefined
  useEffect(() => {
    if (!editorRef.current || highlightedLine !== undefined) {
      return
    }

    const editor = editorRef.current
    // Clear all decorations
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [])
  }, [highlightedLine])

  return (
    <div 
      className={`h-full w-full ${className} ${disabled ? 'disabled-editor' : ''}`}
      style={{ opacity: editorReady ? (disabled ? 0.8 : 1) : 0 }}
    >
      <style dangerouslySetInnerHTML={{
        __html: `
          .monaco-editor .view-overlays .current-line {
            background-color: #f6f8fa !important;
            border: none !important;
          }
          .dark .monaco-editor .view-overlays .current-line {
            background-color: #2f2f2f !important;
          }
          .monaco-editor .margin-view-overlays .current-line-margin {
            background-color: #f6f8fa !important;
            border: none !important;
          }
          .dark .monaco-editor .margin-view-overlays .current-line-margin {
            background-color: #2f2f2f !important;
          }
          .monaco-editor .scroll-decoration {
            display: none !important;
          }
          .monaco-editor:not(.focused) .view-overlays .current-line {
            background-color: transparent !important;
          }
          .monaco-editor:not(.focused) .margin-view-overlays .current-line-margin {
            background-color: transparent !important;
          }
          .monaco-editor .line-numbers {
            color: #bdbebf !important;
          }
          .dark .monaco-editor .line-numbers {
            color: #6e7681 !important;
          }
          .monaco-editor .current-line .line-numbers,
          .monaco-editor .active-line-number {
            color: #000000 !important;
          }
          .dark .monaco-editor .current-line .line-numbers,
          .dark .monaco-editor .active-line-number {
            color: #ffffff !important;
          }
          .monaco-editor .margin-view-overlays .current-line-margin,
          .monaco-editor .margin-view-overlays .current-line-margin * {
            color: #000000 !important;
          }
          .dark .monaco-editor .margin-view-overlays .current-line-margin,
          .dark .monaco-editor .margin-view-overlays .current-line-margin * {
            color: #ffffff !important;
          }
          .monaco-editor .cursors-layer .cursor {
            background-color: #000000 !important;
            border-left: 1px solid #000000 !important;
            color: #000000 !important;
            transition: all 0.1s ease-out !important;
          }
          .dark .monaco-editor .cursors-layer .cursor {
            background-color: #FFFFFF !important;
            border-left: 1px solid #FFFFFF !important;
            color: #FFFFFF !important;
            transition: all 0.1s ease-out !important;
          }
          .monaco-editor .cursors-layer > .cursor {
            background-color: #000000 !important;
            border-color: #000000 !important;
            transition: all 0.1s ease-out !important;
          }
          .dark .monaco-editor .cursors-layer > .cursor {
            background-color: #FFFFFF !important;
            border-color: #FFFFFF !important;
            transition: all 0.1s ease-out !important;
          }
          .monaco-editor .highlighted-line-full {
            background-color: #f7f1da !important;
          }
          .dark .monaco-editor .highlighted-line-full {
            background-color: #4a4a3a !important;
          }
          .monaco-editor .view-overlays .highlighted-line-full {
            background-color: #f7f1da !important;
            width: 100% !important;
            left: 0 !important;
            right: 0 !important;
          }
          .dark .monaco-editor .view-overlays .highlighted-line-full {
            background-color: #4a4a3a !important;
          }
          .monaco-editor .highlighted-line-margin {
            background-color: #f7f1da !important;
          }
          .dark .monaco-editor .highlighted-line-margin {
            background-color: #4a4a3a !important;
          }
          .monaco-editor .highlighted-line-glyph {
            background-color: #f7f1da !important;
          }
          .dark .monaco-editor .highlighted-line-glyph {
            background-color: #4a4a3a !important;
          }
          .disabled-editor .monaco-editor * {
            pointer-events: none !important;
          }
          .disabled-editor .monaco-scrollable-element {
            pointer-events: auto !important;
          }
          .disabled-editor .scrollbar {
            pointer-events: auto !important;
          }
        `
      }} />
      <Editor
        height={height}
        width={width}
        language="assembly"
        value={value}
        onChange={onChange}
        onMount={handleEditorDidMount}
        theme={mounted && (theme === 'dark' || (theme === 'system' && systemTheme === 'dark')) ? 'custom-assembly-dark' : 'custom-assembly-light'}
        loading=""
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: 'Menlo, Monaco, "Courier New", monospace',
          lineNumbers: 'on',
          lineNumbersMinChars: 5,
          glyphMargin: false,
          roundedSelection: false,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
          wordWrap: 'on',
          contextmenu: false,
          mouseWheelZoom: false,
          cursorStyle: 'line',
          lineHeight: 1.5,
          renderWhitespace: 'selection',
          showUnused: false,
          folding: true,
          foldingHighlight: true,
          unfoldOnClickAfterEndOfLine: false,
          selectOnLineNumbers: true,
          padding: { top: 8 },
          scrollbar: { 
            vertical: 'hidden',
            horizontal: 'hidden'
          },
          overviewRulerLanes: 0,
          renderLineHighlight: 'all',
          occurrencesHighlight: 'off',
          selectionHighlight: false
        }}
      />
    </div>
  )
} 
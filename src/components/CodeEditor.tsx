'use client'

import { Editor } from '@monaco-editor/react'
import { useRef, useEffect } from 'react'

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

  function handleEditorDidMount(
    editor: import('monaco-editor').editor.IStandaloneCodeEditor, 
    monaco: typeof import('monaco-editor')
  ) {
    editorRef.current = editor

    // Register assembly language if not already registered
    if (!monaco.languages.getLanguages().some((lang: { id: string }) => lang.id === 'assembly')) {
      monaco.languages.register({ id: 'assembly' })

      // Define assembly language syntax highlighting
      monaco.languages.setMonarchTokensProvider('assembly', {
        tokenizer: {
          root: [
            // Numbers (before comments to catch #4, #1, etc.)
            [/\b0x[0-9a-fA-F]+\b/, 'number.hex'],
            [/#[0-9]+\b/, 'number'],
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
            [/\b(?:mov|add|sub|mul|div|cmp|b|bl|bx|blx|beq|bne|blt|ble|bgt|bge|bcc|bcs|bhi|bls|bmi|bpl|bvs|bvc|ldr|str|ldm|stm|push|pop|nop|adr|and|orr|eor|bic|mvn|lsl|lsr|asr|ror|rrx|MOV|ADD|SUB|MUL|DIV|CMP|B|BL|BX|BLX|BEQ|BNE|BLT|BLE|BGT|BGE|BCC|BCS|BHI|BLS|BMI|BPL|BVS|BVC|LDR|STR|LDM|STM|PUSH|POP|NOP|ADR|AND|ORR|EOR|BIC|MVN|LSL|LSR|ASR|ROR|RRX)\b/, 'keyword'],
            
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

    // Define custom theme after language registration
    monaco.editor.defineTheme('custom-assembly-theme', {
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
        'editorCursor.foreground': '#1b4184'
      }
    })

    // Apply the theme
    monaco.editor.setTheme('custom-assembly-theme')
  }

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
      className={`h-full w-full ${className} ${disabled ? 'pointer-events-none' : ''}`}
      style={{ opacity: disabled ? 0.8 : 1 }}
    >
      <style dangerouslySetInnerHTML={{
        __html: `
          .monaco-editor .view-overlays .current-line {
            background-color: #f6f8fa !important;
            border: none !important;
          }
          .monaco-editor .margin-view-overlays .current-line-margin {
            background-color: #f6f8fa !important;
            border: none !important;
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
          .monaco-editor .current-line .line-numbers,
          .monaco-editor .active-line-number {
            color: #000000 !important;
          }
          .monaco-editor .margin-view-overlays .current-line-margin,
          .monaco-editor .margin-view-overlays .current-line-margin * {
            color: #000000 !important;
          }
          .monaco-editor .cursors-layer .cursor {
            background-color: #1b4184 !important;
            border-left: 1px solid #1b4184 !important;
            color: #1b4184 !important;
            transition: all 0.1s ease-out !important;
          }
          .monaco-editor .cursors-layer > .cursor {
            background-color: #1b4184 !important;
            border-color: #1b4184 !important;
            transition: all 0.1s ease-out !important;
          }
          .monaco-editor .highlighted-line-full {
            background-color: #f7f1da !important;
          }
          .monaco-editor .view-overlays .highlighted-line-full {
            background-color: #f7f1da !important;
            width: 100% !important;
            left: 0 !important;
            right: 0 !important;
          }
          .monaco-editor .highlighted-line-margin {
            background-color: #f7f1da !important;
          }
          .monaco-editor .highlighted-line-glyph {
            background-color: #f7f1da !important;
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
        theme="custom-assembly-theme"
        loading=""
        beforeMount={(monaco) => {
          if (disabled) {
            // Additional setup for disabled state if needed
          }
        }}
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
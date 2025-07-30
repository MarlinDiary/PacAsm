'use client'

import { Editor } from '@monaco-editor/react'
import { useRef, useEffect } from 'react'

interface CodeEditorProps {
  value?: string
  onChange?: (value: string | undefined) => void
  height?: string | number
  width?: string | number
  readOnly?: boolean
  className?: string
  highlightedLine?: number
}

export default function CodeEditor({
  value = '',
  onChange,
  height = '100%',
  width = '100%',
  readOnly = false,
  className = '',
  highlightedLine
}: CodeEditorProps) {
  const editorRef = useRef<any>(null)
  const decorationsRef = useRef<string[]>([])

  function handleEditorDidMount(editor: any, monaco: any) {
    editorRef.current = editor

    // Register assembly language if not already registered
    if (!monaco.languages.getLanguages().some((lang: any) => lang.id === 'assembly')) {
      monaco.languages.register({ id: 'assembly' })

      // Define assembly language syntax highlighting
      monaco.languages.setMonarchTokensProvider('assembly', {
        tokenizer: {
          root: [
            // Comments
            [/;.*$/, 'comment'],
            [/#.*$/, 'comment'],
            [/\/\/.*$/, 'comment'],
            
            // Labels
            [/^[a-zA-Z_][a-zA-Z0-9_]*:/, 'type'],
            
            // ARM instructions
            [/\b(mov|add|sub|mul|div|cmp|b|bl|bx|blx|beq|bne|blt|ble|bgt|bge|ldr|str|ldm|stm|push|pop|nop)\b/i, 'keyword'],
            
            // ARM registers
            [/\b(r[0-9]|r1[0-5]|sp|lr|pc|cpsr)\b/i, 'variable.predefined'],
            
            // Numbers
            [/\b0x[0-9a-fA-F]+\b/, 'number.hex'],
            [/\b[0-9]+\b/, 'number'],
            
            // Strings
            [/"([^"\\]|\\.)*$/, 'string.invalid'],
            [/"/, 'string', '@string'],
            [/'([^'\\]|\\.)*$/, 'string.invalid'],
            [/'/, 'string', '@string_single'],
            
            // ARM directives and comments
            [/@.*$/, 'comment'],
            
            // Memory references
            [/\[[^\]]+\]/, 'string.regexp'],
            
            // Identifiers
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
  }

  // Effect to handle line highlighting
  useEffect(() => {
    if (!editorRef.current || highlightedLine === undefined) {
      return
    }

    const editor = editorRef.current

    // Clear previous decorations
    if (decorationsRef.current.length > 0) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [])
    }

    // Add new decoration for highlighted line
    // Import monaco dynamically to avoid SSR issues
    import('monaco-editor').then((monaco) => {
      decorationsRef.current = editor.deltaDecorations([], [
        {
          range: new monaco.Range(highlightedLine, 1, highlightedLine, 1),
          options: {
            isWholeLine: true,
            className: 'highlighted-line',
            glyphMarginClassName: 'highlighted-line-glyph'
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
    if (decorationsRef.current.length > 0) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [])
    }
  }, [highlightedLine])

  return (
    <div className={`h-full w-full ${className}`}>
      <Editor
        height={height}
        width={width}
        language="assembly"
        value={value}
        onChange={onChange}
        onMount={handleEditorDidMount}
        theme="vs"
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 4,
          insertSpaces: true,
          wordWrap: 'off',
          contextmenu: true,
          mouseWheelZoom: true,
          cursorStyle: 'line',
          lineHeight: 1.5,
          renderWhitespace: 'selection',
          showUnused: false,
          folding: true,
          foldingHighlight: true,
          unfoldOnClickAfterEndOfLine: false,
          selectOnLineNumbers: true
        }}
      />
    </div>
  )
} 
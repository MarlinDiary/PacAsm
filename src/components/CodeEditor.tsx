'use client'

import { Editor } from '@monaco-editor/react'
import { useEffect, useRef } from 'react'

interface CodeEditorProps {
  value?: string
  onChange?: (value: string | undefined) => void
  height?: string | number
  width?: string | number
  readOnly?: boolean
  className?: string
}

export default function CodeEditor({
  value = '',
  onChange,
  height = '100%',
  width = '100%',
  readOnly = false,
  className = ''
}: CodeEditorProps) {
  const editorRef = useRef<any>(null)

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
            
            // Instructions (common assembly instructions)
            [/\b(mov|add|sub|mul|div|jmp|je|jne|jg|jl|jge|jle|cmp|test|push|pop|call|ret|nop|int|inc|dec|and|or|xor|not|shl|shr|lea|loop)\b/i, 'keyword'],
            
            // Registers (x86/x64 registers)
            [/\b(eax|ebx|ecx|edx|esi|edi|esp|ebp|ax|bx|cx|dx|si|di|sp|bp|al|ah|bl|bh|cl|ch|dl|dh|rax|rbx|rcx|rdx|rsi|rdi|rsp|rbp|r[8-9]|r1[0-5])\b/i, 'variable.predefined'],
            
            // Numbers
            [/\b0x[0-9a-fA-F]+\b/, 'number.hex'],
            [/\b[0-9]+\b/, 'number'],
            
            // Strings
            [/"([^"\\]|\\.)*$/, 'string.invalid'],
            [/"/, 'string', '@string'],
            [/'([^'\\]|\\.)*$/, 'string.invalid'],
            [/'/, 'string', '@string_single'],
            
            // Directives
            [/\.(section|data|text|bss|global|extern|equ|db|dw|dd|dq)\b/i, 'keyword.control'],
            
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
          lineComment: ';'
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
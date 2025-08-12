// Macro preprocessor for ARM assembly
// Handles macro expansion and maintains source line mapping

export interface MacroDefinition {
  name: string;
  parameters: string[];
  body: string[];
  startLine: number;
  endLine: number;
}

export interface LineMapping {
  expandedLine: number;    // Line number in expanded code
  originalLine: number;    // Line number in original source
  isMacroExpansion: boolean;
  macroName?: string;
  macroCallLine?: number;  // Line where macro was called
}

export interface PreprocessResult {
  expandedCode: string;
  lineMapping: LineMapping[];
  macros: Map<string, MacroDefinition>;
}

export class MacroPreprocessor {
  private macros: Map<string, MacroDefinition> = new Map();
  private lineMapping: LineMapping[] = [];
  
  /**
   * Preprocess assembly code, expanding macros and tracking line mappings
   */
  preprocess(sourceCode: string): PreprocessResult {
    const lines = sourceCode.split('\n');
    const expandedLines: string[] = [];
    this.lineMapping = [];
    this.macros.clear();
    
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      const trimmedLine = this.removeComments(line).trim();
      
      // Check for macro definition
      if (trimmedLine.toUpperCase().startsWith('.MACRO')) {
        const macro = this.parseMacroDefinition(lines, i);
        if (macro) {
          this.macros.set(macro.name.toUpperCase(), macro);
          // Skip to end of macro definition
          i = macro.endLine + 1;
          continue;
        }
      }
      
      // Check for macro call
      const macroCall = this.detectMacroCall(trimmedLine);
      if (macroCall) {
        const expanded = this.expandMacro(macroCall.name, macroCall.args, i);
        if (expanded) {
          // Add expanded lines with mapping
          expanded.forEach(expandedLine => {
            this.lineMapping.push({
              expandedLine: expandedLines.length,
              originalLine: i,
              isMacroExpansion: true,
              macroName: macroCall.name,
              macroCallLine: i
            });
            expandedLines.push(expandedLine);
          });
          i++;
          continue;
        }
      }
      
      // Regular line - add with direct mapping
      this.lineMapping.push({
        expandedLine: expandedLines.length,
        originalLine: i,
        isMacroExpansion: false
      });
      expandedLines.push(line);
      i++;
    }
    
    return {
      expandedCode: expandedLines.join('\n'),
      lineMapping: this.lineMapping,
      macros: this.macros
    };
  }
  
  /**
   * Parse a macro definition starting at the given line
   */
  private parseMacroDefinition(lines: string[], startIndex: number): MacroDefinition | null {
    const startLine = this.removeComments(lines[startIndex]).trim();
    const macroMatch = startLine.match(/\.macro\s+(\w+)(?:\s+(.*))?/i);
    
    if (!macroMatch) {
      return null;
    }
    
    const name = macroMatch[1];
    const paramsStr = macroMatch[2] || '';
    const parameters = paramsStr
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    const body: string[] = [];
    let i = startIndex + 1;
    
    // Find macro body until .endm
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = this.removeComments(line).trim();
      
      if (trimmed.toUpperCase() === '.ENDM') {
        return {
          name,
          parameters,
          body,
          startLine: startIndex,
          endLine: i
        };
      }
      
      body.push(line);
      i++;
    }
    
    // No .endm found
    console.warn(`Macro ${name} at line ${startIndex + 1} has no matching .endm`);
    return null;
  }
  
  /**
   * Detect if a line is a macro call
   */
  private detectMacroCall(line: string): { name: string; args: string[] } | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('.') || trimmed.includes(':')) {
      return null;
    }
    
    const parts = trimmed.split(/\s+/);
    const instruction = parts[0].toUpperCase();
    
    if (this.macros.has(instruction)) {
      // Parse arguments
      const argsStr = trimmed.substring(parts[0].length).trim();
      const args = argsStr
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0);
      
      return { name: instruction, args };
    }
    
    return null;
  }
  
  /**
   * Expand a macro with the given arguments
   */
  private expandMacro(name: string, args: string[], callLine: number): string[] | null {
    const macro = this.macros.get(name.toUpperCase());
    if (!macro) {
      return null;
    }
    
    // Check argument count
    if (args.length !== macro.parameters.length) {
      console.warn(
        `Macro ${name} at line ${callLine + 1} expects ${macro.parameters.length} arguments, got ${args.length}`
      );
    }
    
    // Create parameter substitution map
    const substitutions: Map<string, string> = new Map();
    macro.parameters.forEach((param, index) => {
      if (index < args.length) {
        // Support both \param and param syntax
        substitutions.set(`\\${param}`, args[index]);
        substitutions.set(param, args[index]);
      }
    });
    
    // Expand macro body with parameter substitution
    return macro.body.map(line => {
      let expanded = line;
      
      // Replace parameters
      substitutions.forEach((value, param) => {
        // Use regex for whole-word replacement
        const regex = new RegExp(`\\b${this.escapeRegex(param)}\\b`, 'gi');
        expanded = expanded.replace(regex, value);
      });
      
      return expanded;
    });
  }
  
  /**
   * Remove comments from a line
   */
  private removeComments(line: string): string {
    // Remove @ and // style comments
    let result = line.split('//')[0];
    result = result.split('@')[0];
    return result;
  }
  
  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * Get the original source line for an expanded line number
   */
  getOriginalLine(expandedLineNumber: number): number | null {
    const mapping = this.lineMapping.find(m => m.expandedLine === expandedLineNumber);
    return mapping ? mapping.originalLine : null;
  }
  
  /**
   * Get all expanded lines that came from an original source line
   */
  getExpandedLines(originalLineNumber: number): number[] {
    return this.lineMapping
      .filter(m => m.originalLine === originalLineNumber)
      .map(m => m.expandedLine);
  }
}

// Utility function to create and use preprocessor
export const preprocessAssembly = (sourceCode: string): PreprocessResult => {
  const preprocessor = new MacroPreprocessor();
  return preprocessor.preprocess(sourceCode);
};
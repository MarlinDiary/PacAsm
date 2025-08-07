// Code highlighter for single-step debugging
// Maps memory addresses to source code lines for highlighting during debug execution

import { ARMAssembler } from './assembler';
import { disassembleCode } from './disassembler';

interface SourceLine {
  lineNumber: number;
  content: string;
  address?: number;
  isExecutable: boolean;
}

interface AddressMapping {
  address: number;
  lineNumber: number;
  instruction: string;
  sourceContent: string;
}

export interface HighlightInfo {
  lineNumber: number;
  address: number;
  instruction: string;
  isActive: boolean;
}

export class CodeHighlighter {
  private addressMap: Map<number, AddressMapping> = new Map();
  private sourceLines: SourceLine[] = [];
  private baseAddress: number;

  constructor(options: { baseAddress?: number } = {}) {
    this.baseAddress = options.baseAddress || 0x10000;
  }

  /**
   * Initialize the highlighter by processing source code
   * Creates mapping between addresses and source lines
   */
  async initialize(sourceCode: string): Promise<void> {
    // Parse source code into lines
    this.sourceLines = this.parseSourceCode(sourceCode);
    
    // Assembly the source code to get machine code
    const assembler = new ARMAssembler({ baseAddress: this.baseAddress });
    await assembler.initialize();
    
    try {
      const assemblyResult = await assembler.assemble(sourceCode);
      
      // Use utility function that handles initialization and cleanup automatically
      const disassemblyResult = await disassembleCode(
        assemblyResult.mc,
        this.baseAddress,
        { detail: true }
      );
      
      // Create address to source line mapping
      this.createAddressMapping(disassemblyResult);
    } finally {
      assembler.destroy();
    }
  }

  /**
   * Get the line number that should be highlighted for a given PC address
   */
  getHighlightLine(pcAddress: number): HighlightInfo | null {
    const mapping = this.addressMap.get(pcAddress);
    if (!mapping) {
      return null;
    }

    return {
      lineNumber: mapping.lineNumber,
      address: mapping.address,
      instruction: mapping.instruction,
      isActive: true
    };
  }


  /**
   * Parse source code into structured lines
   */
  private parseSourceCode(sourceCode: string): SourceLine[] {
    const lines = sourceCode.split('\n');
    const sourceLines: SourceLine[] = [];

    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      const content = line;
      
      // Check if line contains executable instruction (not comment or empty)
      const cleanLine = line.split('@')[0].trim(); // Remove comments
      const isExecutable = cleanLine.length > 0 && !cleanLine.endsWith(':');

      sourceLines.push({
        lineNumber,
        content,
        isExecutable
      });
    });

    return sourceLines;
  }

  /**
   * Create mapping between addresses and source lines
   */
  private createAddressMapping(disassemblyResult: Array<{
    address: number;
    bytes: Uint8Array;
    mnemonic: string;
    op_str: string;
  }>): void {
    this.addressMap.clear();

    // Get executable source lines (excluding comments and labels)
    const executableLines = this.sourceLines.filter(line => line.isExecutable);
    
    // Map each disassembled instruction to source lines
    disassemblyResult.forEach((instruction, index) => {
      if (index < executableLines.length) {
        const sourceLine = executableLines[index];
        const mapping: AddressMapping = {
          address: instruction.address,
          lineNumber: sourceLine.lineNumber,
          instruction: `${instruction.mnemonic} ${instruction.op_str}`.trim(),
          sourceContent: sourceLine.content
        };

        this.addressMap.set(instruction.address, mapping);
        
        // Update source line with address info
        sourceLine.address = instruction.address;
      }
    });
  }


  /**
   * Reset the highlighter state
   */
  reset(): void {
    this.addressMap.clear();
    this.sourceLines = [];
  }

}

// Utility function to create and initialize highlighter
export const createHighlighter = async (
  sourceCode: string,
  options?: { baseAddress?: number }
): Promise<CodeHighlighter> => {
  const highlighter = new CodeHighlighter(options);
  await highlighter.initialize(sourceCode);
  return highlighter;
};

// Helper function to get highlight info from step result
export const getHighlightFromStepResult = (
  stepResult: { instruction?: { address: number } },
  highlighter: CodeHighlighter
): HighlightInfo | null => {
  if (!stepResult.instruction || !stepResult.instruction.address) {
    return null;
  }
  
  return highlighter.getHighlightLine(stepResult.instruction.address);
};
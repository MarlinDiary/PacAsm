// TypeScript wrapper for ARM assembly using Keystone.js

declare global {
  interface Window {
    ks: {
      Keystone: new (arch: number, mode: number) => KeystoneInstance;
      ARCH_ARM: number;
      MODE_ARM: number;
    };
  }
}

interface KeystoneInstance {
  asm(assembly: string, address: number): Uint8Array;
  close(): void;
}

export interface AssemblerOptions {
  baseAddress?: number;
}

export interface AssemblyResult {
  mc: Uint8Array;
  count: number;
  size: number;
}

export class ARMAssembler {
  private keystone: KeystoneInstance | null = null;
  private isInitialized = false;

  constructor(private options: AssemblerOptions = {}) {
    this.options = {
      baseAddress: 0x10000,
      ...options,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.loadKeystoneScript();
      
      if (typeof window.ks === 'undefined') {
        throw new Error('INIT_ERROR: Keystone.js not loaded');
      }

      this.keystone = new window.ks.Keystone(window.ks.ARCH_ARM, window.ks.MODE_ARM);
      this.isInitialized = true;
    } catch (error) {
      throw new Error('INIT_ERROR: Failed to initialize assembler');
    }
  }

  private async loadKeystoneScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window.ks !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = '/arm/keystone-arm.min.js';
      script.onload = () => {
        setTimeout(() => {
          if (typeof window.ks !== 'undefined') {
            resolve();
          } else {
            reject(new Error('LOAD_ERROR: Keystone.js failed to load'));
          }
        }, 100);
      };
      script.onerror = () => reject(new Error('LOAD_ERROR: Failed to load keystone-arm.min.js'));
      document.head.appendChild(script);
    });
  }

  private validateInstructions(lines: string[]): void {
    // Define valid ARM instruction mnemonics (basic set)
    const validInstructions = [
      // Data processing
      'ADD', 'ADDS', 'SUB', 'SUBS', 'MUL', 'AND', 'ORR', 'EOR', 'BIC', 'MOV', 'MOVS', 'MVN',
      'TST', 'TEQ', 'CMP', 'CMN', 'LSL', 'LSR', 'ASR', 'ROR', 'RRX',
      
      // Memory instructions
      'LDR', 'STR', 'LDM', 'STM', 'PUSH', 'POP',
      'LDRB', 'STRB', 'LDRH', 'STRH',
      'LDRSB', 'LDRSH',
      
      // Branch instructions
      'B', 'BL', 'BX', 'BLX',
      
      // Conditional versions (add common suffixes)
      'ADDEQ', 'ADDNE', 'ADDCS', 'ADDCC', 'ADDMI', 'ADDPL', 'ADDVS', 'ADDVC',
      'ADDHI', 'ADDLS', 'ADDGE', 'ADDLT', 'ADDGT', 'ADDLE', 'ADDAL',
      'SUBEQ', 'SUBNE', 'SUBCS', 'SUBCC', 'SUBMI', 'SUBPL', 'SUBVS', 'SUBVC',
      'SUBHI', 'SUBLS', 'SUBGE', 'SUBLT', 'SUBGT', 'SUBLE', 'SUBAL',
      'MOVEQ', 'MOVNE', 'MOVCS', 'MOVCC', 'MOVMI', 'MOVPL', 'MOVVS', 'MOVVC',
      'MOVHI', 'MOVLS', 'MOVGE', 'MOVLT', 'MOVGT', 'MOVLE', 'MOVAL',
      'LDREQ', 'LDRNE', 'LDRCS', 'LDRCC', 'LDRMI', 'LDRPL', 'LDRVS', 'LDRVC',
      'LDRHI', 'LDRLS', 'LDRGE', 'LDRLT', 'LDRGT', 'LDRLE', 'LDRAL',
      'STREQ', 'STRNE', 'STRCS', 'STRCC', 'STRMI', 'STRPL', 'STRVS', 'STRVC',
      'STRHI', 'STRLS', 'STRGE', 'STRLT', 'STRGT', 'STRLE', 'STRAL',
      'BEQ', 'BNE', 'BCS', 'BCC', 'BMI', 'BPL', 'BVS', 'BVC',
      'BHI', 'BLS', 'BGE', 'BLT', 'BGT', 'BLE', 'BAL',
      
      // Other common instructions
      'NOP', 'SWI', 'SVC', 'MSR', 'MRS', 'CLZ', 'REV', 'RBIT'
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes(':')) {
        // Skip labels
        continue;
      }
      
      // Extract the instruction mnemonic (first word)
      const parts = line.split(/\s+/);
      if (parts.length === 0) continue;
      
      const instruction = parts[0].toUpperCase();
      
      // Check if it's a valid instruction
      if (!validInstructions.includes(instruction)) {
        throw new Error(`SYNTAX_ERROR: Invalid instruction at line ${i + 1}`);
      }
    }
  }

  async assemble(assembly: string): Promise<AssemblyResult> {
    if (!this.isInitialized || !this.keystone) {
      throw new Error('INIT_ERROR: Assembler not initialized');
    }

    if (!assembly || typeof assembly !== 'string') {
      throw new Error('INPUT_ERROR: Invalid assembly input');
    }

    // Clean and normalize the assembly code
    const lines = assembly
      .split('\n')
      .map(line => line.split('@')[0].trim()) // Remove comments
      .filter(line => line.length > 0); // Remove empty lines

    // Validate each line before assembling to catch invalid instructions
    this.validateInstructions(lines);

    const cleanedAssembly = lines.join('\n');

    try {
      const baseAddress = this.options.baseAddress || 0x10000;
      const result = this.keystone.asm(cleanedAssembly, baseAddress);
      
      if (!result) {
        throw new Error('ASSEMBLY_ERROR: Result is null or undefined');
      }

      if (!(result instanceof Uint8Array)) {
        throw new Error('ASSEMBLY_ERROR: Invalid result type');
      }

      if (result.length === 0) {
        throw new Error('ASSEMBLY_ERROR: No machine code generated');
      }

      return {
        mc: result,
        count: result.length / 4, // ARM instructions are 4 bytes
        size: result.length
      };

    } catch (error) {
      // Provide helpful error information for common issues
      let errorMessage = 'ASSEMBLY_ERROR: Assembly failed';
      
      if ((error as Error).message.includes('KS_ERR_ASM_INVALIDOPERAND')) {
        errorMessage += '\n\nPossible causes:';
        errorMessage += '\n• Invalid register name (use r0-r12, sp, lr, pc)';
        errorMessage += '\n• Invalid immediate value syntax (use #value)';
        errorMessage += '\n• Invalid addressing mode [rN] or [rN, #offset]';
        errorMessage += '\n• Missing operands in instruction';
      }
      
      throw new Error(errorMessage);
    }
  }

  bytesToHex(bytes: Uint8Array): string {
    if (!bytes || bytes.length === 0) {
      return '';
    }
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' ');
  }

  getStats(result: AssemblyResult): string {
    if (!result) {
      return 'No assembly result';
    }
    
    return [
      `Instructions: ${result.count}`,
      `Bytes: ${result.size}`
    ].join(', ');
  }

  destroy(): void {
    if (this.keystone) {
      try {
        this.keystone.close();
      } catch {
        // Ignore cleanup errors
      }
      this.keystone = null;
    }
    this.isInitialized = false;
  }
}

// Utility functions
export const createAssembler = (options?: AssemblerOptions): ARMAssembler => {
  return new ARMAssembler(options);
};

export const assembleCode = async (
  assembly: string,
  options?: AssemblerOptions
): Promise<AssemblyResult> => {
  const assembler = createAssembler(options);
  try {
    await assembler.initialize();
    return await assembler.assemble(assembly);
  } finally {
    assembler.destroy();
  }
};

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
        throw new Error('Keystone.js not loaded');
      }

      this.keystone = new window.ks.Keystone(window.ks.ARCH_ARM, window.ks.MODE_ARM);
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize ARM assembler: ${error}`);
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
            reject(new Error('Keystone.js failed to load properly'));
          }
        }, 100);
      };
      script.onerror = () => reject(new Error('Failed to load keystone-arm.min.js'));
      document.head.appendChild(script);
    });
  }

  async assemble(assembly: string): Promise<AssemblyResult> {
    if (!this.isInitialized || !this.keystone) {
      throw new Error('Assembler not initialized');
    }

    if (!assembly || typeof assembly !== 'string') {
      throw new Error('Invalid assembly input');
    }

    // Clean and normalize the assembly code
    const cleanedAssembly = assembly
      .split('\n')
      .map(line => line.split('@')[0].trim()) // Remove comments
      .filter(line => line.length > 0) // Remove empty lines
      .join('\n');

    try {
      const baseAddress = this.options.baseAddress || 0x10000;
      const result = this.keystone.asm(cleanedAssembly, baseAddress);
      
      if (!result) {
        throw new Error('Assembly result is null or undefined');
      }

      if (!(result instanceof Uint8Array)) {
        throw new Error(`Expected Uint8Array, got ${typeof result}`);
      }

      if (result.length === 0) {
        throw new Error('Assembly produced no machine code');
      }

      return {
        mc: result,
        count: result.length / 4, // ARM instructions are 4 bytes
        size: result.length
      };

    } catch (error) {
      // Provide helpful error information for common issues
      let errorMessage = `Assembly error: ${error}`;
      
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
      } catch (error) {
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

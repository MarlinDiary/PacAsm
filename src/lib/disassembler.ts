// TypeScript wrapper for capstone.js ARM disassembler

// Type definitions for capstone.js
declare global {
  interface Window {
    cs: {
      Capstone: new (arch: number, mode: number) => CapstoneInstance;
      ARCH_ARM: number;
      MODE_ARM: number;
      OPT_DETAIL: number;
    };
  }
}

interface CapstoneInstance {
  option(type: number, value: number): void;
  disasm(bytes: Uint8Array, address: number, count?: number): DisassemblyResult[];
  close(): void;
}

interface DisassemblyResult {
  address: number;
  size: number;
  bytes: Uint8Array;
  mnemonic: string;
  op_str: string;
  id?: number;
}

export interface DisassemblerOptions {
  detail?: boolean;
}

export class ARMDisassembler {
  private capstone: CapstoneInstance | null = null;
  private isInitialized = false;

  constructor(private options: DisassemblerOptions = {}) {
    this.options = {
      detail: false,
      ...options,
    };
  }

  /**
   * Initialize the disassembler by loading the capstone.js library
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.capstone) {
      return;
    }

    try {
      // Load capstone.js script if not already loaded
      if (!window.cs) {
        await this.loadCapstoneScript();
      }

      // Wait for library to be fully loaded
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!window.cs || !window.cs.Capstone) {
        throw new Error('Capstone library not properly loaded');
      }

      // Create capstone instance for ARM 32-bit
      this.capstone = new window.cs.Capstone(window.cs.ARCH_ARM, window.cs.MODE_ARM);
      
      if (!this.capstone) {
        throw new Error('Failed to create Capstone instance');
      }

      // Enable detailed instruction information if requested
      if (this.options.detail && window.cs.OPT_DETAIL !== undefined) {
        try {
          this.capstone.option(window.cs.OPT_DETAIL, 1);
        } catch (error) {
          // Continue without detailed info if option fails
        }
      }

      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize ARM disassembler: ${error}`);
    }
  }

  /**
   * Disassemble machine code to ARM assembly
   */
  async disassemble(
    bytes: Uint8Array | number[],
    address: number = 0x1000,
    count?: number
  ): Promise<DisassemblyResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.capstone) {
      throw new Error('Disassembler not properly initialized');
    }

    try {
      // Convert number array to Uint8Array if needed
      const byteArray = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      
      if (byteArray.length === 0) {
        throw new Error('No bytes provided for disassembly');
      }

      const results = this.capstone.disasm(byteArray, address, count);
      
      if (!results || results.length === 0) {
        throw new Error('Disassembly failed: No instructions found or invalid machine code');
      }

      return results;
    } catch (error) {
      throw new Error(`Disassembly error: ${error}`);
    }
  }

  /**
   * Convert hex string to byte array
   */
  hexToBytes(hex: string): Uint8Array {
    // Remove spaces and ensure even length
    const cleanHex = hex.replace(/\s+/g, '');
    if (cleanHex.length % 2 !== 0) {
      throw new Error('Invalid hex string: must have even length');
    }

    if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
      throw new Error('Invalid hex string: contains non-hex characters');
    }

    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
    }
    return bytes;
  }

  /**
   * Format disassembly results as readable text
   */
  formatInstructions(results: DisassemblyResult[]): string {
    return results
      .map(result => {
        const addr = `0x${result.address.toString(16).padStart(8, '0')}`;
        const bytes = Array.from(result.bytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join(' ')
          .padEnd(16);
        const instruction = `${result.mnemonic} ${result.op_str}`.trim();
        return `${addr}: ${bytes} ${instruction}`;
      })
      .join('\n');
  }

  /**
   * Get instruction statistics
   */
  getStats(results: DisassemblyResult[]): {
    instructionCount: number;
    totalBytes: number;
    addressRange: { start: number; end: number };
  } {
    if (results.length === 0) {
      return {
        instructionCount: 0,
        totalBytes: 0,
        addressRange: { start: 0, end: 0 },
      };
    }

    const totalBytes = results.reduce((sum, result) => sum + result.size, 0);
    const start = results[0].address;
    const lastResult = results[results.length - 1];
    const end = lastResult.address + lastResult.size;

    return {
      instructionCount: results.length,
      totalBytes,
      addressRange: { start, end },
    };
  }

  /**
   * Check if instruction is a branch/jump
   */
  isBranch(result: DisassemblyResult): boolean {
    const branchMnemonics = ['b', 'bl', 'bx', 'blx', 'beq', 'bne', 'blt', 'ble', 'bgt', 'bge'];
    return branchMnemonics.some(mnemonic => 
      result.mnemonic.toLowerCase().startsWith(mnemonic)
    );
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.capstone && this.isInitialized) {
      try {
        this.capstone.close();
      } catch (error) {
        // Ignore close errors
        console.warn('Warning during capstone cleanup:', error);
      }
      this.capstone = null;
    }
    this.isInitialized = false;
  }

  private async loadCapstoneScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script is already loading or loaded
      const existingScript = document.querySelector('script[src="/arm/capstone-arm.min.js"]');
      if (existingScript) {
        if (window.cs) {
          resolve();
          return;
        }
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load capstone.js')));
        return;
      }

      const script = document.createElement('script');
      script.src = '/arm/capstone-arm.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load capstone.js'));
      document.head.appendChild(script);
    });
  }
}

// Utility functions
export const createDisassembler = (options?: DisassemblerOptions): ARMDisassembler => {
  return new ARMDisassembler(options);
};

export const disassembleCode = async (
  bytes: Uint8Array | number[],
  address?: number,
  options?: DisassemblerOptions
): Promise<DisassemblyResult[]> => {
  const disassembler = createDisassembler(options);
  try {
    return await disassembler.disassemble(bytes, address);
  } finally {
    disassembler.destroy();
  }
};

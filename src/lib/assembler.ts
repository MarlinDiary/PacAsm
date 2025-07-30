// TypeScript wrapper for keystone.js ARM assembler

// Type definitions for keystone.js
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
  asm(assembly: string, address?: number): Uint8Array;
  close(): void;
}

interface AssemblyResult {
  failed: boolean;
  count: number;
  mc: Uint8Array;
}

export interface AssemblerOptions {
  baseAddress?: number;
}

export class ARMAssembler {
  private keystone: KeystoneInstance | null = null;
  private isInitialized = false;

  constructor(private options: AssemblerOptions = {}) {
    this.options = {
      baseAddress: 0x1000,
      ...options,
    };
  }

  /**
   * Initialize the assembler by loading the keystone.js library
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.keystone) {
      return;
    }

    try {
      // Load keystone.js script if not already loaded
      if (!window.ks) {
        await this.loadKeystoneScript();
      }

      // Wait for library to be fully loaded
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!window.ks || !window.ks.Keystone) {
        throw new Error('Keystone library not properly loaded');
      }

      // Create keystone instance for ARM 32-bit
      this.keystone = new window.ks.Keystone(window.ks.ARCH_ARM, window.ks.MODE_ARM);
      
      if (!this.keystone) {
        throw new Error('Failed to create Keystone instance');
      }

      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize ARM assembler: ${error}`);
    }
  }

  /**
   * Assemble ARM assembly code to machine code
   */
  async assemble(assembly: string, address?: number): Promise<AssemblyResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.keystone) {
      throw new Error('Assembler not properly initialized');
    }

    try {
      const baseAddr = address ?? this.options.baseAddress ?? 0x1000;
      
      // Validate input
      if (!assembly || typeof assembly !== 'string') {
        throw new Error('Invalid assembly code: must be a non-empty string');
      }
      
      // Clean up the assembly code - remove empty lines and comments
      const cleanAssembly = assembly
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith(';') && !line.startsWith('//'))
        .join('\n');

      if (!cleanAssembly) {
        throw new Error('No valid assembly instructions found');
      }

      const result = this.keystone.asm(cleanAssembly, baseAddr);
      
      // keystone.js returns Uint8Array directly
      if (!(result instanceof Uint8Array)) {
        throw new Error('Invalid assembly result format');
      }

      return {
        failed: false,
        count: cleanAssembly.split('\n').length,
        mc: result
      };
    } catch (error) {
      throw new Error(`Assembly error: ${error}`);
    }
  }

  /**
   * Convert machine code bytes to hex string
   */
  bytesToHex(bytes: Uint8Array): string {
    if (!bytes || !(bytes instanceof Uint8Array)) {
      return '';
    }
    return Array.from(bytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join(' ');
  }

  /**
   * Get assembly statistics
   */
  getStats(result: AssemblyResult): { instructionCount: number; byteCount: number } {
    if (!result || !result.mc) {
      return {
        instructionCount: 0,
        byteCount: 0,
      };
    }
    
    return {
      instructionCount: result.count || 0,
      byteCount: result.mc.length || 0,
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.keystone && this.isInitialized) {
      try {
        this.keystone.close();
      } catch (error) {
        // Ignore close errors
        console.warn('Warning during keystone cleanup:', error);
      }
      this.keystone = null;
    }
    this.isInitialized = false;
  }

  private async loadKeystoneScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script is already loading or loaded
      const existingScript = document.querySelector('script[src="/arm/keystone-arm.min.js"]');
      if (existingScript) {
        if (window.ks) {
          resolve();
          return;
        }
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load keystone.js')));
        return;
      }

      const script = document.createElement('script');
      script.src = '/arm/keystone-arm.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load keystone.js'));
      document.head.appendChild(script);
    });
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
    return await assembler.assemble(assembly);
  } finally {
    assembler.destroy();
  }
};

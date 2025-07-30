// TypeScript wrapper for ARM CPU emulation using Unicorn.js

export interface EmulatorOptions {
  codeAddress?: number;
  stackAddress?: number;
  stackSize?: number;
}

export interface RegisterState {
  register: string;
  value: number;
  hex: string;
}

export interface MemoryData {
  address: number;
  size: number;
  data: number[];
  hex: string;
}

export interface StepResult {
  success: boolean;
  message: string;
  pc: number;
  instruction?: {
    address: number;
    bytes: number[];
    hex: string;
  };
  registers?: RegisterState[];
}

export interface EmulationResult {
  success: boolean;
  message: string;
  registers?: RegisterState[];
  memory?: MemoryData;
}

interface WorkerMessage {
  type: 'init' | 'load-code' | 'set-register' | 'get-register' | 'step' | 'step-debug' | 'run' | 'stop' | 'reset' | 'get-memory';
  payload?: any;
  messageId?: string;
}

interface WorkerResponse {
  type: 'success' | 'error' | 'register-value' | 'memory-data' | 'execution-complete' | 'step-result';
  payload?: any;
  messageId?: string;
}

export class ARMEmulator {
  private worker: Worker | null = null;
  private isInitialized = false;
  private messageHandlers: Map<string, (response: WorkerResponse) => void> = new Map();
  private messageId = 0;

  constructor(private options: EmulatorOptions = {}) {
    this.options = {
      codeAddress: 0x10000,
      stackAddress: 0x20000,
      stackSize: 4096,
      ...options,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const workerUrl = new URL('../workers/emulator.worker.ts', import.meta.url);
      this.worker = new Worker(workerUrl, { type: 'module' });
      
      this.worker.onmessage = (event) => {
        this.handleWorkerMessage(event.data);
      };

      await this.sendMessage('init');
      this.isInitialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize ARM emulator: ${error}`);
    }
  }

  async loadCode(machineCode: Uint8Array | number[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const codeArray = machineCode instanceof Uint8Array ? Array.from(machineCode) : machineCode;
    await this.sendMessage('load-code', codeArray);
  }

  async setRegister(register: string, value: number): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Emulator not initialized');
    }

    await this.sendMessage('set-register', { register, value });
  }

  async getRegister(register: string): Promise<RegisterState> {
    if (!this.isInitialized) {
      throw new Error('Emulator not initialized');
    }

    const response = await this.sendMessage('get-register', register);
    
    if (response.type !== 'register-value') {
      throw new Error(`Unexpected response type: ${response.type}`);
    }
    
    const payload = response.payload as RegisterState;
    if (!payload || typeof payload.register !== 'string') {
      throw new Error(`Invalid register data for ${register}`);
    }
    
    return payload;
  }

  async getAllRegisters(): Promise<RegisterState[]> {
    const registers = ['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9', 'r10', 'r11', 'r12', 'sp', 'lr', 'pc', 'cpsr'];
    const results: RegisterState[] = [];
    
    for (const reg of registers) {
      try {
        const state = await this.getRegister(reg);
        results.push(state);
      } catch (error) {
        results.push({
          register: reg,
          value: 0,
          hex: '0x00000000'
        });
      }
    }

    return results;
  }

  async step(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Emulator not initialized');
    }

    await this.sendMessage('step');
  }

  async stepDebug(): Promise<StepResult> {
    if (!this.isInitialized) {
      throw new Error('Emulator not initialized');
    }

    const response = await this.sendMessage('step-debug');
    
    if (response.type !== 'step-result') {
      throw new Error(`Unexpected response type: ${response.type}`);
    }
    
    return response.payload as StepResult;
  }

  async run(instructionCount?: number): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Emulator not initialized');
    }

    await this.sendMessage('run', { instructionCount });
  }

  async readMemory(address: number, size: number): Promise<MemoryData> {
    if (!this.isInitialized) {
      throw new Error('Emulator not initialized');
    }

    const response = await this.sendMessage('get-memory', { address, size });
    return response.payload as MemoryData;
  }

  async reset(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Emulator not initialized');
    }

    await this.sendMessage('reset');
  }

  async getEmulationResult(): Promise<EmulationResult> {
    try {
      const registers = await this.getAllRegisters();
      const memory = await this.readMemory(this.options.codeAddress || 0x10000, 64);

      return {
        success: true,
        message: 'Emulation state retrieved successfully',
        registers,
        memory
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get emulation result: ${error}`
      };
    }
  }

  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
    this.messageHandlers.clear();
  }

  private sendMessage(type: string, payload?: any): Promise<WorkerResponse> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const messageId = (this.messageId++).toString();
      
      const timeout = setTimeout(() => {
        this.messageHandlers.delete(messageId);
        reject(new Error('Worker message timeout'));
      }, 10000);

      this.messageHandlers.set(messageId, (response: WorkerResponse) => {
        clearTimeout(timeout);
        this.messageHandlers.delete(messageId);
        
        if (response.type === 'error') {
          reject(new Error(response.payload));
        } else {
          resolve(response);
        }
      });

      const message: WorkerMessage = { type: type as any, payload, messageId };
      this.worker.postMessage(message);
    });
  }

  private handleWorkerMessage(response: WorkerResponse): void {
    if (response.messageId) {
      const handler = this.messageHandlers.get(response.messageId);
      if (handler) {
        handler(response);
      }
      return;
    }
    
    // Fallback for broadcast messages
    const handler = this.messageHandlers.values().next().value;
    if (handler) {
      handler(response);
    }
  }
}

// Utility functions
export const createEmulator = (options?: EmulatorOptions): ARMEmulator => {
  return new ARMEmulator(options);
};

export const emulateCode = async (
  machineCode: Uint8Array | number[],
  options?: EmulatorOptions
): Promise<EmulationResult> => {
  const emulator = createEmulator(options);
  try {
    await emulator.initialize();
    await emulator.loadCode(machineCode);
    await emulator.run();
    return await emulator.getEmulationResult();
  } finally {
    emulator.destroy();
  }
};

// Helper function to format register display
export const formatRegisters = (registers: RegisterState[]): string => {
  if (!registers || !Array.isArray(registers)) {
    return 'Error: Invalid registers data';
  }
  
  return registers
    .map(reg => {
      if (!reg || typeof reg.register !== 'string') {
        return 'INVALID: 0x00000000';
      }
      return `${reg.register.toUpperCase().padEnd(4)}: ${reg.hex || '0x00000000'}`;
    })
    .join('\n');
};

// Helper function to format memory display
export const formatMemory = (memory: MemoryData): string => {
  const lines: string[] = [];
  const bytes = memory.data;
  
  for (let i = 0; i < bytes.length; i += 16) {
    const addr = `0x${(memory.address + i).toString(16).padStart(8, '0')}`;
    const chunk = bytes.slice(i, i + 16);
    const hex = chunk.map(b => b.toString(16).padStart(2, '0')).join(' ').padEnd(47);
    const ascii = chunk.map(b => (b >= 32 && b <= 126) ? String.fromCharCode(b) : '.').join('');
    lines.push(`${addr}: ${hex} |${ascii}|`);
  }
  
  return lines.join('\n');
};

// Helper function to format step result
export const formatStepResult = (stepResult: StepResult): string => {
  const lines: string[] = [];
  
  lines.push(`Status: ${stepResult.success ? '✅ Success' : '❌ Failed'}`);
  lines.push(`Message: ${stepResult.message}`);
  lines.push(`PC: 0x${stepResult.pc.toString(16).padStart(8, '0')}`);
  
  if (stepResult.instruction) {
    const inst = stepResult.instruction;
    lines.push(`Instruction @ 0x${inst.address.toString(16).padStart(8, '0')}: ${inst.hex}`);
    lines.push(`Bytes: [${inst.bytes.map(b => `0x${b.toString(16).padStart(2, '0')}`).join(', ')}]`);
  }
  
  if (stepResult.registers && stepResult.registers.length > 0) {
    lines.push('\nChanged Registers:');
    lines.push(formatRegisters(stepResult.registers));
  }
  
  return lines.join('\n');
}; 
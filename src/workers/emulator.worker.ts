// Web Worker for ARM CPU emulation using Unicorn.js
// This runs in a separate thread to avoid blocking the UI

declare function importScripts(...urls: string[]): void;

// Define types for Unicorn.js global object
interface UnicornGlobal {
  Unicorn: new (arch: number, mode: number) => UnicornInstance;
  ARCH_ARM: number;
  MODE_ARM: number;
  PROT_ALL: number;
  PROT_READ: number;
  PROT_WRITE: number;
  ARM_REG_R0: number;
  ARM_REG_R1: number;
  ARM_REG_R2: number;
  ARM_REG_R3: number;
  ARM_REG_R4: number;
  ARM_REG_R5: number;
  ARM_REG_R6: number;
  ARM_REG_R7: number;
  ARM_REG_R8: number;
  ARM_REG_R9: number;
  ARM_REG_R10: number;
  ARM_REG_R11: number;
  ARM_REG_R12: number;
  ARM_REG_SP: number;
  ARM_REG_LR: number;
  ARM_REG_PC: number;
  ARM_REG_CPSR: number;
}

interface UnicornInstance {
  reg_write_i32(reg: number, value: number): void;
  reg_read_i32(reg: number): number;
  mem_map(address: number, size: number, perms: number): void;
  mem_write(address: number, data: number[] | Uint8Array): void;
  mem_read(address: number, size: number): Uint8Array;
  emu_start(begin: number, until: number, timeout: number, count: number): void;
  emu_stop(): void;
  close(): void;
}

interface EmulatorMessage {
  type: 'init' | 'load-code' | 'set-register' | 'get-register' | 'step' | 'step-debug' | 'run' | 'stop' | 'reset' | 'get-memory';
  payload?: {
    register?: string;
    value?: number;
    address?: number;
    size?: number;
    instructionCount?: number;
  } | number[] | string;
  messageId?: string;
}

interface RegisterInfo {
  register: string;
  value: number;
  hex: string;
}

interface StepResult {
  success: boolean;
  message: string;
  pc: number;
  instruction?: {
    address: number;
    bytes: number[];
    hex: string;
  };
  registers?: RegisterInfo[];
}

interface EmulatorResponse {
  type: 'success' | 'error' | 'register-value' | 'memory-data' | 'execution-complete' | 'step-result';
  payload?: string | RegisterInfo | { address: number; size: number; data: number[]; hex: string } | StepResult;
  messageId?: string;
}

// Type for the global self with uc property
interface WorkerSelf {
  uc?: UnicornGlobal;
  location: Location;
  postMessage: (message: EmulatorResponse) => void;
  addEventListener: (type: string, listener: (event: MessageEvent) => void) => void;
}

// Cast self to our extended type
const workerSelf = self as unknown as WorkerSelf;

class EmulatorWorker {
  private unicorn: UnicornInstance | null = null;
  private isInitialized = false;
  private codeAddress = 0x10000;
  private stackAddress = 0x20000;
  private stackSize = 8192;
  private dataAddress = 0x30000;
  private dataSize = 8192;
  private currentMessageId: string | undefined;

  constructor() {
    this.loadUnicornScript();
  }

  private async loadUnicornScript(): Promise<void> {
    try {
      const baseUrl = workerSelf.location.origin;
      importScripts(`${baseUrl}/arm/unicorn-arm.min.js`);
      
      await new Promise<void>((resolve) => {
        const checkUnicorn = () => {
          if (typeof workerSelf.uc !== 'undefined') {
            resolve();
          } else {
            setTimeout(checkUnicorn, 10);
          }
        };
        checkUnicorn();
      });

      this.postMessage({
        type: 'success',
        payload: 'Unicorn.js loaded successfully'
      });
    } catch (error) {
      this.postMessage({
        type: 'error',
        payload: `Failed to load Unicorn.js: ${error}`
      });
    }
  }

  private initialize(): void {
    try {
      if (typeof workerSelf.uc === 'undefined') {
        throw new Error('Unicorn.js not loaded');
      }

      const uc = workerSelf.uc;
      this.unicorn = new uc.Unicorn(uc.ARCH_ARM, uc.MODE_ARM);
      
      // Map memory regions
      this.unicorn!.mem_map(this.codeAddress, 16384, uc.PROT_ALL);
      this.unicorn!.mem_map(this.stackAddress, this.stackSize, uc.PROT_READ | uc.PROT_WRITE);
      this.unicorn!.mem_map(this.dataAddress, this.dataSize, uc.PROT_READ | uc.PROT_WRITE);
      
      // Initialize test data in data memory
      const testData = new Array(32).fill(0).map((_, i) => i * 4);
      this.unicorn!.mem_write(this.dataAddress, testData);
      
      // Initialize registers
      this.unicorn!.reg_write_i32(uc.ARM_REG_SP, this.stackAddress + this.stackSize - 4);
      
      // Clear all general-purpose registers to 0
      const gpRegisters = [
        uc.ARM_REG_R0, uc.ARM_REG_R1, uc.ARM_REG_R2, uc.ARM_REG_R3,
        uc.ARM_REG_R4, uc.ARM_REG_R5, uc.ARM_REG_R6, uc.ARM_REG_R7,
        uc.ARM_REG_R8, uc.ARM_REG_R9, uc.ARM_REG_R10, uc.ARM_REG_R11,
        uc.ARM_REG_R12, uc.ARM_REG_LR
      ];
      
      gpRegisters.forEach(reg => {
        this.unicorn!.reg_write_i32(reg, 0);
      });

      this.isInitialized = true;

      this.postMessage({
        type: 'success',
        payload: 'Emulator initialized'
      });
    } catch (error) {
      this.postMessage({
        type: 'error',
        payload: `Failed to initialize emulator: ${error}`
      });
    }
  }

  private loadCode(machineCode: number[]): void {
    try {
      if (!this.unicorn || !this.isInitialized) {
        throw new Error('Emulator not initialized');
      }

      const uc = workerSelf.uc!;
      this.unicorn.mem_write(this.codeAddress, machineCode);
      this.unicorn.reg_write_i32(uc.ARM_REG_PC, this.codeAddress);

      this.postMessage({
        type: 'success',
        payload: `Loaded ${machineCode.length} bytes of code`
      });
    } catch (error) {
      this.postMessage({
        type: 'error',
        payload: `Failed to load code: ${error}`
      });
    }
  }

  private setRegister(register: string, value: number): void {
    try {
      if (!this.unicorn || !this.isInitialized) {
        throw new Error('Emulator not initialized');
      }

      const uc = workerSelf.uc!;
      const regMap: { [key: string]: number } = {
        'r0': uc.ARM_REG_R0, 'r1': uc.ARM_REG_R1, 'r2': uc.ARM_REG_R2, 'r3': uc.ARM_REG_R3,
        'r4': uc.ARM_REG_R4, 'r5': uc.ARM_REG_R5, 'r6': uc.ARM_REG_R6, 'r7': uc.ARM_REG_R7,
        'r8': uc.ARM_REG_R8, 'r9': uc.ARM_REG_R9, 'r10': uc.ARM_REG_R10, 'r11': uc.ARM_REG_R11,
        'r12': uc.ARM_REG_R12, 'sp': uc.ARM_REG_SP, 'lr': uc.ARM_REG_LR, 'pc': uc.ARM_REG_PC,
        'cpsr': uc.ARM_REG_CPSR,
      };

      const regId = regMap[register.toLowerCase()];
      if (regId === undefined) {
        throw new Error(`Unknown register: ${register}`);
      }

      this.unicorn.reg_write_i32(regId, value);

      this.postMessage({
        type: 'success',
        payload: `Set ${register} = 0x${value.toString(16).padStart(8, '0')}`
      });
    } catch (error) {
      this.postMessage({
        type: 'error',
        payload: `Failed to set register: ${error}`
      });
    }
  }

  private getRegister(register: string): void {
    try {
      if (!this.unicorn || !this.isInitialized) {
        throw new Error('Emulator not initialized');
      }

      const uc = workerSelf.uc!;
      const regMap: { [key: string]: number } = {
        'r0': uc.ARM_REG_R0, 'r1': uc.ARM_REG_R1, 'r2': uc.ARM_REG_R2, 'r3': uc.ARM_REG_R3,
        'r4': uc.ARM_REG_R4, 'r5': uc.ARM_REG_R5, 'r6': uc.ARM_REG_R6, 'r7': uc.ARM_REG_R7,
        'r8': uc.ARM_REG_R8, 'r9': uc.ARM_REG_R9, 'r10': uc.ARM_REG_R10, 'r11': uc.ARM_REG_R11,
        'r12': uc.ARM_REG_R12, 'sp': uc.ARM_REG_SP, 'lr': uc.ARM_REG_LR, 'pc': uc.ARM_REG_PC,
        'cpsr': uc.ARM_REG_CPSR,
      };

      const regId = regMap[register.toLowerCase()];
      if (regId === undefined) {
        throw new Error(`Unknown register: ${register}`);
      }

      const value = this.unicorn.reg_read_i32(regId);

      this.postMessage({
        type: 'register-value',
        payload: {
          register,
          value,
          hex: `0x${value.toString(16).padStart(8, '0')}`
        }
      });
    } catch (error) {
      this.postMessage({
        type: 'error',
        payload: `Failed to get register: ${error}`
      });
    }
  }

  private getAllRegisters(): RegisterInfo[] {
    if (!this.unicorn || !this.isInitialized) {
      return [];
    }

    const uc = workerSelf.uc!;
    const registers = [
      { name: 'r0', id: uc.ARM_REG_R0 }, { name: 'r1', id: uc.ARM_REG_R1 },
      { name: 'r2', id: uc.ARM_REG_R2 }, { name: 'r3', id: uc.ARM_REG_R3 },
      { name: 'r4', id: uc.ARM_REG_R4 }, { name: 'r5', id: uc.ARM_REG_R5 },
      { name: 'r6', id: uc.ARM_REG_R6 }, { name: 'r7', id: uc.ARM_REG_R7 },
      { name: 'r8', id: uc.ARM_REG_R8 }, { name: 'r9', id: uc.ARM_REG_R9 },
      { name: 'r10', id: uc.ARM_REG_R10 }, { name: 'r11', id: uc.ARM_REG_R11 },
      { name: 'r12', id: uc.ARM_REG_R12 }, { name: 'sp', id: uc.ARM_REG_SP },
      { name: 'lr', id: uc.ARM_REG_LR }, { name: 'pc', id: uc.ARM_REG_PC },
      { name: 'cpsr', id: uc.ARM_REG_CPSR }
    ];

    return registers.map(reg => ({
      register: reg.name,
      value: this.unicorn!.reg_read_i32(reg.id),
      hex: `0x${this.unicorn!.reg_read_i32(reg.id).toString(16).padStart(8, '0')}`
    }));
  }

  private stepExecution(): void {
    try {
      if (!this.unicorn || !this.isInitialized) {
        throw new Error('Emulator not initialized');
      }

      const uc = workerSelf.uc!;
      const pc = this.unicorn.reg_read_i32(uc.ARM_REG_PC);
      const endAddress = this.codeAddress + 16384;
      this.unicorn.emu_start(pc, endAddress, 0, 1);

      this.postMessage({
        type: 'execution-complete',
        payload: 'Step completed'
      });
    } catch (error) {
      this.postMessage({
        type: 'error',
        payload: `Execution failed: ${error}`
      });
    }
  }

  private stepDebugExecution(): void {
    try {
      if (!this.unicorn || !this.isInitialized) {
        throw new Error('Emulator not initialized');
      }

      const uc = workerSelf.uc!;
      
      // Get state before execution
      const pcBefore = this.unicorn.reg_read_i32(uc.ARM_REG_PC);
      const registersBefore = this.getAllRegisters();
      
      // Read the instruction at current PC
      let instructionBytes: number[] = [];
      let instructionHex = '';
      
      try {
        instructionBytes = Array.from(this.unicorn.mem_read(pcBefore, 4));
        instructionHex = instructionBytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
      } catch {
        instructionHex = 'INVALID';
      }
      
      // Execute one instruction
      const endAddress = this.codeAddress + 16384;
      this.unicorn.emu_start(pcBefore, endAddress, 0, 1);
      
      // Get state after execution
      const pcAfter = this.unicorn.reg_read_i32(uc.ARM_REG_PC);
      const registersAfter = this.getAllRegisters();
      
      // Find changed registers
      const changedRegisters = registersAfter.filter((regAfter, index) => {
        const regBefore = registersBefore[index];
        return regAfter.value !== regBefore.value;
      });

      this.postMessage({
        type: 'step-result',
        payload: {
          success: true,
          message: 'Step executed successfully',
          pc: pcAfter,
          instruction: {
            address: pcBefore,
            bytes: instructionBytes,
            hex: instructionHex.toUpperCase()
          },
          registers: changedRegisters.length > 0 ? changedRegisters : undefined
        }
      });
    } catch (error) {
      this.postMessage({
        type: 'step-result',
        payload: {
          success: false,
          message: `Step execution failed: ${error}`,
          pc: 0
        }
      });
    }
  }

  private runExecution(instructionCount?: number): void {
    try {
      if (!this.unicorn || !this.isInitialized) {
        throw new Error('Emulator not initialized');
      }

      const uc = workerSelf.uc!;
      const pc = this.unicorn.reg_read_i32(uc.ARM_REG_PC);
      const endAddress = this.codeAddress + 16384;

      this.unicorn.emu_start(pc, endAddress, 0, instructionCount || 0);

      this.postMessage({
        type: 'execution-complete',
        payload: 'Execution completed'
      });
    } catch (error) {
      this.postMessage({
        type: 'error',
        payload: `Execution failed: ${error}`
      });
    }
  }

  private getMemory(address: number, size: number): void {
    try {
      if (!this.unicorn || !this.isInitialized) {
        throw new Error('Emulator not initialized');
      }

      const data = this.unicorn.mem_read(address, size);

      this.postMessage({
        type: 'memory-data',
        payload: {
          address,
          size,
          data: Array.from(data),
          hex: Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ')
        }
      });
    } catch (error) {
      this.postMessage({
        type: 'error',
        payload: `Failed to read memory: ${error}`
      });
    }
  }

  private reset(): void {
    try {
      if (this.unicorn && this.isInitialized) {
        const uc = workerSelf.uc!;
        
        // Clear all general-purpose registers to 0
        const gpRegisters = [
          uc.ARM_REG_R0, uc.ARM_REG_R1, uc.ARM_REG_R2, uc.ARM_REG_R3,
          uc.ARM_REG_R4, uc.ARM_REG_R5, uc.ARM_REG_R6, uc.ARM_REG_R7,
          uc.ARM_REG_R8, uc.ARM_REG_R9, uc.ARM_REG_R10, uc.ARM_REG_R11,
          uc.ARM_REG_R12, uc.ARM_REG_LR
        ];

        gpRegisters.forEach(reg => {
          this.unicorn!.reg_write_i32(reg, 0);
        });

        // Reset PC and SP
        this.unicorn.reg_write_i32(uc.ARM_REG_PC, this.codeAddress);
        this.unicorn.reg_write_i32(uc.ARM_REG_SP, this.stackAddress + this.stackSize - 4);

        this.postMessage({
          type: 'success',
          payload: 'Emulator reset'
        });
      }
    } catch (error) {
      this.postMessage({
        type: 'error',
        payload: `Failed to reset emulator: ${error}`
      });
    }
  }

  private postMessage(response: EmulatorResponse): void {
    if (this.currentMessageId) {
      response.messageId = this.currentMessageId;
    }
    workerSelf.postMessage(response);
  }

  public handleMessage(message: EmulatorMessage): void {
    this.currentMessageId = message.messageId;
    
    switch (message.type) {
      case 'init':
        this.initialize();
        break;
      case 'load-code':
        this.loadCode(message.payload as number[]);
        break;
      case 'set-register':
        if (typeof message.payload === 'object' && message.payload && 'register' in message.payload && 'value' in message.payload) {
          this.setRegister(message.payload.register!, message.payload.value!);
        }
        break;
      case 'get-register':
        this.getRegister(message.payload as string);
        break;
      case 'step':
        this.stepExecution();
        break;
      case 'step-debug':
        this.stepDebugExecution();
        break;
      case 'run':
        if (typeof message.payload === 'object' && message.payload && 'instructionCount' in message.payload) {
          this.runExecution(message.payload.instructionCount);
        } else {
          this.runExecution();
        }
        break;
      case 'get-memory':
        if (typeof message.payload === 'object' && message.payload && 'address' in message.payload && 'size' in message.payload) {
          this.getMemory(message.payload.address!, message.payload.size!);
        }
        break;
      case 'reset':
        this.reset();
        break;
      default:
        this.postMessage({
          type: 'error',
          payload: `Unknown message type: ${message.type}`
        });
    }
  }
}

// Initialize worker
const worker = new EmulatorWorker();

// Handle messages from main thread
workerSelf.addEventListener('message', (event) => {
  worker.handleMessage(event.data);
}); 
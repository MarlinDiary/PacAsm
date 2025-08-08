// Type definitions for ARM CPU emulator

export interface UnicornGlobal {
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

export interface UnicornInstance {
  reg_write_i32(reg: number, value: number): void;
  reg_read_i32(reg: number): number;
  mem_map(address: number, size: number, perms: number): void;
  mem_write(address: number, data: number[] | Uint8Array): void;
  mem_read(address: number, size: number): Uint8Array;
  emu_start(begin: number, until: number, timeout: number, count: number): void;
  emu_stop(): void;
  close(): void;
}

export interface EmulatorMessage {
  type: 'init' | 'load-code' | 'set-register' | 'get-register' | 'get-all-registers' | 'step' | 'step-debug' | 'run' | 'stop' | 'reset' | 'get-memory' | 'write-memory';
  payload?: {
    register?: string;
    value?: number;
    address?: number;
    size?: number;
    instructionCount?: number;
    data?: number[];
  } | number[] | string;
  messageId?: string;
}

export interface RegisterInfo {
  register: string;
  value: number;
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
  registers?: RegisterInfo[];
}

export interface EmulatorResponse {
  type: 'success' | 'error' | 'register-value' | 'registers-data' | 'memory-data' | 'execution-complete' | 'step-result';
  payload?: string | RegisterInfo | RegisterInfo[] | { address: number; size: number; data: number[]; hex: string } | StepResult | { message: string; executedInstructions: number };
  messageId?: string;
}

export interface WorkerSelf {
  uc?: UnicornGlobal;
  location: Location;
  postMessage: (message: EmulatorResponse) => void;
  addEventListener: (type: string, listener: (event: MessageEvent) => void) => void;
}

export interface EmulatorConfig {
  codeAddress: number;
  stackAddress: number;
  stackSize: number;
  dataAddress: number;
  dataSize: number;
}
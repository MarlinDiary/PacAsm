// Memory and register management

import { UnicornInstance, UnicornGlobal, RegisterInfo, EmulatorConfig } from './types';

export class MemoryManager {
  private unicorn: UnicornInstance;
  private uc: UnicornGlobal;
  private config: EmulatorConfig;

  constructor(unicorn: UnicornInstance, uc: UnicornGlobal, config: EmulatorConfig) {
    this.unicorn = unicorn;
    this.uc = uc;
    this.config = config;
  }

  initializeMemory(): void {
    // Map memory regions
    this.unicorn.mem_map(this.config.codeAddress, 4096, this.uc.PROT_ALL);
    this.unicorn.mem_map(this.config.stackAddress, this.config.stackSize, this.uc.PROT_READ | this.uc.PROT_WRITE);
    this.unicorn.mem_map(this.config.dataAddress, this.config.dataSize, this.uc.PROT_READ | this.uc.PROT_WRITE);
    
    // Initialize test data in data memory
    const testData = new Array(32).fill(0).map((_, i) => i * 4);
    this.unicorn.mem_write(this.config.dataAddress, testData);
  }

  initializeRegisters(): void {
    // Initialize stack pointer
    this.unicorn.reg_write_i32(this.uc.ARM_REG_SP, this.config.stackAddress + this.config.stackSize - 4);
    
    // Clear all general-purpose registers to 0
    const gpRegisters = [
      this.uc.ARM_REG_R0, this.uc.ARM_REG_R1, this.uc.ARM_REG_R2, this.uc.ARM_REG_R3,
      this.uc.ARM_REG_R4, this.uc.ARM_REG_R5, this.uc.ARM_REG_R6, this.uc.ARM_REG_R7,
      this.uc.ARM_REG_R8, this.uc.ARM_REG_R9, this.uc.ARM_REG_R10, this.uc.ARM_REG_R11,
      this.uc.ARM_REG_R12, this.uc.ARM_REG_LR
    ];
    
    gpRegisters.forEach(reg => {
      this.unicorn.reg_write_i32(reg, 0);
    });
  }

  loadCode(machineCode: number[]): void {
    this.unicorn.mem_write(this.config.codeAddress, machineCode);
    this.unicorn.reg_write_i32(this.uc.ARM_REG_PC, this.config.codeAddress);
  }

  setRegister(register: string, value: number): void {
    const regMap: { [key: string]: number } = {
      'r0': this.uc.ARM_REG_R0, 'r1': this.uc.ARM_REG_R1, 'r2': this.uc.ARM_REG_R2, 'r3': this.uc.ARM_REG_R3,
      'r4': this.uc.ARM_REG_R4, 'r5': this.uc.ARM_REG_R5, 'r6': this.uc.ARM_REG_R6, 'r7': this.uc.ARM_REG_R7,
      'r8': this.uc.ARM_REG_R8, 'r9': this.uc.ARM_REG_R9, 'r10': this.uc.ARM_REG_R10, 'r11': this.uc.ARM_REG_R11,
      'r12': this.uc.ARM_REG_R12, 'sp': this.uc.ARM_REG_SP, 'lr': this.uc.ARM_REG_LR, 'pc': this.uc.ARM_REG_PC,
      'cpsr': this.uc.ARM_REG_CPSR,
    };

    const regId = regMap[register.toLowerCase()];
    if (regId === undefined) {
      throw new Error(`Unknown register: ${register}`);
    }

    this.unicorn.reg_write_i32(regId, value);
  }

  getRegister(register: string): RegisterInfo {
    const regMap: { [key: string]: number } = {
      'r0': this.uc.ARM_REG_R0, 'r1': this.uc.ARM_REG_R1, 'r2': this.uc.ARM_REG_R2, 'r3': this.uc.ARM_REG_R3,
      'r4': this.uc.ARM_REG_R4, 'r5': this.uc.ARM_REG_R5, 'r6': this.uc.ARM_REG_R6, 'r7': this.uc.ARM_REG_R7,
      'r8': this.uc.ARM_REG_R8, 'r9': this.uc.ARM_REG_R9, 'r10': this.uc.ARM_REG_R10, 'r11': this.uc.ARM_REG_R11,
      'r12': this.uc.ARM_REG_R12, 'sp': this.uc.ARM_REG_SP, 'lr': this.uc.ARM_REG_LR, 'pc': this.uc.ARM_REG_PC,
      'cpsr': this.uc.ARM_REG_CPSR,
    };

    const regId = regMap[register.toLowerCase()];
    if (regId === undefined) {
      throw new Error(`Unknown register: ${register}`);
    }

    const value = this.unicorn.reg_read_i32(regId);
    return {
      register,
      value,
      hex: `0x${value.toString(16).padStart(8, '0')}`
    };
  }

  getAllRegisters(): RegisterInfo[] {
    const registers = [
      { name: 'r0', id: this.uc.ARM_REG_R0 }, { name: 'r1', id: this.uc.ARM_REG_R1 },
      { name: 'r2', id: this.uc.ARM_REG_R2 }, { name: 'r3', id: this.uc.ARM_REG_R3 },
      { name: 'r4', id: this.uc.ARM_REG_R4 }, { name: 'r5', id: this.uc.ARM_REG_R5 },
      { name: 'r6', id: this.uc.ARM_REG_R6 }, { name: 'r7', id: this.uc.ARM_REG_R7 },
      { name: 'r8', id: this.uc.ARM_REG_R8 }, { name: 'r9', id: this.uc.ARM_REG_R9 },
      { name: 'r10', id: this.uc.ARM_REG_R10 }, { name: 'r11', id: this.uc.ARM_REG_R11 },
      { name: 'r12', id: this.uc.ARM_REG_R12 }, { name: 'sp', id: this.uc.ARM_REG_SP },
      { name: 'lr', id: this.uc.ARM_REG_LR }, { name: 'pc', id: this.uc.ARM_REG_PC },
      { name: 'cpsr', id: this.uc.ARM_REG_CPSR }
    ];

    return registers.map(reg => ({
      register: reg.name,
      value: this.unicorn.reg_read_i32(reg.id),
      hex: `0x${this.unicorn.reg_read_i32(reg.id).toString(16).padStart(8, '0')}`
    }));
  }

  readMemory(address: number, size: number): { address: number; size: number; data: number[]; hex: string } {
    const data = this.unicorn.mem_read(address, size);
    return {
      address,
      size,
      data: Array.from(data),
      hex: Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ')
    };
  }

  resetRegisters(): void {
    // Clear all general-purpose registers to 0
    const gpRegisters = [
      this.uc.ARM_REG_R0, this.uc.ARM_REG_R1, this.uc.ARM_REG_R2, this.uc.ARM_REG_R3,
      this.uc.ARM_REG_R4, this.uc.ARM_REG_R5, this.uc.ARM_REG_R6, this.uc.ARM_REG_R7,
      this.uc.ARM_REG_R8, this.uc.ARM_REG_R9, this.uc.ARM_REG_R10, this.uc.ARM_REG_R11,
      this.uc.ARM_REG_R12, this.uc.ARM_REG_LR
    ];

    gpRegisters.forEach(reg => {
      this.unicorn.reg_write_i32(reg, 0);
    });

    // Reset PC and SP
    this.unicorn.reg_write_i32(this.uc.ARM_REG_PC, this.config.codeAddress);
    this.unicorn.reg_write_i32(this.uc.ARM_REG_SP, this.config.stackAddress + this.config.stackSize - 4);
  }
}
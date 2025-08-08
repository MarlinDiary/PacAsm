// Execution engine for ARM instructions

import { UnicornInstance, UnicornGlobal, StepResult, EmulatorConfig } from './types';
import { LiteralPoolDetector } from './literal-pool';
import { MemoryManager } from './memory-manager';

export class ExecutionEngine {
  private unicorn: UnicornInstance;
  private uc: UnicornGlobal;
  private config: EmulatorConfig;
  private literalPoolDetector: LiteralPoolDetector;
  private memoryManager: MemoryManager;
  private literalPoolAddresses: Set<number> = new Set();

  constructor(
    unicorn: UnicornInstance,
    uc: UnicornGlobal,
    config: EmulatorConfig,
    literalPoolDetector: LiteralPoolDetector,
    memoryManager: MemoryManager
  ) {
    this.unicorn = unicorn;
    this.uc = uc;
    this.config = config;
    this.literalPoolDetector = literalPoolDetector;
    this.memoryManager = memoryManager;
  }

  stepExecution(): void {
    const pc = this.unicorn.reg_read_i32(this.uc.ARM_REG_PC);
    const endAddress = this.config.codeAddress + 4096;
    this.unicorn.emu_start(pc, endAddress, 0, 1);
  }

  stepDebugExecution(): StepResult {
    // Get state before execution
    const pcBefore = this.unicorn.reg_read_i32(this.uc.ARM_REG_PC);
    const registersBefore = this.memoryManager.getAllRegisters();
    
    // Read the instruction at current PC
    let instructionBytes: number[] = [];
    let instructionHex = '';
    let isLiteralPool = false;
    
    try {
      instructionBytes = Array.from(this.unicorn.mem_read(pcBefore, 4));
      instructionHex = instructionBytes.map(b => b.toString(16).padStart(2, '0')).join(' ');
      isLiteralPool = this.literalPoolDetector.isLikelyLiteralPool(instructionBytes);
    } catch {
      instructionHex = 'INVALID';
    }
    
    
    let pcAfter: number;
    let stepMessage = 'Step executed successfully';
    
    if (isLiteralPool) {
      const instruction = (instructionBytes[3] << 24) | (instructionBytes[2] << 16) | 
                         (instructionBytes[1] << 8) | instructionBytes[0];
      
      if (instruction === 0x00000000) {
        // Reached end of code (all zeros padding)
        return {
          success: true,
          message: 'Execution completed - reached end of code',
          pc: pcBefore,
          instruction: {
            address: pcBefore,
            bytes: instructionBytes,
            hex: instructionHex.toUpperCase() + ' (END OF CODE)'
          },
          registers: undefined
        };
      } else {
        // Skip over literal pool instead of executing it
        pcAfter = this.literalPoolDetector.findNextInstruction(pcBefore, this.unicorn);
        
        // Check if we found a valid next instruction
        if (pcAfter >= this.config.codeAddress + 4096) {
          return {
            success: true,
            message: 'Execution completed - no more instructions',
            pc: pcBefore,
            instruction: {
              address: pcBefore,
              bytes: instructionBytes,
              hex: instructionHex.toUpperCase() + ' (LITERAL POOL - END)'
            },
            registers: undefined
          };
        }
        
        this.unicorn.reg_write_i32(this.uc.ARM_REG_PC, pcAfter);
        stepMessage = 'Skipped literal pool data';
        
        // Mark this address as literal pool for future reference
        this.literalPoolAddresses.add(pcBefore);
      }
    } else {
      // Execute one instruction normally
      const endAddress = this.config.codeAddress + 4096;
      this.unicorn.emu_start(pcBefore, endAddress, 0, 1);
      pcAfter = this.unicorn.reg_read_i32(this.uc.ARM_REG_PC);
    }
    
    // Get state after execution
    const registersAfter = this.memoryManager.getAllRegisters();
    
    // Find changed registers
    const changedRegisters = registersAfter.filter((regAfter, index) => {
      const regBefore = registersBefore[index];
      return regAfter.value !== regBefore.value;
    });

    return {
      success: true,
      message: stepMessage,
      pc: pcAfter,
      instruction: {
        address: pcBefore,
        bytes: instructionBytes,
        hex: instructionHex.toUpperCase() + (isLiteralPool ? ' (LITERAL POOL)' : '')
      },
      registers: changedRegisters.length > 0 ? changedRegisters : undefined
    };
  }

  runExecution(instructionCount?: number): { message: string; executedInstructions: number } {
    const maxInstructions = instructionCount || 1000;
    let executedInstructions = 0;

    // Safe execution loop - check each instruction before executing
    while (executedInstructions < maxInstructions) {
      const pc = this.unicorn.reg_read_i32(this.uc.ARM_REG_PC);
      
      // Check if we've reached the end of code space
      if (pc >= this.config.codeAddress + 4096) {
        break;
      }
      
      // Read the instruction at current PC
      let instructionBytes: number[] = [];
      let isLiteralPool = false;
      
      try {
        instructionBytes = Array.from(this.unicorn.mem_read(pc, 4));
        isLiteralPool = this.literalPoolDetector.isLikelyLiteralPool(instructionBytes);
      } catch {
        break;
      }
      
      if (isLiteralPool) {
        const instruction = (instructionBytes[3] << 24) | (instructionBytes[2] << 16) | 
                           (instructionBytes[1] << 8) | instructionBytes[0];
        
        if (instruction === 0x00000000) {
          // Reached end of code (padding)
          break;
        } else {
          // Skip literal pool
          const nextPc = this.literalPoolDetector.findNextInstruction(pc, this.unicorn);
          if (nextPc >= this.config.codeAddress + 4096) {
            break;
          }
          
          this.unicorn.reg_write_i32(this.uc.ARM_REG_PC, nextPc);
          continue; // Don't count this as an executed instruction
        }
      } else {
        // Execute one instruction normally
        const endAddress = this.config.codeAddress + 4096;
        this.unicorn.emu_start(pc, endAddress, 0, 1);
        executedInstructions++;
        
        const newPc = this.unicorn.reg_read_i32(this.uc.ARM_REG_PC);
        
        // If PC didn't change, we might be stuck
        if (newPc === pc) {
          break;
        }
      }
    }

    return {
      message: `Execution completed. Instructions executed: ${executedInstructions}`,
      executedInstructions
    };
  }
}
// Core EmulatorWorker class

import { 
  UnicornInstance, 
  EmulatorMessage, 
  EmulatorResponse, 
  WorkerSelf,
  EmulatorConfig
} from './types';
import { UnicornLoader } from './unicorn-loader';
import { LiteralPoolDetector } from './literal-pool';
import { MemoryManager } from './memory-manager';
import { ExecutionEngine } from './execution';

export class EmulatorWorker {
  private unicorn: UnicornInstance | null = null;
  private isInitialized = false;
  private config: EmulatorConfig;
  private currentMessageId: string | undefined;
  
  // Module instances
  private unicornLoader: UnicornLoader;
  private literalPoolDetector: LiteralPoolDetector;
  private memoryManager: MemoryManager | null = null;
  private executionEngine: ExecutionEngine | null = null;

  constructor(private workerSelf: WorkerSelf) {
    this.config = {
      codeAddress: 0x10000,
      stackAddress: 0x20000,
      stackSize: 4096,
      dataAddress: 0x30000,
      dataSize: 4096
    };

    this.unicornLoader = new UnicornLoader(workerSelf);
    this.literalPoolDetector = new LiteralPoolDetector(this.config);
    
    this.loadUnicornScript();
  }

  private async loadUnicornScript(): Promise<void> {
    await this.unicornLoader.loadUnicornScript();
  }

  private initialize(): void {
    try {
      const uc = this.unicornLoader.getUnicorn();
      this.unicorn = new uc.Unicorn(uc.ARCH_ARM, uc.MODE_ARM);
      
      // Initialize managers
      this.memoryManager = new MemoryManager(this.unicorn, uc, this.config);
      this.executionEngine = new ExecutionEngine(
        this.unicorn, 
        uc, 
        this.config, 
        this.literalPoolDetector, 
        this.memoryManager
      );
      
      // Setup memory and registers
      this.memoryManager.initializeMemory();
      this.memoryManager.initializeRegisters();

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
      if (!this.memoryManager || !this.isInitialized) {
        throw new Error('Emulator not initialized');
      }

      this.memoryManager.loadCode(machineCode);

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
      if (!this.memoryManager || !this.isInitialized) {
        throw new Error('Emulator not initialized');
      }

      this.memoryManager.setRegister(register, value);

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
      if (!this.memoryManager || !this.isInitialized) {
        throw new Error('Emulator not initialized');
      }

      const registerInfo = this.memoryManager.getRegister(register);

      this.postMessage({
        type: 'register-value',
        payload: registerInfo
      });
    } catch (error) {
      this.postMessage({
        type: 'error',
        payload: `Failed to get register: ${error}`
      });
    }
  }

  private getAllRegisters(): void {
    try {
      if (!this.memoryManager || !this.isInitialized) {
        throw new Error('Emulator not initialized');
      }

      const allRegisters = this.memoryManager.getAllRegisters();

      this.postMessage({
        type: 'registers-data',
        payload: allRegisters
      });
    } catch (error) {
      this.postMessage({
        type: 'error',
        payload: `Failed to get all registers: ${error}`
      });
    }
  }

  private stepExecution(): void {
    try {
      if (!this.executionEngine || !this.isInitialized) {
        throw new Error('Emulator not initialized');
      }

      this.executionEngine.stepExecution();

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
      if (!this.executionEngine || !this.isInitialized) {
        throw new Error('Emulator not initialized');
      }

      const stepResult = this.executionEngine.stepDebugExecution();

      this.postMessage({
        type: 'step-result',
        payload: stepResult
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
      if (!this.executionEngine || !this.isInitialized) {
        throw new Error('Emulator not initialized');
      }

      const result = this.executionEngine.runExecution(instructionCount);

      this.postMessage({
        type: 'execution-complete',
        payload: result
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
      if (!this.memoryManager || !this.isInitialized) {
        throw new Error('Emulator not initialized');
      }

      const memoryData = this.memoryManager.readMemory(address, size);

      this.postMessage({
        type: 'memory-data',
        payload: memoryData
      });
    } catch (error) {
      this.postMessage({
        type: 'error',
        payload: `Failed to read memory: ${error}`
      });
    }
  }

  private writeMemory(address: number, data: number[]): void {
    try {
      if (!this.memoryManager || !this.isInitialized) {
        throw new Error('Emulator not initialized');
      }

      this.memoryManager.writeMemory(address, data);

      this.postMessage({
        type: 'success',
        payload: `Wrote ${data.length} bytes to address 0x${address.toString(16).padStart(8, '0')}`
      });
    } catch (error) {
      this.postMessage({
        type: 'error',
        payload: `Failed to write memory: ${error}`
      });
    }
  }

  private reset(): void {
    try {
      if (!this.memoryManager || !this.isInitialized) {
        throw new Error('Emulator not initialized');
      }

      this.memoryManager.resetRegisters();

      this.postMessage({
        type: 'success',
        payload: 'Emulator reset'
      });
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
    this.workerSelf.postMessage(response);
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
      case 'get-all-registers':
        this.getAllRegisters();
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
      case 'write-memory':
        if (typeof message.payload === 'object' && message.payload && 'address' in message.payload && 'data' in message.payload) {
          this.writeMemory(message.payload.address!, message.payload.data!);
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
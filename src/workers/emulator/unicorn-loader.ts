// Unicorn.js loader and initialization

import { WorkerSelf, UnicornGlobal, EmulatorResponse } from './types';

export class UnicornLoader {
  private workerSelf: WorkerSelf;

  constructor(workerSelf: WorkerSelf) {
    this.workerSelf = workerSelf;
  }

  async loadUnicornScript(): Promise<void> {
    try {
      const baseUrl = this.workerSelf.location.origin;
      (globalThis as unknown as { importScripts: (url: string) => void }).importScripts(`${baseUrl}/arm/unicorn-arm.min.js`);
      
      await new Promise<void>((resolve) => {
        const checkUnicorn = () => {
          if (typeof this.workerSelf.uc !== 'undefined') {
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
        payload: 'LOAD_ERROR: Failed to load Unicorn.js'
      });
      throw error;
    }
  }

  getUnicorn(): UnicornGlobal {
    if (typeof this.workerSelf.uc === 'undefined') {
      throw new Error('INIT_ERROR: Unicorn.js not loaded');
    }
    return this.workerSelf.uc;
  }

  private postMessage(response: Pick<EmulatorResponse, 'type' | 'payload'>): void {
    this.workerSelf.postMessage(response);
  }
}
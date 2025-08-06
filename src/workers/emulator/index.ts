// Web Worker entry point for ARM CPU emulation

import { EmulatorWorker } from './emulator-core';
import { WorkerSelf } from './types';

// Declare the importScripts function for worker context
declare function importScripts(...urls: string[]): void;

// Cast self to our extended type
const workerSelf = self as unknown as WorkerSelf;

// Initialize worker
const worker = new EmulatorWorker(workerSelf);

// Handle messages from main thread
workerSelf.addEventListener('message', (event) => {
  worker.handleMessage(event.data);
});
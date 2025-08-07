import { useState, useRef, useCallback } from 'react';
import { EmulatorMessage, EmulatorResponse, StepResult } from '@/workers/emulator/types';

interface EmulatorState {
  isInitialized: boolean;
  isRunning: boolean;
  currentPC: number;
  error?: string;
}

export const useEmulator = () => {
  const [state, setState] = useState<EmulatorState>({
    isInitialized: false,
    isRunning: false,
    currentPC: 0,
  });
  
  const workerRef = useRef<Worker | null>(null);
  const messageIdCounter = useRef(0);
  const pendingMessages = useRef<Map<string, (response: EmulatorResponse) => void>>(new Map());
  
  const sendMessage = useCallback((message: EmulatorMessage): Promise<EmulatorResponse> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        reject(new Error('Emulator not initialized'));
        return;
      }

      const messageId = `msg_${messageIdCounter.current++}`;
      message.messageId = messageId;
      
      pendingMessages.current.set(messageId, resolve);
      
      // Set timeout for message
      setTimeout(() => {
        if (pendingMessages.current.has(messageId)) {
          pendingMessages.current.delete(messageId);
          reject(new Error('Message timeout'));
        }
      }, 5000);

      workerRef.current.postMessage(message);
    });
  }, []);

  const initializeEmulator = useCallback(async () => {
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    workerRef.current = new Worker(new URL('../workers/emulator/index.ts', import.meta.url));
    
    workerRef.current.onmessage = (event: MessageEvent<EmulatorResponse>) => {
      const response = event.data;
      
      if (response.messageId && pendingMessages.current.has(response.messageId)) {
        const resolver = pendingMessages.current.get(response.messageId);
        pendingMessages.current.delete(response.messageId);
        resolver?.(response);
      }
    };

    try {
      await sendMessage({ type: 'init' });
      setState(prev => ({ ...prev, isInitialized: true, error: undefined }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isInitialized: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  }, [sendMessage]);

  const loadCode = useCallback(async (machineCode: number[]) => {
    try {
      await sendMessage({ 
        type: 'load-code', 
        payload: machineCode 
      });
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to load code' 
      }));
    }
  }, [sendMessage]);

  const step = useCallback(async (): Promise<StepResult | null> => {
    try {
      const response = await sendMessage({ type: 'step-debug' });
      if (response.type === 'step-result' && response.payload) {
        const stepResult = response.payload as StepResult;
        setState(prev => ({ 
          ...prev, 
          currentPC: stepResult.pc, 
          isRunning: stepResult.success 
        }));
        return stepResult;
      }
      return null;
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Step failed' 
      }));
      return null;
    }
  }, [sendMessage]);

  const reset = useCallback(async () => {
    try {
      await sendMessage({ type: 'reset' });
      setState(prev => ({ 
        ...prev, 
        currentPC: 0, 
        isRunning: false, 
        error: undefined 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Reset failed' 
      }));
    }
  }, [sendMessage]);

  const cleanup = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setState({
      isInitialized: false,
      isRunning: false,
      currentPC: 0,
    });
    pendingMessages.current.clear();
  }, []);

  return {
    state,
    initializeEmulator,
    loadCode,
    step,
    reset,
    cleanup,
  };
};
import { create } from 'zustand'

export interface DiagnosticError {
  id: string
  error: string
  code: string
  timestamp: Date
  diagnosis: string
  isLoading: boolean
}

interface DiagnosticsStore {
  errors: DiagnosticError[]
  addError: (error: string, code: string) => void
  clearErrors: () => void
}

async function fetchDiagnosis(error: string, code: string): Promise<string> {
  try {
    const response = await fetch('/api/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error, code })
    })

    if (!response.ok) throw new Error('API_ERROR: Failed to Fetch Diagnosis')

    // Wait for complete response instead of streaming
    const fullText = await response.text()
    
    return fullText
  } catch (err) {
    // Silently handle diagnosis failure
    return 'SERVICE_ERROR: Unable to Generate Diagnosis'
  }
}

export const useDiagnosticsStore = create<DiagnosticsStore>((set, get) => ({
  errors: [],
  
  addError: async (error, code) => {
    const id = `${Date.now()}_${Math.random()}`
    
    // Add error immediately with loading state
    set((state) => ({
      errors: [
        {
          id,
          error,
          code,
          timestamp: new Date(),
          diagnosis: '',
          isLoading: true
        },
        ...state.errors
      ]
    }))
    
    // Fetch diagnosis asynchronously
    const diagnosis = await fetchDiagnosis(error, code)
    
    // Update the error with diagnosis
    set((state) => ({
      errors: state.errors.map(e => 
        e.id === id 
          ? { ...e, diagnosis, isLoading: false }
          : e
      )
    }))
  },
  
  clearErrors: () => set({ errors: [] })
}))
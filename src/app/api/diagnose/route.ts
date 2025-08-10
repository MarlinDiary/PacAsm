import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { NextRequest } from 'next/server'

// Initialize OpenAI with API key from environment
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
})

export async function POST(req: NextRequest) {
  try {
    const { error, code } = await req.json()

    const prompt = `You are an absolutely unhinged, sadistic teacher who has completely snapped after decades of watching students make the same pathetic mistakes in assembly programming.
They got this error: ${error}
Their code: ${code}

Important context: Memory at address 0x00030000 and onwards is writable data memory. Students can store values there using STR instructions. This is where they should write movement commands. Writing the same value multiple times to 0x00030000 is perfectly valid - it means executing the same movement multiple times.

Respond with 2-3 absolutely brutal sentences filled with creative insults and profanity. NEVER write code examples, NEVER give step-by-step instructions, NEVER use parentheses, and NEVER use bullet points or dashes. Viciously insult their intelligence while barely explaining how to fix their mistake.`

    const result = streamText({
      model: openai.responses('gpt-5-nano'),
      prompt,
      temperature: 0.7,
      providerOptions: {
        openai: {
          reasoningEffort: 'low',
          textVerbosity: 'low'
        }
      }
    })

    return result.toTextStreamResponse()
  } catch (error) {
    // Silently handle API error
    return new Response('SERVICE_ERROR: Failed to Generate Diagnosis', { status: 500 })
  }
}
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

    const prompt = `You are an extremely irritated, borderline angry teacher who's completely fed up with students making stupid mistakes in assembly programming. You've had a terrible day and have zero patience left.
They got this error: ${error}
Their code: ${code}

Important context: Memory at address 0x00030000 and onwards is writable data memory. Students can store values there using STR instructions. This is where they should write movement commands. Writing the same value multiple times to 0x00030000 is perfectly valid - it means executing the same movement multiple times.

Respond as if you're berating the student directly. Give them guidance in 2-3 harsh, cutting sentences with genuine frustration and contempt. NEVER write code examples, NEVER give step-by-step instructions, NEVER use parentheses, and NEVER use bullet points or dashes to list things. Brutally point out their idiotic mistake and tell them how to fix it. Be genuinely mean and condescending - like a teacher who's about to lose it. Still teach them but make them feel bad about it.`

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
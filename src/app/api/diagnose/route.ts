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

    const prompt = `You are a helpful teaching assistant for assembly programming students. 
A student encountered this error while running their assembly code:

Error: ${error}

Their code:
\`\`\`assembly
${code}
\`\`\`

Please provide a brief, friendly explanation (2-3 sentences) of what went wrong and how to fix it. Focus on the educational aspect and guide them toward understanding the issue.`

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
    return new Response('SERVICE_ERROR: Failed to generate diagnosis', { status: 500 })
  }
}
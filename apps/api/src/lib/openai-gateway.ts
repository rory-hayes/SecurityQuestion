import { createHash } from 'node:crypto'
import { MODEL_IDS, STORE_POLICY } from './rag-config'

const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'

function getApiKey() {
  return process.env.OPENAI_API_KEY
}

export function canUseOpenAI() {
  return Boolean(getApiKey() && process.env.SQC_DISABLE_OPENAI !== 'true')
}

function deterministicVector(input: string, dimensions = 64) {
  const digest = createHash('sha256').update(input).digest()
  const vector: number[] = []
  for (let index = 0; index < dimensions; index += 1) {
    const value = digest[index % digest.length]
    vector.push((value - 127.5) / 127.5)
  }
  return vector
}

export async function embedText(text: string) {
  const apiKey = getApiKey()
  if (!apiKey || process.env.SQC_DISABLE_OPENAI === 'true') {
    return deterministicVector(text)
  }

  const response = await fetch(`${OPENAI_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL_IDS.embeddings,
      input: text,
      dimensions: 1536
    })
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Embedding request failed: ${response.status} ${body}`)
  }

  const payload = (await response.json()) as { data?: Array<{ embedding: number[] }> }
  return payload.data?.[0]?.embedding ?? deterministicVector(text)
}

type JsonOutputOptions = {
  model: string
  instructions: string
  input: string
  temperature?: number
}

export async function generateJsonOutput<T>(options: JsonOutputOptions): Promise<T | null> {
  const apiKey = getApiKey()
  if (!apiKey || process.env.SQC_DISABLE_OPENAI === 'true') {
    return null
  }

  const response = await fetch(`${OPENAI_BASE_URL}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: options.model,
      store: STORE_POLICY.customerContentStore,
      temperature: options.temperature ?? 0.1,
      instructions: options.instructions,
      input: options.input,
      text: {
        format: {
          type: 'json_object'
        }
      }
    })
  })

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as {
    output_text?: string
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
  }

  const outputText =
    payload.output_text ??
    payload.output?.flatMap((item) => item.content ?? []).find((content) => content.type === 'output_text')?.text

  if (!outputText) return null

  try {
    return JSON.parse(outputText) as T
  } catch {
    return null
  }
}

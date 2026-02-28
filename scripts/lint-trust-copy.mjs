import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

const bannedPhrases = [
  'fully autonomous ai',
  'zero hallucination',
  'guaranteed compliance',
  'guaranteed secure',
  'no human needed'
]

const out = execSync('rg --files apps/web/src', { encoding: 'utf8' })
const files = out
  .split('\n')
  .filter(Boolean)
  .filter((file) => /\.(ts|tsx|md|mdx)$/.test(file))
const violations = []

for (const file of files) {
  const text = readFileSync(join(process.cwd(), file), 'utf8').toLowerCase()
  for (const phrase of bannedPhrases) {
    if (text.includes(phrase)) {
      violations.push(`${file}: contains banned phrase '${phrase}'`)
    }
  }
}

if (violations.length) {
  console.error('Trust copy check failed:\n' + violations.join('\n'))
  process.exit(1)
}

console.log(`Trust copy check passed for ${files.length} files.`)

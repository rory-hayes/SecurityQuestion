import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

const banned = ['@mui/', '@chakra-ui/', 'antd', 'shadcn', '@/components/ui/']
function listFiles() {
  try {
    return execSync('rg --files apps packages', { encoding: 'utf8' })
  } catch {
    return execSync('git ls-files apps packages', { encoding: 'utf8' })
  }
}

const out = listFiles()
const files = out
  .split('\n')
  .filter(Boolean)
  .filter((file) => /\.(ts|tsx|js|jsx)$/.test(file))
const violations = []

for (const file of files) {
  if (file.startsWith('packages/ui-catalyst/')) continue
  const text = readFileSync(join(process.cwd(), file), 'utf8')
  for (const token of banned) {
    if (text.includes(token)) {
      violations.push(`${file}: found restricted token '${token}'`)
    }
  }
}

if (violations.length) {
  console.error('UI governance check failed:\n' + violations.join('\n'))
  process.exit(1)
}

console.log(`UI governance check passed for ${files.length} files.`)

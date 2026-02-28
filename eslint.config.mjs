import js from '@eslint/js'

export default [
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@mui/material', message: 'Use @sqc/ui-catalyst components only.' },
            { name: '@chakra-ui/react', message: 'Use @sqc/ui-catalyst components only.' },
            { name: 'antd', message: 'Use @sqc/ui-catalyst components only.' },
            { name: 'shadcn-ui', message: 'Use @sqc/ui-catalyst components only.' }
          ],
          patterns: ['@/components/ui/*', '*/shadcn/*']
        }
      ]
    }
  }
]

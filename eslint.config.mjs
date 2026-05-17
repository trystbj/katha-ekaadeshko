import { createRequire } from 'node:module'
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactPlugin from 'eslint-plugin-react'
import tseslint from 'typescript-eslint'

const require = createRequire(import.meta.url)
const kathaI18nPlugin = require('./eslint-rules/katha-i18n-plugin.cjs')

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/web-dist/**',
      '**/api/**',
      '**/backend/**',
      '**/worker/**',
      '**/build/**'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/triple-slash-reference': 'off'
    }
  },
  /** Mandatory localization path — forbid destructuring `t` from useTranslation outside i18n shell files (handled in rule). */
  {
    files: ['src/renderer/src/**/*.ts'],
    plugins: { 'katha-i18n': kathaI18nPlugin },
    rules: {
      'katha-i18n/forbid-use-translation-t': 'error'
    }
  },
  /** JSX literal ban + raw accessibility/tooltip props (technical attrs remain strings via ignoreProps). */
  {
    files: ['src/renderer/src/**/*.{tsx,jsx}'],
    plugins: {
      react: reactPlugin,
      'katha-i18n': kathaI18nPlugin
    },
    settings: {
      react: { version: '18.3' }
    },
    rules: {
      'react/jsx-no-literals': [
        'error',
        {
          noStrings: true,
          ignoreProps: true,
          allowedStrings: [
            'कथा एकादेशको',
            'Tryst BJ',
            'Penguin',
            '✨',
            '⏭',
            '✏️',
            '▮',
            '▶',
            ' ',
            '✓'
          ]
        }
      ],
      'katha-i18n/no-raw-ui-string-props': 'error',
      'katha-i18n/forbid-use-translation-t': 'error'
    }
  }
)

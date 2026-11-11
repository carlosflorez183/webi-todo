import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // `observer` de mobx-react-lite es un HOC: reconocerlo evita falsos
      // positivos de Fast Refresh en componentes envueltos con él.
      'react-refresh/only-export-components': [
        'error',
        {
          allowConstantExport: true,
          allowCompoundComponents: true,
          extraHOCs: ['observer'],
        },
      ],
    },
  },
])

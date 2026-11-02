import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'api/dist', 'shared/dist', 'dev-dist', 'coverage', 'playwright-report', 'test-results'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // All data access goes through the repositories in src/data/, so sync and encryption can slot in later.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/data/**', 'src/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'dexie', message: 'Use the repositories from @/data instead of Dexie.' }],
          patterns: [{ regex: '(^@/data/|/data/)(db|repository|session|seed|init|backup|testing)$', message: 'Import from @/data (the public API) instead.' }],
        },
      ],
    },
  },
);

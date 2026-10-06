/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ['node_modules/**']
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        exports: 'writable',
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly'
      }
    },
    rules: {
      // `_`-prefixed names are deliberate discards (e.g. `const { _id: _u, ...rest } = doc`).
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      // warn, not error: most server files predate these style rules (~1,200 hits in runtime
      // code alone). Mass-fixing them would collide with every parallel Worker; fix per file.
      quotes: ['warn', 'single', { avoidEscape: true }],
      semi: ['warn', 'never'],
      'no-unexpected-multiline': 'error'
    }
  },
  {
    // Plan 383: server runtime code logs through server/logger.js (pino) — `req.log` inside
    // handlers, `logger` at startup/db level, always with an `event`. scripts/, migrations/
    // and test/ keep console.
    files: ['app.js', 'db.js', 'index.js', 'logger.js', 'routes/**/*.js', 'services/**/*.js', 'middleware/**/*.js'],
    rules: {
      'no-console': 'error'
    }
  }
]

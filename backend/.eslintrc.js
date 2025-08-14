module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    // Allow console statements in backend (needed for logging)
    'no-console': 'off',
    
    // Allow unused vars that start with underscore
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    
    // Prefer const/let over var
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Consistent quote style
    'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
    
    // Consistent indentation
    'indent': ['error', 2],
    
    // Allow console in development files
    'no-console': 'off'
  },
  overrides: [
    {
      // Test files can have additional relaxed rules
      files: ['**/*.test.js', '**/tests/**/*.js'],
      rules: {
        'no-unused-vars': 'off'
      }
    },
    {
      // Scripts and migration files can have relaxed rules
      files: [
        '**/scripts/**/*.js', 
        '**/migrations/**/*.js',
        '**/*migration*.js',
        '**/*setup*.js',
        '**/*test*.js',
        '**/*debug*.js',
        '**/*check*.js'
      ],
      rules: {
        'no-unused-vars': 'warn',
        'prefer-const': 'warn'
      }
    }
  ]
};

import { type Config } from 'prettier'

const config: Config = {
  useTabs: false,
  singleQuote: true,
  trailingComma: 'all',
  bracketSameLine: true,
  printWidth: 120,
  tabWidth: 2,
  semi: false,
  experimentalTernaries: true,
  plugins: ['prettier-plugin-svelte', 'prettier-plugin-tailwindcss'],
  overrides: [
    {
      files: '*.svelte',
      options: {
        parser: 'svelte',
      },
    },
  ],
  tailwindStylesheet: './src/routes/layout.css',
}

export default config

import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'

const appPackage = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8')) as { version: string }

function injectAppVersion(): Plugin {
  return {
    name: 'inject-murmur-version',
    transformIndexHtml: (html) => html.replaceAll('__MURMUR_VERSION__', appPackage.version)
  }
}

export default defineConfig({
  base: './',
  plugins: [injectAppVersion()],
  server: { port: 5190, strictPort: true, fs: { allow: ['..'] } }
})

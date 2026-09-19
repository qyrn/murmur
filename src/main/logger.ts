import { app } from 'electron'
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

let logPath: string | null = null

function formatArg(arg: unknown): string {
  if (arg instanceof Error) {
    return arg.stack ?? arg.message
  }
  if (typeof arg === 'string') {
    return arg
  }
  try {
    return JSON.stringify(arg)
  } catch {
    return String(arg)
  }
}

function appendToFile(level: string, args: unknown[]): void {
  if (!logPath) {
    return
  }
  const line = `${new Date().toISOString()} [${level}] ${args.map(formatArg).join(' ')}\n`
  try {
    appendFileSync(logPath, line, 'utf-8')
  } catch {
    // best effort : si l'ecriture echoue on ne peut rien faire de plus
  }
}

export function initFileLogging(): void {
  if (!app.isPackaged) {
    return
  }
  const dir = join(app.getPath('userData'), 'logs')
  mkdirSync(dir, { recursive: true })
  logPath = join(dir, 'main.log')
  writeFileSync(logPath, `--- demarrage ${new Date().toISOString()} ---\n`, 'utf-8')

  const originalLog = console.log.bind(console)
  const originalError = console.error.bind(console)

  console.log = (...args: unknown[]) => {
    originalLog(...args)
    appendToFile('LOG', args)
  }
  console.error = (...args: unknown[]) => {
    originalError(...args)
    appendToFile('ERR', args)
  }
}

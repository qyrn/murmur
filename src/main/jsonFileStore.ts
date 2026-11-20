import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

function userDataPath(fileName: string): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return join(dir, fileName)
}

export function writeJsonFile(fileName: string, value: unknown): void {
  const path = userDataPath(fileName)
  const temporaryPath = `${path}.tmp`
  writeFileSync(temporaryPath, JSON.stringify(value, null, 2), 'utf-8')
  renameSync(temporaryPath, path)
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

export function readJsonFile<T>(fileName: string, fallback: T, isValid: (value: unknown) => value is T): T {
  const path = userDataPath(fileName)
  if (!existsSync(path)) {
    writeJsonFile(fileName, fallback)
    return fallback
  }
  const parsed = parseJson(readFileSync(path, 'utf-8'))
  if (isValid(parsed)) {
    return parsed
  }
  const backupPath = `${path}.corrupt-${Date.now()}`
  renameSync(path, backupPath)
  console.error(`[stockage] ${fileName} illisible, mis de côté dans ${backupPath}`)
  writeJsonFile(fileName, fallback)
  return fallback
}

export function isArrayOfObjects<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null)
}

export function isPlainObject<T>(value: unknown): value is T {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

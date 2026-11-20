import { join } from 'node:path'
import { app } from 'electron'

export const engineRoot = app.isPackaged
  ? join(process.resourcesPath, 'whisper-engine')
  : join(__dirname, '../../whisper-engine')

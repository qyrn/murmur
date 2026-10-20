import { app } from 'electron'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

function linuxAutostartEntryPath(): string {
  const configHome = process.env['XDG_CONFIG_HOME'] ?? join(homedir(), '.config')
  return join(configHome, 'autostart', 'murmur.desktop')
}

function linuxAutostartEntry(): string {
  return [
    '[Desktop Entry]',
    'Type=Application',
    'Name=murmur',
    'Comment=Dictée vocale privée et locale',
    `Exec="${process.execPath}"`,
    'Icon=murmur',
    'Terminal=false',
    'X-GNOME-Autostart-enabled=true',
    ''
  ].join('\n')
}

function applyLinuxLaunchAtStartup(enabled: boolean): void {
  const entryPath = linuxAutostartEntryPath()
  if (!enabled) {
    rmSync(entryPath, { force: true })
    return
  }
  mkdirSync(join(entryPath, '..'), { recursive: true })
  writeFileSync(entryPath, linuxAutostartEntry(), 'utf-8')
}

export function applyLaunchAtStartup(enabled: boolean): void {
  if (!app.isPackaged) {
    return
  }
  if (process.platform === 'linux') {
    applyLinuxLaunchAtStartup(enabled)
    return
  }
  app.setLoginItemSettings({ openAtLogin: enabled })
}

const appImagePath = process.platform === 'linux' ? process.env['APPIMAGE'] : undefined

export const runsFromAppImage = appImagePath !== undefined

export const launcherPath = appImagePath ?? process.execPath

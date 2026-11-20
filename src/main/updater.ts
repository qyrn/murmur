import { app, dialog } from 'electron'
import electronUpdater from 'electron-updater'
import { t } from './interfaceLanguage'

const { autoUpdater } = electronUpdater

let wired = false

export const supportsAutoUpdate = process.platform === 'win32'

function wireEvents(): void {
  if (wired) {
    return
  }
  wired = true

  autoUpdater.on('update-downloaded', (info) => {
    const result = dialog.showMessageBoxSync({
      type: 'info',
      title: t('update.readyTitle'),
      message: t('update.readyMessage', { version: info.version }),
      detail: t('update.readyDetail'),
      buttons: [t('update.restartNow'), t('update.later')],
      defaultId: 0,
      cancelId: 1
    })
    if (result === 0) {
      autoUpdater.quitAndInstall()
    }
  })

  autoUpdater.on('error', (err) => {
    console.error('[updater] erreur :', err)
  })
}

export function checkForUpdatesAtLaunch(): void {
  if (!app.isPackaged || !supportsAutoUpdate) {
    return
  }
  wireEvents()
  autoUpdater.checkForUpdates().catch((err: unknown) => {
    console.error('[updater] échec de la vérification au lancement :', err)
  })
}

export function checkForUpdatesManually(): void {
  if (!app.isPackaged) {
    void dialog.showMessageBox({
      type: 'info',
      title: t('update.title'),
      message: t('update.devOnly')
    })
    return
  }
  wireEvents()
  autoUpdater
    .checkForUpdates()
    .then((result) => {
      if (!result?.downloadPromise) {
        void dialog.showMessageBox({
          type: 'info',
          title: t('update.title'),
          message: t('update.upToDate')
        })
      }
    })
    .catch((err: unknown) => {
      console.error('[updater] échec de la vérification manuelle :', err)
      void dialog.showMessageBox({
        type: 'error',
        title: t('update.title'),
        message: t('update.failed'),
        detail: err instanceof Error ? err.message : String(err)
      })
    })
}

import { app, dialog } from 'electron'
import electronUpdater from 'electron-updater'

const { autoUpdater } = electronUpdater

let wired = false

function wireEvents(): void {
  if (wired) {
    return
  }
  wired = true

  autoUpdater.on('update-downloaded', (info) => {
    const result = dialog.showMessageBoxSync({
      type: 'info',
      title: 'Mise à jour disponible',
      message: `murmur ${info.version} a été téléchargée.`,
      detail: "Redémarrer maintenant pour l'installer, ou plus tard depuis le menu de la barre système.",
      buttons: ['Redémarrer maintenant', 'Plus tard'],
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
  if (!app.isPackaged) {
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
      title: 'Mises à jour',
      message: "Les mises à jour ne sont vérifiées que sur la version installée, pas en mode développement."
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
          title: 'Mises à jour',
          message: 'murmur est déjà à jour.'
        })
      }
    })
    .catch((err: unknown) => {
      console.error('[updater] échec de la vérification manuelle :', err)
      void dialog.showMessageBox({
        type: 'error',
        title: 'Mises à jour',
        message: 'Impossible de vérifier les mises à jour.',
        detail: err instanceof Error ? err.message : String(err)
      })
    })
}

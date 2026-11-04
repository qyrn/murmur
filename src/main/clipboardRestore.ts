const RESTORE_DELAY_MS = 1500

export interface ClipboardAccess {
  read: () => Promise<string | null>
  write: (text: string) => Promise<void>
}

interface PendingRestore {
  timer: NodeJS.Timeout
  originalText: string
}

let pendingRestore: PendingRestore | null = null

export async function takeClipboardToRestore(access: ClipboardAccess): Promise<string | null> {
  if (!pendingRestore) {
    return access.read()
  }
  clearTimeout(pendingRestore.timer)
  const { originalText } = pendingRestore
  pendingRestore = null
  return originalText
}

async function restoreUnlessReplaced(access: ClipboardAccess, originalText: string, pastedText: string): Promise<void> {
  try {
    if ((await access.read()) === pastedText) {
      await access.write(originalText)
    }
  } catch (err) {
    console.error('impossible de remettre le presse-papier', err)
  }
}

export function scheduleClipboardRestore(
  access: ClipboardAccess,
  originalText: string | null,
  pastedText: string
): void {
  if (originalText === null) {
    return
  }
  const timer = setTimeout(() => {
    pendingRestore = null
    void restoreUnlessReplaced(access, originalText, pastedText)
  }, RESTORE_DELAY_MS)
  pendingRestore = { timer, originalText }
}

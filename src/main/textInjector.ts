import { clipboard } from 'electron'
import { keyboard, Key } from '@nut-tree-fork/nut-js'

keyboard.config.autoDelayMs = 0

export async function pasteIntoActiveWindow(text: string): Promise<void> {
  const previousClipboard = await clipboard.readText()

  await clipboard.writeText(text)
  await new Promise((r) => setTimeout(r, 50))

  await keyboard.pressKey(Key.LeftControl, Key.V)
  await keyboard.releaseKey(Key.LeftControl, Key.V)

  await new Promise((r) => setTimeout(r, 1500))
  await clipboard.writeText(previousClipboard)
}

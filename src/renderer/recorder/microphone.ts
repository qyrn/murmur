export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => rejectPromise(new Error(`Timeout: ${label} (${ms}ms)`)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolvePromise(value)
      },
      (err: unknown) => {
        clearTimeout(timer)
        rejectPromise(err)
      }
    )
  })
}

const GET_USER_MEDIA_TIMEOUT_MS = 5000

export async function openMicrophone(): Promise<MediaStream> {
  const deviceId = await window.recorderApi.getMicrophoneDeviceId()

  if (deviceId) {
    try {
      return await withTimeout(
        navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId } } }),
        GET_USER_MEDIA_TIMEOUT_MS,
        'getUserMedia'
      )
    } catch (err) {
      console.warn('microphone choisi introuvable, repli sur le micro par defaut', err)
    }
  }

  return withTimeout(navigator.mediaDevices.getUserMedia({ audio: true }), GET_USER_MEDIA_TIMEOUT_MS, 'getUserMedia')
}

export function closeMicrophone(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop())
}

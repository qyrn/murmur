import { spawn } from 'node:child_process'

export function convertToWav16kMono(input: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      'pipe:0',
      '-ar',
      '16000',
      '-ac',
      '1',
      '-f',
      'wav',
      'pipe:1'
    ])

    const outChunks: Buffer[] = []
    const errChunks: Buffer[] = []

    proc.stdout.on('data', (chunk: Buffer) => outChunks.push(chunk))
    proc.stderr.on('data', (chunk: Buffer) => errChunks.push(chunk))
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(outChunks))
      } else {
        reject(new Error(`ffmpeg a échoué (code ${code}) : ${Buffer.concat(errChunks).toString('utf-8')}`))
      }
    })

    proc.stdin.write(input)
    proc.stdin.end()
  })
}

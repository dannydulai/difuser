import type { DiffuserConfig } from '../types'
import { DEFAULT_CONFIG } from '../types'

interface SharePayload {
  v: number
  name: string
  config: DiffuserConfig
}

async function compressBytes(data: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === 'undefined') return data

  const cs = new CompressionStream('deflate-raw')
  const writer = cs.writable.getWriter()
  void writer.write(data as unknown as BufferSource)
  void writer.close()

  const chunks: Uint8Array[] = []
  const reader = cs.readable.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  const totalLen = chunks.reduce((s, c) => s + c.length, 0)
  const out = new Uint8Array(totalLen)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

async function decompressBytes(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') return data

  const ds = new DecompressionStream('deflate-raw')
  const writer = ds.writable.getWriter()
  void writer.write(data as unknown as BufferSource)
  void writer.close()

  const chunks: Uint8Array[] = []
  const reader = ds.readable.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }

  const totalLen = chunks.reduce((s, c) => s + c.length, 0)
  const out = new Uint8Array(totalLen)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

function uint8ToBase64Url(data: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToUint8(str: string): Uint8Array {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (b64.length % 4) b64 += '='
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export async function buildShareUrl(name: string, config: DiffuserConfig): Promise<string> {
  const payload: SharePayload = { v: 1, name, config }
  const json = JSON.stringify(payload)
  console.log('Share payload:', json)
  const raw = new TextEncoder().encode(json)
  const compressed = await compressBytes(raw)
  const encoded = uint8ToBase64Url(compressed)
  return `${window.location.origin}/share?v1=${encoded}`
}

export async function decodeShare(encoded: string): Promise<{ name: string; config: DiffuserConfig } | null> {
  try {
    const bytes = base64UrlToUint8(encoded)
    let json: string

    try {
      const decompressed = await decompressBytes(bytes)
      json = new TextDecoder().decode(decompressed)
    } catch {
      // Fallback: maybe it wasn't compressed
      json = new TextDecoder().decode(bytes)
    }

    const payload = JSON.parse(json) as SharePayload
    if (payload.v !== 1 || !payload.config) return null

    const config = { ...DEFAULT_CONFIG, ...payload.config }
    return { name: payload.name || 'Shared Project', config }
  } catch {
    return null
  }
}

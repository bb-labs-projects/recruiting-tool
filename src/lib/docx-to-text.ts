import 'server-only'
import mammoth from 'mammoth'

export async function convertDocxToText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

export type FilePickerResult =
  | { status: 'cancelled' }
  | { status: 'rejected'; file: File }
  | { status: 'ok'; text: string; file: File }

/**
 * macOS WebKit often greys out files when `accept` mixes broad MIME types
 * (e.g. text/xml, application/xml). Extension-only hints are unreliable too.
 * Omit accept and validate after selection for SVG/HTML imports.
 */
export const SVG_FILE_ACCEPT = '.svg,image/svg+xml,application/octet-stream'
export const HTML_FILE_ACCEPT = '.html,.htm,text/html,application/octet-stream'

export function isSvgFile(file: File): boolean {
  const name = file.name.toLowerCase()
  if (name.endsWith('.svg')) {
    return true
  }

  const type = file.type.toLowerCase()
  return (
    type === 'image/svg+xml' ||
    type === 'text/xml' ||
    type === 'application/xml' ||
    type === 'application/svg+xml'
  )
}

export function isHtmlFile(file: File): boolean {
  const name = file.name.toLowerCase()
  if (name.endsWith('.html') || name.endsWith('.htm')) {
    return true
  }

  const type = file.type.toLowerCase()
  return type === 'text/html' || type === 'application/xhtml+xml'
}

export function looksLikeSvgText(text: string): boolean {
  const trimmed = text.trimStart()
  if (trimmed.startsWith('<svg')) {
    return true
  }

  return trimmed.startsWith('<?xml') && /<svg[\s>]/i.test(trimmed)
}

export function looksLikeHtmlText(text: string): boolean {
  const trimmed = text.trimStart().toLowerCase()
  return (
    trimmed.startsWith('<!doctype html') ||
    trimmed.startsWith('<html') ||
    (trimmed.startsWith('<?xml') && trimmed.includes('<html'))
  )
}

export async function openFilePicker(options: {
  accept?: string
  isAccepted?: (file: File) => boolean
  validateText?: (text: string, file: File) => boolean
}): Promise<FilePickerResult> {
  const { accept, isAccepted, validateText } = options

  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none;'

    if (accept) {
      input.accept = accept
    }

    const finish = (result: FilePickerResult) => {
      input.remove()
      resolve(result)
    }

    input.addEventListener('change', async () => {
      const file = input.files?.[0]
      if (!file) {
        finish({ status: 'cancelled' })
        return
      }

      if (isAccepted && !isAccepted(file)) {
        finish({ status: 'rejected', file })
        return
      }

      try {
        const text = await file.text()
        if (validateText && !validateText(text, file)) {
          finish({ status: 'rejected', file })
          return
        }

        finish({ status: 'ok', text, file })
      } catch {
        finish({ status: 'cancelled' })
      }
    })

    input.addEventListener('cancel', () => finish({ status: 'cancelled' }))

    document.body.appendChild(input)
    input.click()
  })
}

export async function openTextFile(
  accept: string | undefined,
  isAccepted: (file: File) => boolean,
  validateText?: (text: string, file: File) => boolean,
): Promise<string | null> {
  const result = await openFilePicker({ accept, isAccepted, validateText })
  return result.status === 'ok' ? result.text : null
}

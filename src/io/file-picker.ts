/** macOS Finder accepts extensions more reliably than MIME types alone. */
export const SVG_FILE_ACCEPT =
  '.svg,.SVG,image/svg+xml,text/xml,application/xml,application/svg+xml'

export const HTML_FILE_ACCEPT =
  '.html,.htm,.HTML,.HTM,text/html,application/xhtml+xml'

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

export async function openTextFile(accept: string, isAccepted: (file: File) => boolean): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept

    const finish = (value: string | null) => {
      input.remove()
      resolve(value)
    }

    input.addEventListener('change', async () => {
      const file = input.files?.[0]
      if (!file) {
        finish(null)
        return
      }

      if (!isAccepted(file)) {
        finish(null)
        return
      }

      try {
        finish(await file.text())
      } catch {
        finish(null)
      }
    })

    input.addEventListener('cancel', () => finish(null))
    input.click()
  })
}

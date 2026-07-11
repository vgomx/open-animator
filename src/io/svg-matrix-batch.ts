import { collectMatrixKeyframesForNode, beginMatrixTimeCache, endMatrixTimeCache } from '@/io/svg-smil'

export type MatrixSampleRequest = {
  nodePath: number[]
}

export type MatrixSampleResult = ReturnType<typeof collectMatrixKeyframesForNode>

export function resolveNodeByPath(svg: Element, nodePath: number[]): Element | null {
  let current: Element = svg

  for (const index of nodePath) {
    const child = current.children[index]
    if (!child) {
      return null
    }
    current = child
  }

  return current
}

export function sampleMatrixKeyframesBatch(
  svgMarkup: string,
  requests: MatrixSampleRequest[],
): MatrixSampleResult[] {
  const document = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml')
  const svg = document.querySelector('svg')
  if (!svg) {
    return requests.map(() => ({ keyframes: [], duration: 0 }))
  }

  beginMatrixTimeCache()
  try {
    return requests.map(({ nodePath }) => {
      const node = resolveNodeByPath(svg, nodePath)
      if (!node) {
        return { keyframes: [], duration: 0 }
      }

      return collectMatrixKeyframesForNode(node)
    })
  } finally {
    endMatrixTimeCache()
  }
}

export function getNodePath(node: Element): number[] {
  const path: number[] = []
  let current: Element | null = node

  while (current && current.tagName.toLowerCase() !== 'svg') {
    const parent: Element | null = current.parentElement
    if (!parent) {
      break
    }

    path.unshift([...parent.children].indexOf(current))
    current = parent
  }

  return path
}

const LARGE_IMPORT_WORKER_THRESHOLD = 300

export function shouldUseMatrixSamplingWorker(layerCount: number): boolean {
  return layerCount >= LARGE_IMPORT_WORKER_THRESHOLD && typeof Worker !== 'undefined'
}

let matrixWorker: Worker | null = null

function getMatrixWorker(): Worker {
  if (!matrixWorker) {
    matrixWorker = new Worker(new URL('./svg-matrix.worker.ts', import.meta.url), {
      type: 'module',
    })
  }

  return matrixWorker
}

export async function sampleMatrixKeyframesInWorker(
  svgMarkup: string,
  requests: MatrixSampleRequest[],
): Promise<MatrixSampleResult[]> {
  if (!shouldUseMatrixSamplingWorker(requests.length)) {
    return sampleMatrixKeyframesBatch(svgMarkup, requests)
  }

  return new Promise((resolve, reject) => {
    const worker = getMatrixWorker()

    const handleMessage = (event: MessageEvent<{ results: MatrixSampleResult[] }>) => {
      worker.removeEventListener('message', handleMessage)
      worker.removeEventListener('error', handleError)
      resolve(event.data.results)
    }

    const handleError = (error: ErrorEvent) => {
      worker.removeEventListener('message', handleMessage)
      worker.removeEventListener('error', handleError)
      reject(error.error ?? error.message)
    }

    worker.addEventListener('message', handleMessage)
    worker.addEventListener('error', handleError)
    worker.postMessage({ svgMarkup, requests })
  })
}

export { LARGE_IMPORT_WORKER_THRESHOLD }

import { sampleMatrixKeyframesBatch, type MatrixSampleRequest, type MatrixSampleResult } from '@/io/svg-matrix-batch'

type WorkerRequest = {
  svgMarkup: string
  requests: MatrixSampleRequest[]
}

type WorkerResponse = {
  results: MatrixSampleResult[]
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { svgMarkup, requests } = event.data
  const results = sampleMatrixKeyframesBatch(svgMarkup, requests)
  const response: WorkerResponse = { results }
  self.postMessage(response)
}

export {}

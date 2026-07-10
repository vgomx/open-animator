export function clientToArtboard(svg: SVGSVGElement, clientX: number, clientY: number) {
  const point = svg.createSVGPoint()
  point.x = clientX
  point.y = clientY
  const matrix = svg.getScreenCTM()?.inverse()
  if (!matrix) {
    return { x: 0, y: 0 }
  }

  const transformed = point.matrixTransform(matrix)
  return { x: transformed.x, y: transformed.y }
}

export function artboardToClient(svg: SVGSVGElement, x: number, y: number) {
  const point = svg.createSVGPoint()
  point.x = x
  point.y = y
  const matrix = svg.getScreenCTM()
  if (!matrix) {
    return { x: 0, y: 0 }
  }

  const transformed = point.matrixTransform(matrix)
  return { x: transformed.x, y: transformed.y }
}

export function artboardToLocal(
  svg: SVGSVGElement,
  container: HTMLElement,
  x: number,
  y: number,
) {
  const screen = artboardToClient(svg, x, y)
  const rect = container.getBoundingClientRect()
  return {
    x: screen.x - rect.left,
    y: screen.y - rect.top,
  }
}

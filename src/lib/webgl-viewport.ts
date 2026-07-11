import type { ViewportState } from '@/editor/viewport-controller'

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_uv;
uniform vec2 u_viewportSize;
uniform vec2 u_artboardSize;
uniform vec2 u_pan;
uniform float u_zoom;
out vec2 v_uv;

void main() {
  vec2 center = u_viewportSize * 0.5;
  vec2 size = u_artboardSize * u_zoom;
  vec2 pos = center + u_pan + (a_position - 0.5) * size;
  vec2 clip = (pos / u_viewportSize) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  v_uv = a_uv;
}
`

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
in vec2 v_uv;
uniform sampler2D u_texture;
out vec4 outColor;

void main() {
  outColor = texture(u_texture, v_uv);
}
`

export type WebGlViewportRendererOptions = {
  canvas: HTMLCanvasElement
  artboardWidth: number
  artboardHeight: number
}

export class WebGlViewportRenderer {
  private gl: WebGL2RenderingContext
  private program: WebGLProgram
  private texture: WebGLTexture
  private vao: WebGLVertexArrayObject
  private uniforms: {
    viewportSize: WebGLUniformLocation
    artboardSize: WebGLUniformLocation
    pan: WebGLUniformLocation
    zoom: WebGLUniformLocation
    texture: WebGLUniformLocation
  }
  private viewportState: ViewportState = { zoom: 1, panX: 0, panY: 0 }
  private viewportWidth = 1
  private viewportHeight = 1
  private artboardWidth: number
  private artboardHeight: number

  constructor(options: WebGlViewportRendererOptions) {
    const gl = options.canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
    })

    if (!gl) {
      throw new Error('WebGL2 is not available')
    }

    this.gl = gl
    this.artboardWidth = options.artboardWidth
    this.artboardHeight = options.artboardHeight
    this.program = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER)
    this.texture = this.createTexture()
    this.vao = this.createQuad()
    this.uniforms = {
      viewportSize: gl.getUniformLocation(this.program, 'u_viewportSize')!,
      artboardSize: gl.getUniformLocation(this.program, 'u_artboardSize')!,
      pan: gl.getUniformLocation(this.program, 'u_pan')!,
      zoom: gl.getUniformLocation(this.program, 'u_zoom')!,
      texture: gl.getUniformLocation(this.program, 'u_texture')!,
    }
  }

  setArtboardSize(width: number, height: number) {
    this.artboardWidth = width
    this.artboardHeight = height
  }

  setViewportSize(width: number, height: number) {
    this.viewportWidth = Math.max(1, width)
    this.viewportHeight = Math.max(1, height)
    this.gl.canvas.width = this.viewportWidth
    this.gl.canvas.height = this.viewportHeight
    this.gl.viewport(0, 0, this.viewportWidth, this.viewportHeight)
  }

  setViewportState(state: ViewportState) {
    this.viewportState = state
  }

  draw(source: HTMLCanvasElement) {
    const gl = this.gl
    gl.useProgram(this.program)
    gl.bindVertexArray(this.vao)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    gl.uniform1i(this.uniforms.texture, 0)
    gl.uniform2f(this.uniforms.viewportSize, this.viewportWidth, this.viewportHeight)
    gl.uniform2f(this.uniforms.artboardSize, this.artboardWidth, this.artboardHeight)
    gl.uniform2f(this.uniforms.pan, this.viewportState.panX, this.viewportState.panY)
    gl.uniform1f(this.uniforms.zoom, this.viewportState.zoom)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  destroy() {
    const gl = this.gl
    gl.deleteProgram(this.program)
    gl.deleteTexture(this.texture)
    gl.deleteVertexArray(this.vao)
  }

  private createProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
    const gl = this.gl
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource)
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource)
    const program = gl.createProgram()
    if (!program) {
      throw new Error('Unable to create WebGL program')
    }

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? 'Unable to link WebGL program')
    }

    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)
    return program
  }

  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl
    const shader = gl.createShader(type)
    if (!shader) {
      throw new Error('Unable to create WebGL shader')
    }

    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) ?? 'Unable to compile WebGL shader')
    }

    return shader
  }

  private createTexture(): WebGLTexture {
    const gl = this.gl
    const texture = gl.createTexture()
    if (!texture) {
      throw new Error('Unable to create WebGL texture')
    }

    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return texture
  }

  private createQuad(): WebGLVertexArrayObject {
    const gl = this.gl
    const vao = gl.createVertexArray()
    if (!vao) {
      throw new Error('Unable to create WebGL VAO')
    }

    const buffer = gl.createBuffer()
    if (!buffer) {
      throw new Error('Unable to create WebGL buffer')
    }

    const vertices = new Float32Array([
      0, 0, 0, 1,
      1, 0, 1, 1,
      0, 1, 0, 0,
      1, 1, 1, 0,
    ])

    gl.bindVertexArray(vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

    const positionLocation = gl.getAttribLocation(this.program, 'a_position')
    const uvLocation = gl.getAttribLocation(this.program, 'a_uv')

    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0)
    gl.enableVertexAttribArray(uvLocation)
    gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 16, 8)

    gl.bindVertexArray(null)
    return vao
  }
}

export function isWebGl2Available(): boolean {
  if (typeof document === 'undefined') {
    return false
  }

  const canvas = document.createElement('canvas')
  return Boolean(canvas.getContext('webgl2'))
}

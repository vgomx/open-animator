import type { LucideIcon } from 'lucide-react'
import {
  Circle,
  Hand,
  MousePointer2,
  PenLine,
  Square,
  Spline,
  Type,
  ZoomIn,
} from 'lucide-react'

export type EditorTool =
  | 'select'
  | 'hand'
  | 'zoom'
  | 'node'
  | 'pen'
  | 'rect'
  | 'ellipse'
  | 'text'

export type EditorToolDefinition = {
  id: EditorTool
  label: string
  shortcut: string
  icon: LucideIcon
  cursor: string
}

export const EDITOR_TOOLS: EditorToolDefinition[] = [
  { id: 'select', label: 'Select', shortcut: 'V', icon: MousePointer2, cursor: 'default' },
  { id: 'hand', label: 'Hand', shortcut: 'H', icon: Hand, cursor: 'grab' },
  { id: 'zoom', label: 'Zoom', shortcut: 'Z', icon: ZoomIn, cursor: 'zoom-in' },
  { id: 'node', label: 'Node', shortcut: 'A', icon: Spline, cursor: 'crosshair' },
  { id: 'pen', label: 'Pen', shortcut: 'P', icon: PenLine, cursor: 'crosshair' },
  { id: 'rect', label: 'Rectangle', shortcut: 'R', icon: Square, cursor: 'crosshair' },
  { id: 'ellipse', label: 'Ellipse', shortcut: 'O', icon: Circle, cursor: 'crosshair' },
  { id: 'text', label: 'Text', shortcut: 'T', icon: Type, cursor: 'text' },
]

export function getToolDefinition(tool: EditorTool): EditorToolDefinition {
  return EDITOR_TOOLS.find((item) => item.id === tool) ?? EDITOR_TOOLS[0]
}

export function isDrawTool(tool: EditorTool): tool is 'rect' | 'ellipse' {
  return tool === 'rect' || tool === 'ellipse'
}

export function isCreationTool(tool: EditorTool): boolean {
  return tool === 'rect' || tool === 'ellipse' || tool === 'text' || tool === 'pen'
}

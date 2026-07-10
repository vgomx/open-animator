export type ExportBackgroundMode = 'solid' | 'transparent'

export type ExportSizePreset = 'custom' | 'twitter' | 'instagram' | 'favicon'

export type ExportOptions = {
  fps: number
  scale: number
  background: ExportBackgroundMode
  backgroundColor: string
  sizePreset?: ExportSizePreset
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  fps: 30,
  scale: 1,
  background: 'solid',
  backgroundColor: '#111827',
  sizePreset: 'custom',
}

export const EXPORT_SIZE_PRESETS: Array<{
  id: ExportSizePreset
  label: string
  width: number
  height: number
}> = [
  { id: 'custom', label: 'Custom (artboard)', width: 0, height: 0 },
  { id: 'twitter', label: 'Twitter / X (1200×675)', width: 1200, height: 675 },
  { id: 'instagram', label: 'Instagram square (1080×1080)', width: 1080, height: 1080 },
  { id: 'favicon', label: 'Favicon (512×512)', width: 512, height: 512 },
]

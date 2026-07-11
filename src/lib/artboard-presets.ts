import { EXPORT_SIZE_PRESETS } from '@/io/export-options'

export type ArtboardSizePreset = {
  id: string
  label: string
  width: number
  height: number
}

export const ARTBOARD_SIZE_PRESETS: ArtboardSizePreset[] = EXPORT_SIZE_PRESETS.filter(
  (preset) => preset.id !== 'custom',
)

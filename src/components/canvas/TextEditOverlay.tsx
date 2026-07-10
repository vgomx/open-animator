import { useEffect, useRef } from 'react'

import { getShapeBounds } from '@/editor/bounds'
import { getAnimatedShape } from '@/editor/animation'
import { useEditorStore } from '@/editor/store'

export function TextEditOverlay() {
  const editingTextLayerId = useEditorStore((state) => state.editingTextLayerId)
  const setEditingTextLayerId = useEditorStore((state) => state.setEditingTextLayerId)
  const updateShape = useEditorStore((state) => state.updateShape)
  const currentTime = useEditorStore((state) => state.currentTime)
  const layers = useEditorStore((state) => state.project.layers)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const layer = editingTextLayerId
    ? layers.find((item) => item.id === editingTextLayerId)
    : null
  const shape = layer && layer.shape.type === 'text' ? getAnimatedShape(layer, currentTime) : null

  useEffect(() => {
    if (!editingTextLayerId) {
      return
    }

    textareaRef.current?.focus()
    textareaRef.current?.select()
  }, [editingTextLayerId])

  if (!layer || !shape || shape.type !== 'text') {
    return null
  }

  const bounds = getShapeBounds(shape)

  const commit = (value: string) => {
    updateShape(layer.id, { text: value })
    setEditingTextLayerId(null)
  }

  return (
    <textarea
      ref={textareaRef}
      data-eyedropper-ignore
      className="absolute z-20 resize-none overflow-hidden border border-primary bg-background/95 p-1 text-foreground shadow-lg outline-none"
      style={{
        left: bounds.x,
        top: bounds.y,
        width: Math.max(bounds.width, 120),
        minHeight: bounds.height,
        fontSize: shape.fontSize,
        fontFamily: shape.fontFamily,
        lineHeight: 1.2,
      }}
      value={shape.text}
      onChange={(event) => updateShape(layer.id, { text: event.target.value }, { skipHistory: true })}
      onBlur={(event) => commit(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          setEditingTextLayerId(null)
          return
        }

        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault()
          commit((event.target as HTMLTextAreaElement).value)
        }
      }}
    />
  )
}

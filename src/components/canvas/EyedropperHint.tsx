import { Pipette } from 'lucide-react'

import { useEditorStore } from '@/editor/store'

export function EyedropperHint() {
  const eyedropperActive = useEditorStore((state) => state.eyedropperActive)
  const cancelEyedropper = useEditorStore((state) => state.cancelEyedropper)

  if (!eyedropperActive) {
    return null
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-40 flex justify-center px-4">
      <div className="glass-panel pointer-events-auto flex items-center gap-2 rounded-full border border-border/60 px-3 py-1.5 text-xs shadow-lg shadow-black/10">
        <Pipette className="size-3.5 text-primary" />
        <span>Click the canvas to sample a color</span>
        <button
          type="button"
          className="rounded-md px-2 py-0.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          onClick={() => cancelEyedropper()}
        >
          Esc
        </button>
      </div>
    </div>
  )
}

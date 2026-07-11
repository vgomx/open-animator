import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type KeyboardShortcutsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SHORTCUTS = [
  { keys: 'V', action: 'Select tool' },
  { keys: 'H', action: 'Hand / pan tool' },
  { keys: 'Z', action: 'Zoom tool (Alt+click to zoom out)' },
  { keys: 'A', action: 'Node edit tool' },
  { keys: 'P', action: 'Pen tool (click-drag for curves, Enter to finish)' },
  { keys: 'R', action: 'Rectangle tool' },
  { keys: 'O', action: 'Ellipse tool' },
  { keys: 'T', action: 'Text tool' },
  { keys: '⌘Z', action: 'Undo' },
  { keys: '⌘⇧Z / ⌘Y', action: 'Redo' },
  { keys: '⌘D', action: 'Duplicate layer' },
  { keys: '⌘2', action: 'Zoom to selection' },
  { keys: '⌘⌥C', action: 'Copy style (fill/stroke)' },
  { keys: '⌘⌥V', action: 'Paste style' },
  { keys: '⌘⇧L', action: 'Toggle lock on selection' },
  { keys: '⌘⇧H', action: 'Toggle visibility on selection' },
  { keys: 'Alt+drag', action: 'Duplicate while dragging' },
  { keys: '[ / ]', action: 'Toggle layers / properties panels' },
  { keys: 'Double-click text', action: 'Edit text inline on canvas' },
  { keys: '⌘C', action: 'Copy keyframes at playhead' },
  { keys: '⌘V', action: 'Paste keyframes at playhead' },
  { keys: 'K', action: 'Play / pause' },
  { keys: 'Delete / Backspace', action: 'Delete layer or selected nodes' },
  { keys: 'Space + drag', action: 'Pan canvas' },
  { keys: 'Middle mouse drag', action: 'Pan canvas' },
  { keys: 'Pinch / ⌃ scroll', action: 'Zoom canvas' },
  { keys: 'Scroll', action: 'Pan canvas' },
  { keys: '?', action: 'Show keyboard shortcuts' },
] as const

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(36rem,calc(100svh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border px-4 py-4">
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Common editor shortcuts for Open Animator.</DialogDescription>
        </DialogHeader>

        <DialogBody className="px-4 py-3">
          <ul className="space-y-2">
          {SHORTCUTS.map((shortcut) => (
            <li
              key={shortcut.action}
              className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 px-3 py-2"
            >
              <span className="text-sm text-muted-foreground">{shortcut.action}</span>
              <kbd className="rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-foreground">
                {shortcut.keys}
              </kbd>
            </li>
          ))}
          </ul>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

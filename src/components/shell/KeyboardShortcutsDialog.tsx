import {
  Dialog,
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
  { keys: '⌘Z', action: 'Undo' },
  { keys: '⌘⇧Z / ⌘Y', action: 'Redo' },
  { keys: '⌘D', action: 'Duplicate layer' },
  { keys: 'Delete / Backspace', action: 'Delete selected layer' },
  { keys: 'Space + drag', action: 'Pan canvas' },
  { keys: 'Middle mouse drag', action: 'Pan canvas' },
  { keys: 'Pinch / ⌃ scroll', action: 'Zoom canvas' },
  { keys: 'Scroll', action: 'Pan canvas' },
  { keys: '?', action: 'Show keyboard shortcuts' },
] as const

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Common editor shortcuts for Open Animator.</DialogDescription>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  )
}

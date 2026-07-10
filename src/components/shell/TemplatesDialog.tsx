import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PROJECT_TEMPLATES } from '@/lib/templates'
import type { Project } from '@/editor/types'

type TemplatesDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectTemplate: (project: Project) => void
}

export function TemplatesDialog({ open, onOpenChange, onSelectTemplate }: TemplatesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Example projects</DialogTitle>
          <DialogDescription>
            Start from a template to explore keyframes and playback quickly.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2">
          {PROJECT_TEMPLATES.map((template) => (
            <li key={template.id}>
              <button
                type="button"
                onClick={() => {
                  onSelectTemplate(template.project)
                  onOpenChange(false)
                }}
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/50"
              >
                <p className="font-medium text-foreground">{template.name}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{template.description}</p>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ACKNOWLEDGMENTS } from '@/lib/acknowledgments'
import { APP_NAME } from '@/lib/app'

type AcknowledgmentsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AcknowledgmentsDialog({ open, onOpenChange }: AcknowledgmentsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(32rem,calc(100svh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border px-4 py-4">
          <DialogTitle>Open source acknowledgments</DialogTitle>
          <DialogDescription>
            {APP_NAME} is built with the following open source software.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[min(24rem,calc(100svh-10rem))] px-4 py-3">
          <ul className="space-y-2">
            {ACKNOWLEDGMENTS.map((item) => (
              <li
                key={item.name}
                className="rounded-lg border border-border bg-muted/30 px-3 py-2.5"
              >
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  {item.name}
                </a>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.license}</p>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

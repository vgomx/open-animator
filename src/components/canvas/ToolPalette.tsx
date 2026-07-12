import { Fragment } from 'react'

import { EDITOR_TOOLS, type EditorTool } from '@/editor/tools'
import { useEditorStore } from '@/editor/store'
import { Button } from '@/components/ui/button'
import { ToolbarDivider } from '@/components/ui/toolbar-divider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const TOOL_GROUPS: EditorTool[][] = [
  ['select', 'hand', 'zoom'],
  ['node', 'pen'],
  ['rect', 'ellipse', 'text'],
]

export function ToolPalette() {
  const activeTool = useEditorStore((state) => state.activeTool)
  const setActiveTool = useEditorStore((state) => state.setActiveTool)

  const toolsById = new Map(EDITOR_TOOLS.map((tool) => [tool.id, tool]))

  return (
    <div className="editor-shell__tool-palette pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
      <aside
        className="glass-tool-palette pointer-events-auto flex items-center gap-0.5 rounded-xl border p-1"
        aria-label="Tools"
      >
        {TOOL_GROUPS.map((group, groupIndex) => (
          <Fragment key={group.join('-')}>
            {groupIndex > 0 ? <ToolbarDivider size="palette" /> : null}
            <div className="flex items-center gap-0.5">
              {group.map((toolId) => {
                const tool = toolsById.get(toolId)
                if (!tool) {
                  return null
                }

                const Icon = tool.icon
                const isActive = activeTool === tool.id

                return (
                  <Tooltip key={tool.id}>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant={isActive ? 'secondary' : 'ghost'}
                        size="icon-sm"
                        className={cn('size-8 rounded-lg', isActive && 'ring-1 ring-primary/40')}
                        onClick={() => setActiveTool(tool.id)}
                      >
                        <Icon className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {tool.label} ({tool.shortcut})
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </Fragment>
        ))}
      </aside>
    </div>
  )
}

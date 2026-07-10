import { useEditorStore } from '@/editor/store'
import { ShapeView } from '@/components/canvas/ShapeView'

export function Stage() {
  const project = useEditorStore((state) => state.project)
  const currentTime = useEditorStore((state) => state.currentTime)
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId)
  const setSelectedLayerId = useEditorStore((state) => state.setSelectedLayerId)
  const getAnimatedShape = useEditorStore((state) => state.getAnimatedShape)
  const zoom = useEditorStore((state) => state.zoom)

  const { width, height } = project.artboard

  return (
    <div className="relative flex h-full flex-1 items-center justify-center overflow-hidden bg-[#0b0f17]">
      <div
        className="relative shadow-2xl ring-1 ring-white/10"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="block bg-[#111827]"
          style={{
            backgroundImage:
              'linear-gradient(45deg, #1f2937 25%, transparent 25%), linear-gradient(-45deg, #1f2937 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1f2937 75%), linear-gradient(-45deg, transparent 75%, #1f2937 75%)',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
          }}
        >
          {project.layers.map((layer) => {
            if (!layer.visible) {
              return null
            }

            const animatedShape = getAnimatedShape(layer, currentTime)
            const isSelected = layer.id === selectedLayerId

            return (
              <g
                key={layer.id}
                onClick={(event) => {
                  event.stopPropagation()
                  setSelectedLayerId(layer.id)
                }}
                className="cursor-pointer"
              >
                <ShapeView shape={animatedShape} />
                {isSelected ? (
                  <rect
                    x={animatedShape.x - 6}
                    y={animatedShape.y - 6}
                    width={
                      animatedShape.type === 'rect'
                        ? animatedShape.width + 12
                        : animatedShape.rx * 2 + 12
                    }
                    height={
                      animatedShape.type === 'rect'
                        ? animatedShape.height + 12
                        : animatedShape.ry * 2 + 12
                    }
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                    pointerEvents="none"
                  />
                ) : null}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

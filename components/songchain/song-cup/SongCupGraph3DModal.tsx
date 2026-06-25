"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { SongCupGroupMember } from "@/hooks/useSongCupGroupMembers";

const NODE_COUNT = 12;
const DEPTH = 80;

function generateNodes(members: SongCupGroupMember[]) {
  const count = Math.max(members.length, NODE_COUNT);
  return Array.from({ length: count }, (_, i) => {
    const t = (i / count) * Math.PI * 2;
    const r = 120 + Math.random() * 60;
    const x = Math.cos(t) * r;
    const y = Math.sin(t) * r;
    const z = (Math.random() - 0.5) * DEPTH;
    return { x, y, z, label: members[i]?.username ?? `Member ${i + 1}` };
  });
}

export function SongCupGraph3DModal({
  open,
  onOpenChange,
  members,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  members: SongCupGroupMember[];
}) {
  const nodes = generateNodes(members);
  const center = { x: 0, y: 0, z: 0 };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden border-fuchsia-500/30 bg-black p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-white">Song Cup member graph</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {members.length} Lens identities connected through the Song Cup club.
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-[60vh] w-full overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            3-D view
          </div>
          <svg
            viewBox="-240 -180 480 360"
            className="h-full w-full animate-[spin_24s_linear_infinite]"
            style={{ transformStyle: "preserve-3d" }}
          >
            <defs>
              <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FD00D7" />
                <stop offset="100%" stopColor="#FEED01" />
              </radialGradient>
            </defs>

            {nodes.map((node, i) => {
              const scale = 0.65 + 0.35 * ((node.z + DEPTH / 2) / DEPTH);
              const opacity = 0.55 + 0.45 * ((node.z + DEPTH / 2) / DEPTH);
              return (
                <g key={i} opacity={opacity}>
                  <line
                    x1={center.x}
                    y1={center.y}
                    x2={node.x}
                    y2={node.y}
                    stroke="#FD00D7"
                    strokeWidth={1 * scale}
                    strokeOpacity={0.45}
                  />
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={8 * scale}
                    fill="url(#node-glow)"
                    stroke="white"
                    strokeWidth={1 * scale}
                  />
                  <text
                    x={node.x}
                    y={node.y + 18 * scale}
                    textAnchor="middle"
                    fill="white"
                    fontSize={9 * scale}
                    fontWeight={600}
                  >
                    {node.label.slice(0, 12)}
                    {node.label.length > 12 ? "…" : ""}
                  </text>
                </g>
              );
            })}

            <circle cx={center.x} cy={center.y} r={14} fill="#FD00D7" stroke="white" strokeWidth={2} />
            <text x={center.x} y={center.y + 4} textAnchor="middle" fill="white" fontSize={10} fontWeight={700}>
              CLUB
            </text>
          </svg>
        </div>
      </DialogContent>
    </Dialog>
  );
}

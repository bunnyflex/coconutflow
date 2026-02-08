# MagicUI Integration — Visual Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate MagicUI components to make CoconutFlow's execution feel alive, the sidebar feel polished, and the chat panel feel responsive.

**Architecture:** Copy-paste MagicUI component source files into `frontend/src/components/ui/magicui/`. All components use Tailwind CSS + the `motion` library (successor to framer-motion). A shared `cn()` utility is required. No shadcn CLI needed — we copy source directly.

**Tech Stack:** React 18, Tailwind CSS 4, `motion` (framer-motion successor), `clsx` + `tailwind-merge`

---

## Task 1: Install Dependencies & Create Utility

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/lib/utils.ts`
- Modify: `frontend/src/index.css` (add keyframes)

**Step 1: Install npm packages**

Run:
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend && PATH="/opt/homebrew/bin:$PATH" npm install motion clsx tailwind-merge
```
Expected: 3 packages added

**Step 2: Create the `cn()` utility**

Create `frontend/src/lib/utils.ts`:
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Step 3: Add CSS keyframes to `frontend/src/index.css`**

Add at the end of the file (after existing styles):
```css
/* MagicUI Keyframes */
@keyframes shimmer-slide {
  to {
    transform: translate(calc(100cqw - 100%), 0);
  }
}

@keyframes spin-around {
  0% {
    transform: translateZ(0) rotate(0);
  }
  15%, 35% {
    transform: translateZ(0) rotate(90deg);
  }
  65%, 85% {
    transform: translateZ(0) rotate(270deg);
  }
  100% {
    transform: translateZ(0) rotate(360deg);
  }
}

@keyframes shine {
  0% {
    background-position: 0% 0%;
  }
  50% {
    background-position: 100% 100%;
  }
  to {
    background-position: 0% 0%;
  }
}

@keyframes rippling {
  0% {
    opacity: 1;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

@keyframes blink-cursor {
  0%, 49% {
    opacity: 1;
  }
  50%, 100% {
    opacity: 0;
  }
}

/* MagicUI Animation Utilities */
@utility animate-shimmer-slide {
  animation: shimmer-slide var(--speed) ease-in-out infinite alternate;
}

@utility animate-spin-around {
  animation: spin-around calc(var(--speed) * 2) infinite linear;
}

@utility animate-shine {
  animation: shine var(--duration) infinite linear;
}

@utility animate-rippling {
  animation: rippling var(--duration) ease-out;
}

@utility animate-blink-cursor {
  animation: blink-cursor 1.2s step-end infinite;
}
```

**Step 4: Verify the dev server still works**

Run:
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend && PATH="/opt/homebrew/bin:$PATH" npx tsc --noEmit --project tsconfig.app.json
```
Expected: No new errors (existing ones are OK)

**Step 5: Commit**
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main && git add frontend/package.json frontend/package-lock.json frontend/src/lib/utils.ts frontend/src/index.css && git commit -m "chore: add MagicUI dependencies and cn() utility"
```

---

## Task 2: Shimmer Button — Run Button (Phase 1)

**Files:**
- Create: `frontend/src/components/ui/magicui/shimmer-button.tsx`
- Modify: `frontend/src/components/canvas/Toolbar.tsx`

**Step 1: Create the ShimmerButton component**

Create `frontend/src/components/ui/magicui/shimmer-button.tsx`:
```tsx
import React, { type ComponentPropsWithoutRef, type CSSProperties } from "react";
import { cn } from "../../../lib/utils";

export interface ShimmerButtonProps extends ComponentPropsWithoutRef<"button"> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  className?: string;
  children?: React.ReactNode;
}

export const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor = "#ffffff",
      shimmerSize = "0.05em",
      shimmerDuration = "3s",
      borderRadius = "100px",
      background = "rgba(0, 0, 0, 1)",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        style={
          {
            "--spread": "90deg",
            "--shimmer-color": shimmerColor,
            "--radius": borderRadius,
            "--speed": shimmerDuration,
            "--cut": shimmerSize,
            "--bg": background,
          } as CSSProperties
        }
        className={cn(
          "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/10 px-6 py-3 text-white [background:var(--bg)] [border-radius:var(--radius)]",
          "transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px",
          className,
        )}
        ref={ref}
        {...props}
      >
        {/* shimmer */}
        <div className={cn("-z-30 blur-[2px]", "absolute inset-0 overflow-visible [container-type:size]")}>
          <div className="animate-shimmer-slide absolute inset-0 h-[100cqh] [aspect-ratio:1] [border-radius:0] [mask:none]">
            <div className="animate-spin-around absolute -inset-full w-auto rotate-0 [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))] [translate:0_0]" />
          </div>
        </div>
        {children}
        {/* highlight */}
        <div
          className={cn(
            "insert-0 absolute size-full",
            "rounded-2xl px-4 py-1.5 text-sm font-medium shadow-[inset_0_-8px_10px_#ffffff1f]",
            "transform-gpu transition-all duration-300 ease-in-out",
            "group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]",
            "group-active:shadow-[inset_0_-10px_10px_#ffffff3f]",
          )}
        />
        {/* bg */}
        <div className={cn("absolute -z-20 [background:var(--bg)] [border-radius:var(--radius)] [inset:var(--cut)]")} />
      </button>
    );
  },
);
ShimmerButton.displayName = "ShimmerButton";
```

**Step 2: Replace the Run button in Toolbar.tsx**

In `frontend/src/components/canvas/Toolbar.tsx`:

Add import at top:
```typescript
import { ShimmerButton } from '../ui/magicui/shimmer-button';
```

Replace lines 77-98 (the existing Run button) with:
```tsx
      {isRunning ? (
        <button
          disabled
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white opacity-80 cursor-not-allowed"
        >
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Running...
        </button>
      ) : (
        <ShimmerButton
          onClick={handleRun}
          disabled={nodes.length === 0}
          shimmerColor="#a5b4fc"
          background="rgba(79, 70, 229, 1)"
          borderRadius="8px"
          shimmerDuration="2.5s"
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.344-5.891a1.5 1.5 0 000-2.538L6.3 2.841z" />
          </svg>
          Run
        </ShimmerButton>
      )}
```

**Step 3: Verify TypeScript compiles**

Run:
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend && PATH="/opt/homebrew/bin:$PATH" /opt/homebrew/bin/node node_modules/.bin/tsc --noEmit --project tsconfig.app.json
```
Expected: No new errors

**Step 4: Visual verification**

Open browser at http://localhost:5173, verify:
- Run button has a shimmering sweep animation
- Shimmer color is indigo-ish (#a5b4fc)
- Button still works when clicked
- Disabled state (no nodes) still grays out

**Step 5: Commit**
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main && git add frontend/src/components/ui/magicui/shimmer-button.tsx frontend/src/components/canvas/Toolbar.tsx && git commit -m "feat: shimmer button for Run action in toolbar"
```

---

## Task 3: Border Beam — Running Nodes Glow (Phase 1)

**Files:**
- Create: `frontend/src/components/ui/magicui/border-beam.tsx`
- Modify: `frontend/src/components/nodes/NodeShell.tsx`

**Step 1: Create the BorderBeam component**

Create `frontend/src/components/ui/magicui/border-beam.tsx`:
```tsx
"use client";

import { motion, type Transition } from "motion/react";
import { cn } from "../../../lib/utils";

interface BorderBeamProps {
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  transition?: Transition;
  className?: string;
  style?: React.CSSProperties;
  reverse?: boolean;
  initialOffset?: number;
  borderWidth?: number;
}

export function BorderBeam({
  className,
  size = 50,
  delay = 0,
  duration = 6,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  transition,
  style,
  reverse = false,
  initialOffset = 0,
  borderWidth = 1.5,
}: BorderBeamProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0 rounded-[inherit]"
      style={{
        border: `${borderWidth}px solid transparent`,
        mask: "linear-gradient(transparent, transparent), linear-gradient(#000, #000)",
        maskClip: "padding-box, border-box",
        maskComposite: "intersect",
        WebkitMask: "linear-gradient(transparent, transparent), linear-gradient(#000, #000)",
        WebkitMaskClip: "padding-box, border-box",
        WebkitMaskComposite: "xor",
      }}
    >
      <motion.div
        className={cn("absolute aspect-square bg-gradient-to-l from-[var(--color-from)] via-[var(--color-to)] to-transparent", className)}
        style={
          {
            width: size,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            "--color-from": colorFrom,
            "--color-to": colorTo,
            ...style,
          } as React.CSSProperties
        }
        initial={{ offsetDistance: `${initialOffset}%` }}
        animate={{
          offsetDistance: reverse
            ? [`${100 - initialOffset}%`, `${-initialOffset}%`]
            : [`${initialOffset}%`, `${100 + initialOffset}%`],
        }}
        transition={{
          repeat: Infinity,
          ease: "linear",
          duration,
          delay: -delay,
          ...transition,
        }}
      />
    </div>
  );
}
```

**Step 2: Add BorderBeam to NodeShell when running**

In `frontend/src/components/nodes/NodeShell.tsx`:

Add import at top:
```typescript
import { BorderBeam } from '../ui/magicui/border-beam';
```

Replace the `running` entry in `STATUS_BADGES` (lines 23-26):
```tsx
  running: (
    <>
      <span className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
        <span className="h-2 w-2 animate-ping rounded-full bg-white" />
      </span>
      <BorderBeam
        size={60}
        duration={3}
        colorFrom="#3b82f6"
        colorTo="#6366f1"
        borderWidth={2}
      />
    </>
  ),
```

**Step 3: Verify TypeScript compiles**

Run:
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend && PATH="/opt/homebrew/bin:$PATH" /opt/homebrew/bin/node node_modules/.bin/tsc --noEmit --project tsconfig.app.json
```
Expected: No new errors

**Step 4: Visual verification**

Open browser, run a flow. Verify:
- While a node is in "running" state, a light beam travels around its border
- Beam colors are blue (#3b82f6) to indigo (#6366f1)
- The ping badge still appears at top-right
- Beam disappears when node completes

**Step 5: Commit**
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main && git add frontend/src/components/ui/magicui/border-beam.tsx frontend/src/components/nodes/NodeShell.tsx && git commit -m "feat: border beam animation on running nodes"
```

---

## Task 4: Confetti — Flow Completion Celebration (Phase 1)

**Files:**
- Create: `frontend/src/components/ui/magicui/confetti.tsx`
- Modify: `frontend/src/services/websocket.ts`

**Step 1: Install canvas-confetti**

Run:
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend && PATH="/opt/homebrew/bin:$PATH" npm install canvas-confetti && npm install -D @types/canvas-confetti
```

**Step 2: Create confetti trigger utility**

Create `frontend/src/components/ui/magicui/confetti.tsx`:
```tsx
import confetti from "canvas-confetti";

export function fireConfetti() {
  const end = Date.now() + 300;

  const frame = () => {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ["#6366f1", "#3b82f6", "#22c55e", "#a5b4fc"],
    });
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ["#6366f1", "#3b82f6", "#22c55e", "#a5b4fc"],
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  frame();
}
```

**Step 3: Trigger confetti on flow_complete**

In `frontend/src/services/websocket.ts`, add import at top:
```typescript
import { fireConfetti } from '../components/ui/magicui/confetti';
```

In the `handleEvent` method, modify the `flow_complete` case (around line 167):
```typescript
      case 'flow_complete':
        store.setIsRunning(false);
        fireConfetti();
        break;
```

**Step 4: Verify TypeScript compiles**

Run:
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend && PATH="/opt/homebrew/bin:$PATH" /opt/homebrew/bin/node node_modules/.bin/tsc --noEmit --project tsconfig.app.json
```

**Step 5: Visual verification**

Run a flow via Chat or Run button. On completion, confetti should burst from both sides of the screen using indigo/blue/green colors matching the theme.

**Step 6: Commit**
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main && git add frontend/src/components/ui/magicui/confetti.tsx frontend/src/services/websocket.ts frontend/package.json frontend/package-lock.json && git commit -m "feat: confetti celebration on flow completion"
```

---

## Task 5: Magic Card — Sidebar Node Cards (Phase 2)

**Files:**
- Create: `frontend/src/components/ui/magicui/magic-card.tsx`
- Modify: `frontend/src/components/panels/NodeSidebar.tsx`

**Step 1: Create the MagicCard component**

Create `frontend/src/components/ui/magicui/magic-card.tsx`:
```tsx
"use client";

import React, { useCallback, useEffect } from "react";
import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import { cn } from "../../../lib/utils";

interface MagicCardProps {
  children?: React.ReactNode;
  className?: string;
  gradientSize?: number;
  gradientColor?: string;
  gradientOpacity?: number;
  gradientFrom?: string;
  gradientTo?: string;
}

export function MagicCard({
  children,
  className,
  gradientSize = 150,
  gradientColor = "#1e1b4b",
  gradientOpacity = 0.8,
  gradientFrom = "#6366f1",
  gradientTo = "#3b82f6",
}: MagicCardProps) {
  const mouseX = useMotionValue(-gradientSize);
  const mouseY = useMotionValue(-gradientSize);

  const reset = useCallback(() => {
    mouseX.set(-gradientSize);
    mouseY.set(-gradientSize);
  }, [gradientSize, mouseX, mouseY]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    },
    [mouseX, mouseY],
  );

  useEffect(() => {
    reset();
  }, [reset]);

  return (
    <div
      className={cn("group relative rounded-[inherit]", className)}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
    >
      {/* Border gradient on hover */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientFrom}, ${gradientTo}, transparent 100%)`,
        }}
      />
      {/* Background fill */}
      <div className="absolute inset-px rounded-[inherit] bg-gray-800" />
      {/* Spotlight on hover */}
      <motion.div
        className="pointer-events-none absolute inset-px rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientColor}, transparent 100%)`,
          opacity: gradientOpacity,
        }}
      />
      {/* Content */}
      <div className="relative">{children}</div>
    </div>
  );
}
```

**Step 2: Wrap DraggableNode cards with MagicCard**

In `frontend/src/components/panels/NodeSidebar.tsx`:

Add import:
```typescript
import { MagicCard } from '../ui/magicui/magic-card';
```

Replace the `DraggableNode` component (lines 12-31) with:
```tsx
function DraggableNode({ info }: { info: NodeTypeInfo }) {
  const onDragStart = (event: DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/agnoflow-node', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <MagicCard
      className="rounded-lg border border-gray-700"
      gradientSize={120}
      gradientColor="#1e1b4b"
      gradientFrom="#6366f1"
      gradientTo="#3b82f6"
      gradientOpacity={0.6}
    >
      <div
        draggable
        onDragStart={(e) => onDragStart(e, info.type)}
        className="flex cursor-grab items-center gap-3 px-3 py-2.5 active:cursor-grabbing"
      >
        <span className="text-lg">{info.icon}</span>
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-200">{info.label}</div>
          <div className="truncate text-xs text-gray-500">{info.description}</div>
        </div>
      </div>
    </MagicCard>
  );
}
```

**Step 3: Verify TypeScript compiles and visually check**

Run TypeScript check, then open browser and hover over sidebar node cards — a radial spotlight should follow the cursor.

**Step 4: Commit**
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main && git add frontend/src/components/ui/magicui/magic-card.tsx frontend/src/components/panels/NodeSidebar.tsx && git commit -m "feat: magic card hover effect on sidebar nodes"
```

---

## Task 6: Blur Fade — Config Panel Entrance (Phase 2)

**Files:**
- Create: `frontend/src/components/ui/magicui/blur-fade.tsx`
- Modify: `frontend/src/components/panels/ConfigPanel.tsx`

**Step 1: Create the BlurFade component**

Create `frontend/src/components/ui/magicui/blur-fade.tsx`:
```tsx
"use client";

import { useRef } from "react";
import {
  AnimatePresence,
  motion,
  type MotionProps,
  type Variants,
} from "motion/react";

interface BlurFadeProps extends MotionProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  offset?: number;
  direction?: "up" | "down" | "left" | "right";
  blur?: string;
}

export function BlurFade({
  children,
  className,
  duration = 0.3,
  delay = 0,
  offset = 8,
  direction = "right",
  blur = "6px",
  ...props
}: BlurFadeProps) {
  const defaultVariants: Variants = {
    hidden: {
      [direction === "left" || direction === "right" ? "x" : "y"]:
        direction === "right" || direction === "down" ? -offset : offset,
      opacity: 0,
      filter: `blur(${blur})`,
    },
    visible: {
      [direction === "left" || direction === "right" ? "x" : "y"]: 0,
      opacity: 1,
      filter: "blur(0px)",
    },
  };

  return (
    <AnimatePresence>
      <motion.div
        initial="hidden"
        animate="visible"
        exit="hidden"
        variants={defaultVariants}
        transition={{ delay, duration, ease: "easeOut" }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

**Step 2: Wrap ConfigPanel content with BlurFade**

In `frontend/src/components/panels/ConfigPanel.tsx`:

Add import:
```typescript
import { BlurFade } from '../ui/magicui/blur-fade';
```

Replace the return statement (lines 37-92). Wrap the `<aside>` contents with `BlurFade`:
```tsx
  return (
    <aside className="flex w-80 flex-col border-l border-gray-800 bg-gray-900">
      <BlurFade direction="left" duration={0.25} offset={12}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-white">{selectedNode.data.label}</h2>
            <p className="text-xs text-gray-500">{nodeType} node</p>
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4">
          {FormComponent && (
            <FormComponent nodeId={selectedNode.id} config={config} onChange={handleChange} />
          )}
        </div>

        {/* Output preview */}
        {selectedNode.data.output && (
          <div className="border-t border-gray-800 p-4">
            <h3 className="mb-1 text-xs font-semibold uppercase text-gray-500">Output</h3>
            <div className="max-h-32 overflow-y-auto rounded bg-gray-800 p-2 text-xs text-gray-300 whitespace-pre-wrap">
              {selectedNode.data.output}
            </div>
          </div>
        )}

        {/* Error display */}
        {selectedNode.data.error && (
          <div className="border-t border-red-900/50 bg-red-950/30 p-4">
            <h3 className="mb-1 text-xs font-semibold uppercase text-red-400">Error</h3>
            <div className="text-xs text-red-300">{selectedNode.data.error}</div>
          </div>
        )}

        {/* Delete button */}
        <div className="border-t border-gray-800 p-4">
          <button
            onClick={() => {
              removeNode(selectedNode.id);
            }}
            className="w-full rounded-lg border border-red-800 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-950"
          >
            Delete Node
          </button>
        </div>
      </BlurFade>
    </aside>
  );
```

**Step 3: Verify and commit**
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main && git add frontend/src/components/ui/magicui/blur-fade.tsx frontend/src/components/panels/ConfigPanel.tsx && git commit -m "feat: blur fade entrance animation on config panel"
```

---

## Task 7: Typing Animation — Chat Responses (Phase 2)

**Files:**
- Create: `frontend/src/components/ui/magicui/typing-animation.tsx`
- Modify: `frontend/src/components/panels/ChatPanel.tsx`

**Step 1: Create a simplified TypingAnimation component**

Create `frontend/src/components/ui/magicui/typing-animation.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { cn } from "../../../lib/utils";

interface TypingAnimationProps {
  text: string;
  className?: string;
  speed?: number;
  onComplete?: () => void;
}

export function TypingAnimation({
  text,
  className,
  speed = 15,
  onComplete,
}: TypingAnimationProps) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setDone(true);
        onComplete?.();
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <span className={cn(className)}>
      {displayed}
      {!done && <span className="animate-blink-cursor ml-0.5 inline-block h-4 w-[2px] bg-gray-400 align-middle" />}
    </span>
  );
}
```

**Step 2: Use typing animation for the latest assistant message**

In `frontend/src/components/panels/ChatPanel.tsx`, add import:
```typescript
import { TypingAnimation } from '../ui/magicui/typing-animation';
```

In the `MessageBubble` component, modify the assistant message rendering. Replace lines 150-155:
```tsx
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : isSystem ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : message.isLatest ? (
          <TypingAnimation text={message.content} speed={12} />
        ) : (
          <div className="prose prose-sm prose-invert max-w-none break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_li]:my-0.5 [&_ol]:my-1 [&_ul]:my-1 [&_p]:my-1">
            <Markdown>{message.content}</Markdown>
          </div>
        )}
```

Note: We need to add an `isLatest` field to messages. In the `handleSend` function, when adding the assistant message, mark it:
```typescript
addMessage('assistant', assistantResponse, true); // true = isLatest
```

And update the `addChatMessage` function in `flowStore.ts` to accept an optional `isLatest` param, and clear `isLatest` on previous messages.

**Alternative simpler approach:** Instead of modifying the store, just check if the message is the last assistant message:

In `ChatPanel.tsx`, pass the index to MessageBubble and check if it's the last assistant message:
```tsx
{messages.map((msg, idx) => (
  <MessageBubble
    key={msg.id}
    message={msg}
    isLatest={msg.role === 'assistant' && idx === messages.length - 1}
  />
))}
```

Update `MessageBubble` props:
```tsx
function MessageBubble({ message, isLatest = false }: { message: ChatMessage; isLatest?: boolean }) {
```

**Step 3: Verify and commit**
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main && git add frontend/src/components/ui/magicui/typing-animation.tsx frontend/src/components/panels/ChatPanel.tsx && git commit -m "feat: typing animation for chat assistant responses"
```

---

## Task 8: Particles — Canvas Background (Phase 3)

**Files:**
- Create: `frontend/src/components/ui/magicui/particles.tsx`
- Modify: `frontend/src/components/canvas/FlowCanvas.tsx`

**Step 1: Create the Particles component**

Create `frontend/src/components/ui/magicui/particles.tsx` — this is the canvas-based particle system (~200 lines). Copy the full source from the MagicUI registry. Key configuration for CoconutFlow's dark theme:

```tsx
"use client";

import React, {
  type ComponentPropsWithoutRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { cn } from "../../../lib/utils";

// Circle interface for particle state
interface Circle {
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  dx: number;
  dy: number;
  magnetism: number;
}

interface ParticlesProps extends ComponentPropsWithoutRef<"div"> {
  className?: string;
  quantity?: number;
  staticity?: number;
  ease?: number;
  size?: number;
  refresh?: boolean;
  color?: string;
  vx?: number;
  vy?: number;
}

function hexToRgb(hex: string): number[] {
  hex = hex.replace("#", "");
  if (hex.length === 3) {
    hex = hex.split("").map((c) => c + c).join("");
  }
  const num = parseInt(hex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export const Particles: React.FC<ParticlesProps> = ({
  className = "",
  quantity = 60,
  staticity = 50,
  ease = 50,
  size = 0.4,
  refresh = false,
  color = "#6366f1",
  vx = 0,
  vy = 0,
  ...props
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const context = useRef<CanvasRenderingContext2D | null>(null);
  const circles = useRef<Circle[]>([]);
  const mouse = useRef({ x: 0, y: 0 });
  const canvasSize = useRef({ w: 0, h: 0 });
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;

  const rgb = hexToRgb(color);

  const circleParams = useCallback((): Circle => {
    const w = canvasSize.current.w;
    const h = canvasSize.current.h;
    return {
      x: Math.floor(Math.random() * w),
      y: Math.floor(Math.random() * h),
      translateX: 0,
      translateY: 0,
      size: Math.floor(Math.random() * 2) + size,
      alpha: 0,
      targetAlpha: parseFloat((Math.random() * 0.6 + 0.1).toFixed(1)),
      dx: (Math.random() - 0.5) * 0.1,
      dy: (Math.random() - 0.5) * 0.1,
      magnetism: 0.1 + Math.random() * 4,
    };
  }, [size]);

  const drawCircle = useCallback(
    (circle: Circle, update = false) => {
      if (!context.current) return;
      const { x, y, translateX, translateY, size: s, alpha } = circle;
      context.current.translate(translateX, translateY);
      context.current.beginPath();
      context.current.arc(x, y, s, 0, 2 * Math.PI);
      context.current.fillStyle = `rgba(${rgb.join(", ")}, ${alpha})`;
      context.current.fill();
      context.current.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
    [rgb, dpr],
  );

  const initCanvas = useCallback(() => {
    if (!canvasContainerRef.current || !canvasRef.current) return;
    circles.current = [];
    canvasSize.current.w = canvasContainerRef.current.offsetWidth;
    canvasSize.current.h = canvasContainerRef.current.offsetHeight;
    canvasRef.current.width = canvasSize.current.w * dpr;
    canvasRef.current.height = canvasSize.current.h * dpr;
    canvasRef.current.style.width = `${canvasSize.current.w}px`;
    canvasRef.current.style.height = `${canvasSize.current.h}px`;
    context.current = canvasRef.current.getContext("2d");
    if (context.current) context.current.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [dpr]);

  const animate = useCallback(() => {
    if (!context.current) return;
    context.current.clearRect(0, 0, canvasSize.current.w, canvasSize.current.h);
    circles.current.forEach((circle, i) => {
      // Handle alpha
      const edge = [
        circle.x + circle.translateX - circle.size,
        canvasSize.current.w - circle.x - circle.translateX - circle.size,
        circle.y + circle.translateY - circle.size,
        canvasSize.current.h - circle.y - circle.translateY - circle.size,
      ];
      const closestEdge = Math.min(...edge);
      const remapClosestEdge = parseFloat(
        Math.min(Math.max(closestEdge / 20, 0), 1).toFixed(2),
      );
      if (remapClosestEdge > 1) {
        circle.alpha += 0.02;
        if (circle.alpha > circle.targetAlpha) circle.alpha = circle.targetAlpha;
      } else {
        circle.alpha = circle.targetAlpha * remapClosestEdge;
      }
      circle.x += circle.dx + vx;
      circle.y += circle.dy + vy;
      circle.translateX +=
        (mouse.current.x / (staticity / circle.magnetism) - circle.translateX) / ease;
      circle.translateY +=
        (mouse.current.y / (staticity / circle.magnetism) - circle.translateY) / ease;

      drawCircle(circle, true);

      // Recycle off-screen circles
      if (
        circle.x < -circle.size ||
        circle.x > canvasSize.current.w + circle.size ||
        circle.y < -circle.size ||
        circle.y > canvasSize.current.h + circle.size
      ) {
        circles.current.splice(i, 1);
        const newCircle = circleParams();
        drawCircle(newCircle);
        circles.current.push(newCircle);
      }
    });
    window.requestAnimationFrame(animate);
  }, [drawCircle, circleParams, ease, staticity, vx, vy]);

  useEffect(() => {
    initCanvas();
    for (let i = 0; i < quantity; i++) {
      const circle = circleParams();
      drawCircle(circle);
      circles.current.push(circle);
    }
    animate();

    const handleResize = () => initCanvas();
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const { w, h } = canvasSize.current;
      const x = e.clientX - rect.left - w / 2;
      const y = e.clientY - rect.top - h / 2;
      mouse.current = { x, y };
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [initCanvas, animate, circleParams, drawCircle, quantity, refresh]);

  return (
    <div ref={canvasContainerRef} className={cn("pointer-events-none absolute inset-0", className)} {...props}>
      <canvas ref={canvasRef} className="size-full" />
    </div>
  );
};
```

**Step 2: Add Particles behind the ReactFlow canvas**

In `frontend/src/components/canvas/FlowCanvas.tsx`:

Add import:
```typescript
import { Particles } from '../ui/magicui/particles';
```

Inside the return, add Particles just before the `<ReactFlow>` component:
```tsx
    <div ref={reactFlowWrapper} className="relative h-full w-full">
      <Toolbar />
      <Particles
        className="absolute inset-0 z-0"
        quantity={40}
        color="#6366f1"
        size={0.3}
        staticity={80}
        ease={80}
      />
      <ReactFlow
```

Note: Add `relative` to the wrapper div and ensure ReactFlow sits above particles with proper z-indexing. Also add `className="bg-gray-950/80"` to ReactFlow to let particles show through slightly (semi-transparent background).

**Step 3: Verify and commit**
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main && git add frontend/src/components/ui/magicui/particles.tsx frontend/src/components/canvas/FlowCanvas.tsx && git commit -m "feat: floating particles on canvas background"
```

---

## Task 9: Shine Border — Toolbar Glow (Phase 3)

**Files:**
- Create: `frontend/src/components/ui/magicui/shine-border.tsx`
- Modify: `frontend/src/components/canvas/Toolbar.tsx`

**Step 1: Create the ShineBorder component**

Create `frontend/src/components/ui/magicui/shine-border.tsx`:
```tsx
import * as React from "react";
import { cn } from "../../../lib/utils";

interface ShineBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  borderWidth?: number;
  duration?: number;
  shineColor?: string | string[];
}

export function ShineBorder({
  borderWidth = 1,
  duration = 14,
  shineColor = "#6366f1",
  className,
  style,
  ...props
}: ShineBorderProps) {
  return (
    <div
      style={{
        "--border-width": `${borderWidth}px`,
        "--duration": `${duration}s`,
        backgroundImage: `radial-gradient(transparent,transparent, ${
          Array.isArray(shineColor) ? shineColor.join(",") : shineColor
        },transparent,transparent)`,
        backgroundSize: "300% 300%",
        mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
        padding: "var(--border-width)",
        ...style,
      } as React.CSSProperties}
      className={cn(
        "motion-safe:animate-shine pointer-events-none absolute inset-0 size-full rounded-[inherit] will-change-[background-position]",
        className,
      )}
      {...props}
    />
  );
}
```

**Step 2: Add ShineBorder to the Toolbar container**

In `frontend/src/components/canvas/Toolbar.tsx`:

Add import:
```typescript
import { ShineBorder } from '../ui/magicui/shine-border';
```

Modify the toolbar container div (line 75). Add `relative` to its classes and insert `<ShineBorder />` as first child:
```tsx
    <div className="relative absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-gray-700 bg-gray-900/90 px-3 py-2 shadow-lg backdrop-blur-sm">
      <ShineBorder shineColor={["#6366f1", "#3b82f6"]} duration={10} borderWidth={1} />
      {/* Run */}
```

**Step 3: Verify and commit**
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main && git add frontend/src/components/ui/magicui/shine-border.tsx frontend/src/components/canvas/Toolbar.tsx && git commit -m "feat: shine border animation on toolbar"
```

---

## Task 10: Ripple Button — Chat Send Button (Phase 3)

**Files:**
- Create: `frontend/src/components/ui/magicui/ripple-button.tsx`
- Modify: `frontend/src/components/panels/ChatPanel.tsx`

**Step 1: Create the RippleButton component**

Create `frontend/src/components/ui/magicui/ripple-button.tsx`:
```tsx
"use client";

import React, { type MouseEvent, useEffect, useState } from "react";
import { cn } from "../../../lib/utils";

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  rippleColor?: string;
  duration?: string;
}

export const RippleButton = React.forwardRef<HTMLButtonElement, RippleButtonProps>(
  ({ className, children, rippleColor = "#a5b4fc", duration = "600ms", onClick, ...props }, ref) => {
    const [ripples, setRipples] = useState<Array<{ x: number; y: number; size: number; key: number }>>([]);

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = event.clientX - rect.left - size / 2;
      const y = event.clientY - rect.top - size / 2;
      setRipples((prev) => [...prev, { x, y, size, key: Date.now() }]);
      onClick?.(event);
    };

    useEffect(() => {
      if (ripples.length > 0) {
        const last = ripples[ripples.length - 1];
        const timeout = setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.key !== last.key));
        }, parseInt(duration));
        return () => clearTimeout(timeout);
      }
    }, [ripples, duration]);

    return (
      <button
        className={cn("relative flex cursor-pointer items-center justify-center overflow-hidden", className)}
        onClick={handleClick}
        ref={ref}
        {...props}
      >
        <div className="relative z-10">{children}</div>
        <span className="pointer-events-none absolute inset-0">
          {ripples.map((ripple) => (
            <span
              className="animate-rippling absolute rounded-full opacity-30"
              key={ripple.key}
              style={{
                width: `${ripple.size}px`,
                height: `${ripple.size}px`,
                top: `${ripple.y}px`,
                left: `${ripple.x}px`,
                backgroundColor: rippleColor,
                transform: "scale(0)",
                "--duration": duration,
              } as React.CSSProperties}
            />
          ))}
        </span>
      </button>
    );
  },
);
RippleButton.displayName = "RippleButton";
```

**Step 2: Replace the Send button in ChatPanel**

In `frontend/src/components/panels/ChatPanel.tsx`:

Add import:
```typescript
import { RippleButton } from '../ui/magicui/ripple-button';
```

Replace the Send button (around line 119-126):
```tsx
          <RippleButton
            onClick={handleSend}
            disabled={!input.trim() || isRunning}
            rippleColor="#a5b4fc"
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isRunning ? '...' : 'Send'}
          </RippleButton>
```

**Step 3: Verify and commit**
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main && git add frontend/src/components/ui/magicui/ripple-button.tsx frontend/src/components/panels/ChatPanel.tsx && git commit -m "feat: ripple effect on chat send button"
```

---

## Task 11: Final Verification & Cleanup

**Step 1: Run TypeScript check**
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend && PATH="/opt/homebrew/bin:$PATH" /opt/homebrew/bin/node node_modules/.bin/tsc --noEmit --project tsconfig.app.json
```

**Step 2: Visual verification checklist**

Open http://localhost:5173 and verify ALL changes:
- [ ] Shimmer button: Run button has shimmering sweep
- [ ] Border beam: Running nodes have traveling light beam
- [ ] Confetti: Flow completion triggers confetti from both sides
- [ ] Magic card: Sidebar nodes have cursor-following spotlight on hover
- [ ] Blur fade: Config panel slides in with blur animation when node selected
- [ ] Typing animation: Latest chat response types out character by character
- [ ] Particles: Canvas has subtle floating particles behind the grid
- [ ] Shine border: Toolbar has a slowly rotating border glow
- [ ] Ripple button: Chat send button ripples on click

**Step 3: Final commit**
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main && git add -A && git commit -m "chore: MagicUI integration complete — visual polish for all panels"
```

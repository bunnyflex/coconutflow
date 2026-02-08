# Parallel Development: File Upload Integration + MagicUI Polish

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Deliver two independent features in parallel — (1) Wire up file upload button to backend API, and (2) Integrate MagicUI visual polish components.

**Architecture:** Two completely independent workstreams. File Upload touches frontend KnowledgeBaseConfigForm + backend upload endpoint. MagicUI touches only frontend presentation layer (no backend). Zero conflicts.

**Tech Stack:**
- **File Upload:** React file input → FormData → FastAPI /api/upload → Response with file path
- **MagicUI:** Copy-paste MagicUI component sources, integrate into existing UI panels

---

## TRACK A: File Upload Integration

### Task A1: Wire Frontend File Upload to Backend API

**Files:**
- Modify: `frontend/src/components/panels/config/KnowledgeBaseConfigForm.tsx` (lines 41-52: handleFileUpload)
- Read: `backend/app/api/upload.py` (already verified — returns {path, filename, size, warnings})

**Step 1: Write the test first (manual verification plan)**

Manual test steps to verify success:
1. Open http://localhost:5173
2. Add Knowledge Base node to canvas
3. Click "Upload from device" button
4. Select a file (e.g., test.txt)
5. Verify:
   - File appears in sources list with 📄 icon
   - Source path is absolute: `/Users/.../backend/uploads/<uuid>.txt`
   - Can run flow with KB node using the uploaded file
   - Backend logs show file saved to uploads/

**Step 2: Implement handleFileUpload with fetch()**

In `frontend/src/components/panels/config/KnowledgeBaseConfigForm.tsx`, replace lines 41-52:

```typescript
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Upload each file to backend
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('http://localhost:8000/api/upload/', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Upload failed:', error.detail);
          alert(`Upload failed: ${error.detail}`);
          continue;
        }

        const result = await response.json();

        // Add the absolute path to sources
        addSource(result.path);

        // Show warnings if any
        if (result.warnings && result.warnings.length > 0) {
          console.warn('Upload warnings:', result.warnings);
        }
      } catch (err) {
        console.error('Upload error:', err);
        alert(`Upload error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    setShowMenu(false);

    // Clear the file input so the same file can be uploaded again
    e.target.value = '';
  };
```

**Step 3: Run manual test**

Follow Step 1's manual test plan. Verify:
- ✅ File uploads successfully
- ✅ Absolute path appears in sources
- ✅ File is saved in backend/uploads/
- ✅ Flow execution works with uploaded file
- ✅ Warnings displayed if file is large (>10MB)

**Step 4: Test error handling**

Try uploading:
- Binary file (e.g., .exe) — should fail with "Invalid file" error
- Large file (>50MB) — should fail with "exceeds maximum size" error
- Duplicate upload — should work (new UUID each time)

**Step 5: Commit**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main && git add frontend/src/components/panels/config/KnowledgeBaseConfigForm.tsx && git commit -m "feat: wire file upload button to backend API

- POST to /api/upload with FormData
- Add returned absolute path to sources
- Display warnings for large files
- Clear input after upload for re-upload support"
```

---

### Task A2: Add Upload Feedback UI

**Files:**
- Modify: `frontend/src/components/panels/config/KnowledgeBaseConfigForm.tsx`

**Step 1: Add loading state to component**

Add state at top of component:
```typescript
  const [uploading, setUploading] = useState(false);
```

**Step 2: Wrap upload logic with loading state**

In `handleFileUpload`, add before the loop:
```typescript
    setUploading(true);
```

And in the try-finally:
```typescript
      } catch (err) {
        // ... existing error handling
      } finally {
        setUploading(false);
      }
```

**Step 3: Disable upload button during upload**

Modify the file input label (around line 105):
```tsx
            <label
              htmlFor="kb-file-upload"
              className={cn(
                "flex items-center gap-3 px-4 py-3 hover:bg-gray-700 cursor-pointer transition-colors",
                uploading && "opacity-50 cursor-not-allowed pointer-events-none"
              )}
            >
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span className="text-sm text-gray-300">
                {uploading ? 'Uploading...' : 'Upload from device'}
              </span>
            </label>
```

**Step 4: Manual verification**

Upload a file and verify:
- Button text changes to "Uploading..." during upload
- Button is disabled (grayed out, no pointer)
- Returns to normal after upload completes

**Step 5: Commit**

```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main && git add frontend/src/components/panels/config/KnowledgeBaseConfigForm.tsx && git commit -m "feat: add upload loading state to file upload button"
```

---

## TRACK B: MagicUI Visual Polish

### Task B1: Install Dependencies & Create Utility

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

Append at the end (after line ~70):
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

### Task B2: Shimmer Button — Run Button

**Files:**
- Create: `frontend/src/components/ui/magicui/shimmer-button.tsx`
- Modify: `frontend/src/components/canvas/Toolbar.tsx`

**Step 1: Create ShimmerButton component**

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

**Step 2: Replace Run button in Toolbar**

In `frontend/src/components/canvas/Toolbar.tsx`:

Add import:
```typescript
import { ShimmerButton } from '../ui/magicui/shimmer-button';
```

Replace the Run button section (find the existing button, likely around line 77-98):
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

**Step 3: Visual verification**

Open browser at http://localhost:5173:
- Run button has shimmering sweep animation
- Shimmer color is indigo (#a5b4fc)
- Button still clickable
- Disabled state (no nodes) grays out

**Step 4: Commit**
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main && git add frontend/src/components/ui/magicui/shimmer-button.tsx frontend/src/components/canvas/Toolbar.tsx && git commit -m "feat: shimmer button for Run action in toolbar"
```

---

### Task B3: Confetti — Flow Completion Celebration

**Files:**
- Create: `frontend/src/components/ui/magicui/confetti.tsx`
- Modify: `frontend/src/services/websocket.ts`

**Step 1: Install canvas-confetti**

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

In `frontend/src/services/websocket.ts`:

Add import:
```typescript
import { fireConfetti } from '../components/ui/magicui/confetti';
```

Find the `flow_complete` case in event handling (likely around line 167):
```typescript
      case 'flow_complete':
        store.setIsRunning(false);
        fireConfetti();
        break;
```

**Step 4: Visual verification**

Run a flow. On completion, confetti should burst from both sides with indigo/blue/green colors.

**Step 5: Commit**
```bash
cd /Users/affinitylabs/Downloads/coconut/coconutflow-main && git add frontend/src/components/ui/magicui/confetti.tsx frontend/src/services/websocket.ts frontend/package.json frontend/package-lock.json && git commit -m "feat: confetti celebration on flow completion"
```

---

## Parallel Execution Strategy

**For Subagent-Driven Development:**

1. **Read this plan ONCE** — Extract all tasks (A1, A2, B1, B2, B3)
2. **Create TodoWrite** — All 5 tasks with full text and context
3. **Dispatch Subagent A** — Works on Track A (File Upload) tasks sequentially
4. **Dispatch Subagent B** — Works on Track B (MagicUI) tasks sequentially
5. **Wait for both** — Both subagents commit independently
6. **Code review** — Review both tracks for conflicts (there should be none)
7. **Final integration test** — Run frontend, verify both features work

**Zero Conflicts Verification:**

Track A touches:
- `frontend/src/components/panels/config/KnowledgeBaseConfigForm.tsx` (handleFileUpload function)

Track B touches:
- `frontend/package.json` (dependencies)
- `frontend/src/lib/utils.ts` (NEW FILE)
- `frontend/src/index.css` (append CSS)
- `frontend/src/components/ui/magicui/` (NEW DIRECTORY)
- `frontend/src/components/canvas/Toolbar.tsx` (Run button)
- `frontend/src/services/websocket.ts` (confetti trigger)

**No overlap** — Safe to work in parallel!

---

## Verification Checklist

**After both tracks complete:**

1. **TypeScript check:**
   ```bash
   cd /Users/affinitylabs/Downloads/coconut/coconutflow-main/frontend && PATH="/opt/homebrew/bin:$PATH" npx tsc --noEmit --project tsconfig.app.json
   ```

2. **File Upload verification:**
   - Upload a file via KB config panel
   - File appears in sources with absolute path
   - File is in `backend/uploads/`
   - Flow execution uses uploaded file successfully

3. **MagicUI verification:**
   - Run button has shimmer animation
   - Flow completion triggers confetti

4. **Integration test:**
   - Upload a file
   - Add it to KB node
   - Run flow via shimmering Run button
   - On completion, confetti fires
   - All features work together

---

## Success Criteria

- ✅ File upload button WORKS (POST to /api/upload, add path to sources)
- ✅ Upload feedback UI shows loading state
- ✅ Shimmer button on Run action
- ✅ Confetti on flow completion
- ✅ Zero TypeScript errors
- ✅ Zero file conflicts between tracks
- ✅ Manual integration test passes

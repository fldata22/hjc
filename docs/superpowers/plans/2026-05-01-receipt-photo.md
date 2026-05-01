# Receipt Photo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the director attach a photo of the receipt when logging a Crusade Daily Expense; surface a 📷 indicator on transaction rows that opens a full-screen modal.

**Architecture:** New `ExpenseEntry.receiptPhoto` field (base64 data URL or null). Capture happens in the inline-add form — single button using `<input type="file" accept="image/*" capture="environment">` opens the rear camera on phone / file picker on desktop. A new `imageCompress` lib draws the file to an off-screen canvas at max 800px wide, exports JPEG @ quality 0.7 (~50–150 KB per receipt). A new shared `ReceiptModal` component renders a full-screen overlay with the photo, used by both Daily Expenses entry list and Budget recent-transactions. Backwards compat — old entries without the field render as-if `null`.

**Tech Stack:** React 19, TypeScript, Vite 8. No test framework — verification is `tsc --noEmit` + `npm run build` + manual viewport check at 393px / 820px / 1280px including a real photo capture.

**Spec:** `docs/superpowers/specs/2026-05-01-receipt-photo-design.md`

**Conventions:**
- All paths relative to `/Users/adebimpegodwin/Projects/hjc`.
- All `npm`/`npx` commands from `web/`.
- Each task ends with a defensive-staged commit (working tree has pre-existing dirty files we don't want to capture).

---

## Task 1: `imageCompress` utility

Pure async helper. No React, no UI. Used by Daily Expenses form on file change.

**Files:**
- Create: `web/src/lib/imageCompress.ts`

- [ ] **Step 1: Create `imageCompress.ts`**

Create the file at `/Users/adebimpegodwin/Projects/hjc/web/src/lib/imageCompress.ts` with this EXACT content:

```ts
/**
 * Compress an image file by drawing it to an off-screen canvas at a
 * capped width and exporting as JPEG. Returns a base64 data URL.
 *
 * Used for receipt photos — typical phone-camera input (3–5MB) compresses
 * to ~50–150KB at the defaults below.
 */
export function compressImage(
  file: File,
  maxWidth = 800,
  quality = 0.7,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Could not read file'));

    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') {
        reject(new Error('Unexpected reader result'));
        return;
      }

      const img = new Image();

      img.onerror = () => reject(new Error('Could not decode image'));

      img.onload = () => {
        const targetWidth = Math.min(maxWidth, img.naturalWidth);
        const scale = targetWidth / img.naturalWidth;
        const targetHeight = Math.round(img.naturalHeight * scale);

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        try {
          const out = canvas.toDataURL('image/jpeg', quality);
          resolve(out);
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Encode failed'));
        }
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  });
}
```

- [ ] **Step 2: Verify typecheck and build**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
# Expected: exit 0
npm run build
# Expected: build succeeds
```

- [ ] **Step 3: Commit (clean staging)**

The repo working tree has pre-existing dirty files NOT part of this task (start.sh, stop.sh, web/index.html, web/src/api/client.ts, web/vite.config.ts, hjc.code-workspace).

```bash
cd /Users/adebimpegodwin/Projects/hjc

git restore --staged .
git add web/src/lib/imageCompress.ts
git diff --cached --stat
# Expected: ONLY imageCompress.ts
```

If `git diff --cached --stat` shows ANY other file, STOP and report NEEDS_CONTEXT.

```bash
git commit -m "$(cat <<'EOF'
feat(web): imageCompress utility — File → resized JPEG data URL

Pure async helper. Reads a File via FileReader, draws to off-screen
canvas at max 800px wide (preserving aspect), exports as JPEG quality
0.7. Typical phone-camera input compresses to ~50–150KB. Used by the
upcoming Daily Expenses receipt-photo capture flow.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

## Context

This is Task 1 of a 5-task plan adding receipt-photo capture to Daily Expenses.

**Working directory:** `/Users/adebimpegodwin/Projects/hjc`

**Branch:** `main` (user has consented to commit directly)

**Existing state:** No image utilities exist. This is the first such helper. It's a pure module — no React imports.

## Self-Review

- Did `git diff --cached --stat` show ONLY imageCompress.ts?
- Does typecheck pass?
- Does build succeed?
- Are all error paths reject (FileReader error, image decode error, no canvas context, encode failure)?

## Report Format

- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- typecheck + build output
- Commit SHA
- Confirmation `git show --stat HEAD` shows only imageCompress.ts
- Self-review findings if any

---

## Task 2: `ReceiptModal` component

Shared full-screen modal component. Used by Daily Expenses and Budget for "tap 📷 to enlarge".

**Files:**
- Create: `web/src/screens/forms/ReceiptModal.tsx`

- [ ] **Step 1: Create `ReceiptModal.tsx`**

Create the file at `/Users/adebimpegodwin/Projects/hjc/web/src/screens/forms/ReceiptModal.tsx` with this EXACT content:

```tsx
import { useEffect } from 'react';

export type ReceiptModalProps = {
  photo: string;
  onClose: () => void;
};

export const ReceiptModal = ({ photo, onClose }: ReceiptModalProps) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.92)',
        zIndex: 1000,
        display: 'grid',
        placeItems: 'center',
        padding: 16,
      }}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Close"
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          background: 'transparent',
          border: 0,
          color: 'white',
          fontSize: 28,
          cursor: 'pointer',
          fontFamily: 'inherit',
          lineHeight: 1,
          padding: 4,
        }}
      >
        ×
      </button>
      <img
        src={photo}
        alt="Receipt"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '100%',
          maxHeight: 'calc(100vh - 64px)',
          objectFit: 'contain',
          borderRadius: 4,
        }}
      />
    </div>
  );
};
```

- [ ] **Step 2: Verify typecheck and build**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
# Expected: exit 0
npm run build
# Expected: build succeeds
```

- [ ] **Step 3: Commit (clean staging)**

```bash
cd /Users/adebimpegodwin/Projects/hjc

git restore --staged .
git add web/src/screens/forms/ReceiptModal.tsx
git diff --cached --stat
# Expected: ONLY ReceiptModal.tsx
```

If `git diff --cached --stat` shows ANY other file, STOP and report NEEDS_CONTEXT.

```bash
git commit -m "$(cat <<'EOF'
feat(web): ReceiptModal — full-screen photo viewer

Shared modal component used by Daily Expenses and Budget for
tap-to-enlarge of receipt photos. Black backdrop, centered photo,
top-right close button. Backdrop click + Esc key both close.
Click on photo itself stops propagation so it doesn't accidentally
close the modal.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

## Context

This is Task 2 of the 5-task receipt-photo plan. Task 1 (imageCompress) is done.

**Working directory:** `/Users/adebimpegodwin/Projects/hjc`

**Branch:** `main`

**Tech notes:**
- React 19, TS strict
- No new CSS — all styling inline (modal is a one-off, not worth extending app.css for)
- Lives under `web/src/screens/forms/` since it's primarily a form-domain component (the Daily Expenses form is its first major consumer)

## Self-Review

- Did `git diff --cached --stat` show ONLY ReceiptModal.tsx?
- Does typecheck pass?
- Does build succeed?
- Does Esc key handler clean up on unmount?
- Does the photo click stop propagation (so it doesn't close the modal)?

## Report Format

- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- typecheck + build output
- Commit SHA
- Confirmation `git show --stat HEAD` shows only ReceiptModal.tsx
- Self-review findings if any

---

## Task 3: Receipt capture + display in Daily Expenses form

Add the field, capture flow, and entry-list 📷 indicator + modal.

**Files:**
- Modify: `web/src/screens/forms/DailyExpensesForm.tsx`

- [ ] **Step 1: Read the current file**

Open `/Users/adebimpegodwin/Projects/hjc/web/src/screens/forms/DailyExpensesForm.tsx` to understand the existing structure. The file has:
- Imports section
- `ExpenseEntry` type
- `FORM_SLUG`, `CATEGORIES`, `SEED`, `emptyEntry` constants
- `DailyExpensesForm()` component with state, useEffect, useMemo derivations, JSX (date strip, stat strip, day entries list with `.form-list-row`, "Log expense" button, inline form, modal placeholder).

- [ ] **Step 2: Add imports**

At the top of the file, add these two imports near the other imports:

```tsx
import { compressImage } from '../../lib/imageCompress';
import { ReceiptModal } from './ReceiptModal';
```

- [ ] **Step 3: Add `receiptPhoto` to `ExpenseEntry` type**

Find the `ExpenseEntry` type and add the new field at the end:

```tsx
type ExpenseEntry = {
  id?: string;
  date: string;
  time: string;
  vendor: string;
  category: 'transport' | 'printing' | 'permits' | 'food' | 'venue' | 'materials' | 'other';
  amount: number | '';
  receiptNumber: string;
  approvedBy: string;
  notes: string;
  receiptPhoto: string | null;
};
```

- [ ] **Step 4: Add `receiptPhoto: null` to `emptyEntry`**

Find the `emptyEntry` factory function and add the new field:

```tsx
const emptyEntry = (date: string): ExpenseEntry => ({
  date,
  time: nowHHMM(),
  vendor: '',
  category: 'transport',
  amount: '',
  receiptNumber: '',
  approvedBy: '',
  notes: '',
  receiptPhoto: null,
});
```

- [ ] **Step 5: Add new state inside the component**

In the `DailyExpensesForm()` body, alongside the existing useState calls, add two new ones:

```tsx
const [capturing, setCapturing] = useState(false);
const [openReceipt, setOpenReceipt] = useState<string | null>(null);
```

- [ ] **Step 6: Add `ChangeEvent` to the React import + add the file-change handler**

The existing top-of-file import looks like:

```tsx
import { useEffect, useMemo, useState } from 'react';
```

Add `type ChangeEvent` to that import:

```tsx
import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
```

Then, inside the component body (above the JSX return), add the handler:

```tsx
const handleReceiptChange = async (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  // Reset input value so the same file can be re-selected after Remove.
  e.target.value = '';
  if (!file) return;
  setCapturing(true);
  try {
    const dataUrl = await compressImage(file);
    setDraft((d) => ({ ...d, receiptPhoto: dataUrl }));
  } catch (err) {
    console.error('Receipt compression failed:', err);
    alert('Could not load that image. Try a different file.');
  } finally {
    setCapturing(false);
  }
};
```

- [ ] **Step 7: Add the receipt capture row to the inline-add form**

Find the inline-add form (rendered when `showForm && isToday`). Inside the `.fields` div, AFTER the `notes` textarea field but BEFORE the closing `</div>` of `.fields`, add the receipt capture row:

Locate this existing block (find `<TextareaField label="Notes"`):

```tsx
              <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>
            </div>
            <div className="row">
```

Insert the receipt row between the `</TextareaField>` line and the `</div>` that closes `.fields`:

```tsx
              <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>

              <div className="field">
                <div className="lbl"><span>Receipt photo</span></div>
                {draft.receiptPhoto ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                    <img
                      src={draft.receiptPhoto}
                      alt="Receipt"
                      style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--line)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, receiptPhoto: null })}
                      style={{ background: 'transparent', border: 0, color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label
                    style={{
                      display: 'inline-block',
                      padding: '10px 16px',
                      fontSize: 13,
                      fontWeight: 500,
                      borderRadius: 999,
                      border: '1px solid var(--ink)',
                      background: 'var(--bg)',
                      color: 'var(--ink)',
                      cursor: capturing ? 'not-allowed' : 'pointer',
                      opacity: capturing ? 0.5 : 1,
                      marginTop: 4,
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      style={{ display: 'none' }}
                      onChange={handleReceiptChange}
                      disabled={capturing}
                    />
                    {capturing ? 'Processing…' : '+ Add receipt'}
                  </label>
                )}
              </div>
            </div>
            <div className="row">
```

- [ ] **Step 8: Add 📷 indicator to the day entries list**

Find the day-entries list rendering (the `dayEntries.map((e, i) => ...)` block). Each row uses `<div className="form-list-row">` with a `<div className="sub">{categoryLabel}{e.receiptNumber && ` · ${e.receiptNumber}`}</div>`.

Replace that `.sub` div with one that conditionally appends the 📷 button:

Before:
```tsx
                <div className="sub">{categoryLabel}{e.receiptNumber && ` · ${e.receiptNumber}`}</div>
```

After:
```tsx
                <div className="sub" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>{categoryLabel}{e.receiptNumber && ` · ${e.receiptNumber}`}</span>
                  {e.receiptPhoto && (
                    <button
                      type="button"
                      onClick={(ev) => { ev.stopPropagation(); setOpenReceipt(e.receiptPhoto); }}
                      aria-label="View receipt"
                      style={{ background: 'transparent', border: 0, padding: 0, fontSize: 14, cursor: 'pointer', lineHeight: 1 }}
                    >
                      📷
                    </button>
                  )}
                </div>
```

- [ ] **Step 9: Render the modal**

Find the closing `</ResponsiveShell>` tag at the bottom of the JSX. Just BEFORE it, render the modal conditionally:

Before:
```tsx
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
```

After:
```tsx
        <div className="bot-pad"/>
      </FormShell>
      {openReceipt && <ReceiptModal photo={openReceipt} onClose={() => setOpenReceipt(null)}/>}
    </ResponsiveShell>
  );
}
```

- [ ] **Step 10: Verify typecheck and build**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
# Expected: exit 0
npm run build
# Expected: build succeeds
```

- [ ] **Step 11: Commit (clean staging)**

```bash
cd /Users/adebimpegodwin/Projects/hjc

git restore --staged .
git add web/src/screens/forms/DailyExpensesForm.tsx
git diff --cached --stat
# Expected: ONLY DailyExpensesForm.tsx
```

If `git diff --cached --stat` shows ANY other file, STOP and report NEEDS_CONTEXT.

```bash
git commit -m "$(cat <<'EOF'
feat(web): receipt photo capture + display in Daily Expenses

Adds receiptPhoto field to ExpenseEntry. Inline-add form gains a
"+ Add receipt" button that opens the rear camera on phone (file
picker on desktop). After capture: 60×60 thumbnail + Remove link.
Each day-entries list row whose entry has a receipt shows a 📷
icon in its meta line; tapping it opens a full-screen modal.

Compression via lib/imageCompress (max 800px wide, JPEG quality
0.7) keeps each photo at ~50–150KB.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

## Context

This is Task 3 of the 5-task receipt-photo plan. Tasks 1 (`imageCompress`) and 2 (`ReceiptModal`) are done.

**Working directory:** `/Users/adebimpegodwin/Projects/hjc`

**Branch:** `main`

**Existing state:**
- `web/src/lib/imageCompress.ts` exports `compressImage(file, maxWidth?, quality?): Promise<string>` (data URL).
- `web/src/screens/forms/ReceiptModal.tsx` exports `ReceiptModal` taking `{ photo: string; onClose: () => void }`.
- `web/src/screens/forms/DailyExpensesForm.tsx` already has the inline-add form pattern with `.field`, `.fields`, `.input.bordered` etc.

**Backwards compat note:** Existing localStorage entries (created before this PR) will have `receiptPhoto === undefined`. The render code uses `&& (truthy check)` which handles undefined the same as null — no migration needed.

## Self-Review

- Did `git diff --cached --stat` show ONLY DailyExpensesForm.tsx?
- Does typecheck pass?
- Does build succeed?
- Does the file input reset its value (`e.target.value = ''`) so re-selecting the same file works after Remove?
- Does the 📷 button use `e.stopPropagation()`?
- Is the modal rendered conditionally and at the bottom of the shell?
- Does the receipt photo persist into localStorage when the entry is saved (verify by inspecting `hjc_records_daily-expenses` after a save)?

## Report Format

- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- typecheck + build output
- Commit SHA
- Confirmation `git show --stat HEAD` shows only DailyExpensesForm.tsx
- Self-review findings if any

---

## Task 4: Receipt indicator in Budget recent transactions

Surface the 📷 indicator in `BudgetScreen`'s "Recent · 5 latest" rows. Same modal pattern.

**Files:**
- Modify: `web/src/screens/app/BudgetScreen.tsx`

- [ ] **Step 1: Add imports**

At the top of `/Users/adebimpegodwin/Projects/hjc/web/src/screens/app/BudgetScreen.tsx`, add:

```tsx
import { ReceiptModal } from '../forms/ReceiptModal';
```

- [ ] **Step 2: Add `receiptPhoto` to local `ExpenseEntry` type**

Find the local `ExpenseEntry` type and add the optional field (optional because old records won't have it):

```tsx
type ExpenseEntry = {
  id?: string;
  date: string;
  time: string;
  vendor: string;
  category: 'transport' | 'printing' | 'permits' | 'food' | 'venue' | 'materials' | 'other';
  amount: number | '';
  receiptNumber: string;
  approvedBy: string;
  notes: string;
  receiptPhoto?: string | null;
};
```

- [ ] **Step 3: Add modal state**

Inside the `BudgetScreen()` component body, alongside the existing state declarations, add:

```tsx
const [openReceipt, setOpenReceipt] = useState<string | null>(null);
```

- [ ] **Step 4: Add 📷 to the recent transactions row**

Find the `recent.map(...)` block in the "Recent · 5 latest" section. Each row has a structure like:

```tsx
<div>
  <div className="name">{e.vendor}</div>
  <div className="sub">{categoryLabel}{e.receiptNumber && ` · ${e.receiptNumber}`}</div>
</div>
```

Update the `.sub` div to conditionally include the 📷 button:

```tsx
<div>
  <div className="name">{e.vendor}</div>
  <div className="sub" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
    <span>{categoryLabel}{e.receiptNumber && ` · ${e.receiptNumber}`}</span>
    {e.receiptPhoto && (
      <button
        type="button"
        onClick={(ev) => { ev.stopPropagation(); setOpenReceipt(e.receiptPhoto ?? null); }}
        aria-label="View receipt"
        style={{ background: 'transparent', border: 0, padding: 0, fontSize: 14, cursor: 'pointer', lineHeight: 1 }}
      >
        📷
      </button>
    )}
  </div>
</div>
```

The `?? null` in the onClick handles the TypeScript narrowing edge case where `receiptPhoto` could be `string | null | undefined`.

- [ ] **Step 5: Render the modal**

Find the closing `</ResponsiveShell>` tag at the bottom of the JSX. Just BEFORE it, render the modal conditionally:

Before:
```tsx
        <div className="bot-pad"/>
      </div>
      <TabBar active="home"/>
      {drawer && <Drawer active="home" onClose={() => setDrawer(false)}/>}
    </ResponsiveShell>
  );
}
```

After:
```tsx
        <div className="bot-pad"/>
      </div>
      <TabBar active="home"/>
      {drawer && <Drawer active="home" onClose={() => setDrawer(false)}/>}
      {openReceipt && <ReceiptModal photo={openReceipt} onClose={() => setOpenReceipt(null)}/>}
    </ResponsiveShell>
  );
}
```

- [ ] **Step 6: Verify typecheck and build**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
# Expected: exit 0
npm run build
# Expected: build succeeds
```

- [ ] **Step 7: Commit (clean staging)**

```bash
cd /Users/adebimpegodwin/Projects/hjc

git restore --staged .
git add web/src/screens/app/BudgetScreen.tsx
git diff --cached --stat
# Expected: ONLY BudgetScreen.tsx
```

If `git diff --cached --stat` shows ANY other file, STOP and report NEEDS_CONTEXT.

```bash
git commit -m "$(cat <<'EOF'
feat(web): show receipt 📷 in Budget recent transactions

Surfaces the receipt-photo indicator added in the prior commit.
Recent transaction rows whose entry has a receiptPhoto show a 📷
icon in the meta line; tapping it opens the full-screen
ReceiptModal. Whole-row click still navigates to /forms/daily-expenses
because the 📷 button calls stopPropagation.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

## Context

This is Task 4 of the 5-task receipt-photo plan. Tasks 1-3 done.

**Working directory:** `/Users/adebimpegodwin/Projects/hjc`

**Branch:** `main`

**Existing state:**
- `web/src/screens/forms/ReceiptModal.tsx` exports `ReceiptModal`.
- `web/src/screens/app/BudgetScreen.tsx` has its own local minimal `ExpenseEntry` type (mirroring the canonical type in DailyExpensesForm).
- The Budget recent-transactions row is itself a `<button>` (clicking navigates to `/forms/daily-expenses`); the inner 📷 must use `stopPropagation` so it opens the modal without triggering navigation.

## Self-Review

- Did `git diff --cached --stat` show ONLY BudgetScreen.tsx?
- Does typecheck pass?
- Does build succeed?
- Does the 📷 button use `e.stopPropagation()` so it doesn't trigger row navigation?
- Is the modal rendered conditionally at the bottom of the shell?

## Report Format

- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- typecheck + build output
- Commit SHA
- Confirmation `git show --stat HEAD` shows only BudgetScreen.tsx
- Self-review findings if any

---

## Task 5: Final manual sweep

No code changes. Verify end-to-end across capture, persist, list display, and modal at three viewport widths. No commit unless an issue surfaces.

- [ ] **Step 1: Verify build is clean**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npm run build
# Expected: success
```

- [ ] **Step 2: Phone-width capture flow** (DevTools device toolbar → iPhone 14)

1. Open `http://localhost:5173/forms/daily-expenses`.
2. Tap "Log expense".
3. Fill the required fields (vendor, amount).
4. Tap "+ Add receipt". On a real phone, the rear camera opens; in DevTools, the file picker opens.
5. Pick a JPEG (or take a photo). The button should briefly show "Processing…", then collapse to a 60×60 thumbnail + "Remove" link.
6. Tap "Add expense". The new entry appears in the day list within ~1s.
7. Confirm the new row's meta line shows `Category · 📷` (or `Category · R-2401 · 📷` if you set a receipt number).

- [ ] **Step 3: Modal**

1. Tap the 📷 icon in the new row.
2. Modal opens full-screen with the photo centered, black backdrop, X in the top right.
3. Tap the photo itself — should NOT close.
4. Tap the backdrop — should close.
5. Reopen, press Esc — should close.
6. Reopen, tap the X — should close.

- [ ] **Step 4: Remove flow**

1. Tap "Log expense" again.
2. Tap "+ Add receipt", pick a file.
3. Tap "Remove" next to the thumbnail. The capture button should reappear.
4. Tap "+ Add receipt" again — the file picker opens (the input value reset means you can re-select the same file).

- [ ] **Step 5: Budget surface**

1. Navigate to `http://localhost:5173/budget`.
2. The "Recent · 5 latest" section's first row should be the entry you just created — meta line includes `📷`.
3. Tap the 📷 — modal opens with the same photo.
4. Tap a different part of the row (e.g. the vendor name) — should navigate to `/forms/daily-expenses` (the 📷's stopPropagation kept the row click intact).

- [ ] **Step 6: localStorage persistence**

1. DevTools → Application → Local Storage → `http://localhost:5173`.
2. Click `hjc_records_daily-expenses`. The most-recent entry's `receiptPhoto` field should be a long `data:image/jpeg;base64,/9j/...` string.
3. Hard refresh the page (Cmd+Shift+R). The 📷 should still appear in the Budget recent list.

- [ ] **Step 7: Three-viewport check**

DevTools device toolbar → swap between iPhone 14 (393×852), iPad (820×1180), and laptop (1280×800):
- Phone: capture button opens camera (real device) or file picker (DevTools sim). Modal fills the screen.
- Tablet: same.
- Desktop: file picker only (no camera). Modal centers the photo with black margins.

- [ ] **Step 8: Backwards compat**

1. DevTools → Application → Local Storage. Find `hjc_records_daily-expenses`. Pick any entry that pre-dates this work (no `receiptPhoto` field at all).
2. Refresh the Budget and Daily Expenses pages.
3. The pre-existing entries should render correctly with NO 📷 icon (since `receiptPhoto` is undefined → falsy → no render).

- [ ] **Step 9: If anything breaks**

Reference the spec at `/Users/adebimpegodwin/Projects/hjc/docs/superpowers/specs/2026-05-01-receipt-photo-design.md` and file a follow-up commit.

---

## Self-Review Notes

**Spec coverage:**
- imageCompress utility → Task 1
- ReceiptModal component → Task 2
- ExpenseEntry field + capture flow + entry-list 📷 + modal (Daily Expenses) → Task 3
- Recent transactions 📷 + modal (Budget) → Task 4
- Manual sweep covering capture, persistence, modal interactions, and backwards compat → Task 5

**Type consistency:**
- `compressImage` signature: `(file: File, maxWidth?: number, quality?: number) => Promise<string>` — matches between Task 1 definition and Task 3 usage.
- `ReceiptModalProps` shape: `{ photo: string; onClose: () => void }` — matches between Task 2 definition and Task 3+4 usage.
- `ExpenseEntry.receiptPhoto`: `string | null` (required) in Task 3 (Daily Expenses), `string | null | undefined` (optional) in Task 4 (Budget local minimal type). The Budget local type is intentionally optional because old localStorage records may lack the field — using optional typing makes the backwards-compat read explicit at the type level.

**Known minor (acknowledged in spec):**
- `console.error` on compression failure — implementer can replace with proper logging when one exists.
- Modal click-through prevention on the photo uses `e.stopPropagation()` — same pattern used elsewhere in the codebase.
- No localStorage size warning — director will hit ~50-receipts ceiling before issues.

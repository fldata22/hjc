# Receipt Photo on Daily Expenses — Design Spec

**Date:** 2026-05-01
**Status:** Approved, ready for implementation plan

## Goal

Let the director attach a photo of the receipt when logging a Crusade Daily Expense. The photo lives on the expense record (one-to-one) and is viewable later from any list that surfaces the entry (Daily Expenses today/past entries + Budget recent transactions). Backwards compatible — existing entries without a photo render unchanged.

## Decisions (in order, locked)

| # | Question | Choice |
|---|---|---|
| 1 | Where does the photo live? | **a.** On the Daily Expenses entry record (`receiptPhoto: string \| null`). Receipts belong WITH expenses. The Budget page just surfaces an indicator on rows that have one. |
| 2 | Storage | base64-in-localStorage v1. Client-side compression caps each photo at ~50–150 KB so the director can log dozens before localStorage worries. Same swap point as the rest of the app — when `submitQueue.ts` wires to Laravel, the data URL becomes a multipart upload. |
| 3 | Capture / preview UX | **a.** Single "Add receipt" button in the inline-add form. After capture: 60×60 thumbnail + small "Remove" link. No tap-to-enlarge in the form (the director just took the photo). |
| 4 | List indicator | **a.** Small 📷 emoji appended to the row's meta line when the entry has a receipt. Tap the icon (not the row) to enlarge in a full-screen modal. |

## Architecture

### New field

Add to `ExpenseEntry` in `web/src/screens/forms/DailyExpensesForm.tsx`:

```ts
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
  receiptPhoto: string | null;   // ← NEW: data URL or null
};
```

`emptyEntry(date)` initializes `receiptPhoto: null`.

`BudgetScreen.tsx` adds the same field to its local minimal `ExpenseEntry` type so the 📷 indicator can render in the recent-transactions list.

Backwards compat: existing localStorage records (created before this lands) will have `receiptPhoto === undefined`. The render code reads it as falsy — no icon, no thumbnail. Works without migration.

### New files

**`web/src/lib/imageCompress.ts`** — pure async helper:

```ts
export async function compressImage(file: File, maxWidth = 800, quality = 0.7): Promise<string>;
```

Behavior:
- Reads `file` via `FileReader` → `Image` → off-screen `<canvas>`
- Calculates `targetWidth = Math.min(maxWidth, image.naturalWidth)`, `targetHeight = image.naturalHeight * (targetWidth / image.naturalWidth)`
- Draws to canvas at target size
- Exports as JPEG via `canvas.toDataURL('image/jpeg', quality)`
- Resolves with the data URL string
- Rejects on FileReader error or Image load error

Pure module, no React. Used by Daily Expenses form on file change.

**`web/src/screens/forms/ReceiptModal.tsx`** — full-screen modal:

```tsx
type ReceiptModalProps = { photo: string; onClose: () => void };
export const ReceiptModal: React.FC<ReceiptModalProps>;
```

Behavior:
- Renders a fixed-position overlay (`position: fixed; inset: 0`) with black backdrop (`background: rgba(0,0,0,0.92)`).
- Photo centered with `max-width: 100%; max-height: calc(100vh - 32px); object-fit: contain;`.
- Close button top-right (X glyph, white).
- Click on backdrop → calls `onClose`.
- `Escape` keypress → calls `onClose` (via `useEffect` adding `keydown` listener; cleanup removes it).
- Stops propagation on the photo itself so clicking the photo doesn't close the modal.

Reused by Daily Expenses entry rows AND Budget recent-transactions rows.

### Modified files

**`web/src/screens/forms/DailyExpensesForm.tsx`:**

1. Add `receiptPhoto: null` to `ExpenseEntry` and `emptyEntry`.
2. Add `[capturing, setCapturing]` state for the "Processing…" button label during compression.
3. Add `[openReceipt, setOpenReceipt] = useState<string | null>(null)` for the modal.
4. In the inline-add form, after the `notes` field and before the action row, add a **receipt capture row**:
   - When `draft.receiptPhoto === null`: show `<button>Add receipt</button>` wrapping a hidden `<input type="file" accept="image/*" capture="environment" onChange={...}>`. The button text becomes "Processing…" with `disabled` while `capturing === true`.
   - When `draft.receiptPhoto` is a data URL: show 60×60 `<img>` thumbnail with object-fit cover + small "Remove" `<button>` next to it.
5. The `onChange` handler on the hidden input:
   - Reads `e.target.files?.[0]`. If null, returns.
   - Sets `setCapturing(true)`.
   - Calls `compressImage(file)`.
   - On success: `setDraft((d) => ({ ...d, receiptPhoto: dataUrl }))`.
   - On failure: `alert('Could not load that image. Try a different file.')`.
   - Finally: `setCapturing(false)`. Reset input value (`e.target.value = ''`) so the same file can be re-selected after Remove.
6. In the entry list (rendered for the selected day), each row whose `receiptPhoto` is non-null appends a tap-able 📷 button:
   - Sits in the existing `.sub` line (inside the meta string), wrapped in a `<button>` with `onClick={(e) => { e.stopPropagation(); setOpenReceipt(e.receiptPhoto); }}`. The button has minimal styling (no border, no background, just the emoji).
7. Render `{openReceipt && <ReceiptModal photo={openReceipt} onClose={() => setOpenReceipt(null)}/>}` at the bottom of the JSX (before the closing `</ResponsiveShell>`).

**`web/src/screens/app/BudgetScreen.tsx`:**

1. Add `receiptPhoto?: string | null` to the local minimal `ExpenseEntry` type.
2. Add `[openReceipt, setOpenReceipt] = useState<string | null>(null)` state.
3. In each row of the "Recent · 5 latest" list, append a 📷 button when `e.receiptPhoto` exists. Same `stopPropagation` pattern so the row's main click (navigate to Daily Expenses) still works for the row body.
4. Render `<ReceiptModal>` at the bottom (before closing `</ResponsiveShell>`).

### File touch list

**Create:**
- `web/src/lib/imageCompress.ts`
- `web/src/screens/forms/ReceiptModal.tsx`

**Modify:**
- `web/src/screens/forms/DailyExpensesForm.tsx`
- `web/src/screens/app/BudgetScreen.tsx`

**Delete:** none.

## Capture flow detail

The hidden file input pattern looks like:

```tsx
<label className="receipt-capture-btn">
  <input
    type="file"
    accept="image/*"
    capture="environment"
    style={{ display: 'none' }}
    onChange={handleFileChange}
  />
  {capturing ? 'Processing…' : '+ Add receipt'}
</label>
```

`<label>`-wraps-`<input>` is the canonical hidden-file-picker pattern. `capture="environment"` opens the rear camera on phones; falls back to file picker on desktop where there's no camera.

After capture, the label is replaced by a thumbnail row:

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
  <img
    src={draft.receiptPhoto}
    alt="Receipt"
    style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--line)' }}
  />
  <button type="button" onClick={() => setDraft({ ...draft, receiptPhoto: null })}
          style={{ background: 'transparent', border: 0, color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
    Remove
  </button>
</div>
```

## List indicator detail

In the entry list row, the existing meta line:

```tsx
<div className="sub">{categoryLabel}{e.receiptNumber && ` · ${e.receiptNumber}`}</div>
```

Becomes:

```tsx
<div className="sub" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
  {categoryLabel}
  {e.receiptNumber && <> · {e.receiptNumber}</>}
  {e.receiptPhoto && (
    <button
      type="button"
      onClick={(ev) => { ev.stopPropagation(); setOpenReceipt(e.receiptPhoto); }}
      style={{ background: 'transparent', border: 0, padding: 0, fontSize: 14, cursor: 'pointer', lineHeight: 1 }}
      aria-label="View receipt"
    >
      📷
    </button>
  )}
</div>
```

Same pattern applies to BudgetScreen's recent-transactions row.

The Daily Expenses row is rendered inside a `<div>` (not a button — the row itself is non-interactive). The Budget row IS a `<button>` (clicking navigates to /forms/daily-expenses); the inner 📷 button uses `e.stopPropagation()` so clicking it opens the modal without triggering navigation.

## Modal anatomy

```tsx
export const ReceiptModal = ({ photo, onClose }: ReceiptModalProps) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
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
          top: 16, right: 16,
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

## Implementation order (suggested)

1. Create `imageCompress.ts` (pure module, easy to verify with a manual test in DevTools).
2. Create `ReceiptModal.tsx`.
3. Modify `DailyExpensesForm.tsx` — add field, capture flow, entry-list 📷, modal wiring.
4. Modify `BudgetScreen.tsx` — add field to local type, recent-transactions 📷, modal wiring.
5. Manual sweep at phone (393), tablet (820), desktop (1280):
   - Phone: rear camera opens on tap of "Add receipt".
   - Desktop: file picker opens.
   - Compressed photo round-trips through localStorage and renders correctly in lists.
   - 📷 in lists opens the modal; backdrop / X / Esc all close it.

## Non-goals (explicitly out of scope)

- No real Laravel backend wiring for image upload — still localStorage. Same swap point.
- No multi-photo per expense — one photo per entry; second capture replaces the first.
- No edit-existing-entry flow — past expenses can't be edited; receipts can only be attached at create time.
- No localStorage-size warning UI — director will hit ~50 receipts before issues. Backend wiring fixes it.
- No PCM-wizard "Photo" field — same swap pattern when it lands, but explicitly separate change.
- No OCR / receipt parsing.
- No receipt-only gallery view on Budget — Q1 chose receipts-on-expense.
- No file type validation beyond `accept="image/*"`.
- No drag-drop on desktop.
- No HEIC handling — modern Safari iOS already exports as JPEG via `canvas.toDataURL`, so this works for most cases. If a HEIC slips through, the compression rejects with the alert message.

## Open follow-ups (post-implementation)

- Real Laravel backend wiring (`submitQueue.ts` swap → multipart uploads).
- PCM-wizard photo field (uses `imageCompress` + photo storage that the backend will own).
- Multi-photo per expense (if the director takes side+top of a long receipt).
- Edit existing expense (past records become editable, including swapping/removing receipts).
- localStorage-size warning + auto-eviction of oldest photos when nearing limit.
- Server-side OCR to extract amount/vendor/date from photo, prefilling the form.

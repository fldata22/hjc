# Form-Fill Trio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first three working form-fill screens (PCM Intake wizard, BOT Roster single-screen, PCM Hunt Daily append-log) plus a shared `FormShell`, field components, draft autosave, and offline submission queue.

**Architecture:** Each form is its own React component wrapped in `<ResponsiveShell active="forms">` (inheriting the responsive sidebar/AppBar from the prior phase). Inside, a `<FormShell>` provides editorial top bar + optional stepper + sticky action bar. Field state lives in the form component; drafts auto-save to `localStorage` debounced; submissions enqueue to a retryable queue that simulates a 1s network round-trip. No real Laravel API endpoints in scope — the backend swap point is `submitQueue.ts`.

**Tech Stack:** React 19, TypeScript, Vite 8, React Router 7. No test framework in `web/` — verification is `tsc --noEmit` + `npm run build` + manual viewport check at 393px / 820px / 1280px.

**Spec:** `docs/superpowers/specs/2026-05-01-form-fill-trio-design.md`

**Conventions:**
- All paths below are relative to `/Users/adebimpegodwin/Projects/hjc`.
- All `npm`/`npx` commands run from `web/`.
- Each task ends with a typecheck + clean commit (no working-tree leakage from pre-existing dirty files — see Step 0 of every commit step).
- The dev server is running on `http://localhost:5173`; manual checks happen there.

---

## Task 1: Storage primitives

Three pure modules with no React rendering. They're not imported by anything yet — typecheck verifies they compile in isolation; later tasks consume them.

**Files:**
- Create: `web/src/lib/useDebouncedCallback.ts`
- Create: `web/src/lib/draftStorage.ts`
- Create: `web/src/lib/submitQueue.ts`

- [ ] **Step 1: Create `useDebouncedCallback.ts`**

```ts
import { useEffect, useMemo, useRef } from 'react';

export function useDebouncedCallback<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delayMs: number,
): (...args: Args) => void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return useMemo(() => {
    return (...args: Args) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delayMs);
    };
  }, [delayMs]);
}
```

- [ ] **Step 2: Create `draftStorage.ts`**

```ts
const KEY_PREFIX = 'hjc_draft_';

type StoredDraft<T> = { data: T; updatedAt: string };

function key(formSlug: string, draftId: string): string {
  return `${KEY_PREFIX}${formSlug}_${draftId}`;
}

export function saveDraft<T>(formSlug: string, draftId: string, data: T): void {
  const payload: StoredDraft<T> = { data, updatedAt: new Date().toISOString() };
  localStorage.setItem(key(formSlug, draftId), JSON.stringify(payload));
}

export function loadDraft<T>(formSlug: string, draftId: string): T | null {
  const raw = localStorage.getItem(key(formSlug, draftId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredDraft<T>;
    return parsed.data;
  } catch {
    return null;
  }
}

export function clearDraft(formSlug: string, draftId: string): void {
  localStorage.removeItem(key(formSlug, draftId));
}

export function listDrafts(formSlug: string): Array<{ id: string; updatedAt: string }> {
  const out: Array<{ id: string; updatedAt: string }> = [];
  const prefix = `${KEY_PREFIX}${formSlug}_`;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(prefix)) continue;
    const raw = localStorage.getItem(k);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as StoredDraft<unknown>;
      out.push({ id: k.slice(prefix.length), updatedAt: parsed.updatedAt });
    } catch {
      // skip corrupted entries
    }
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
```

- [ ] **Step 3: Create `submitQueue.ts`**

```ts
const QUEUE_KEY = 'hjc_submit_queue';
const RECORDS_PREFIX = 'hjc_records_';

export type Submission<T = unknown> = {
  id: string;
  formSlug: string;
  data: T;
  status: 'pending' | 'syncing' | 'synced' | 'error';
  enqueuedAt: string;
  syncedAt?: string;
};

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  for (const l of listeners) l();
}

function readQueue(): Submission[] {
  const raw = localStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Submission[];
  } catch {
    return [];
  }
}

function writeQueue(items: Submission[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

function readRecords<T>(formSlug: string): T[] {
  const raw = localStorage.getItem(`${RECORDS_PREFIX}${formSlug}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function writeRecords<T>(formSlug: string, items: T[]): void {
  localStorage.setItem(`${RECORDS_PREFIX}${formSlug}`, JSON.stringify(items));
}

export function getRecords<T>(formSlug: string): T[] {
  return readRecords<T>(formSlug);
}

export function getQueue(): Submission[] {
  return readQueue();
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function enqueue<T>(formSlug: string, data: T): Submission<T> {
  const submission: Submission<T> = {
    id: newId(),
    formSlug,
    data,
    status: 'pending',
    enqueuedAt: new Date().toISOString(),
  };
  const queue = readQueue();
  queue.push(submission as Submission);
  writeQueue(queue);
  notify();
  void processQueue();
  return submission;
}

export async function processQueue(): Promise<void> {
  const queue = readQueue();
  if (queue.length === 0) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

  for (const item of queue) {
    if (item.status === 'syncing' || item.status === 'synced') continue;
    item.status = 'syncing';
  }
  writeQueue(queue);
  notify();

  // Simulate network round-trip (no real backend yet).
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const fresh = readQueue();
  const remaining: Submission[] = [];
  for (const item of fresh) {
    if (item.status === 'syncing') {
      const records = readRecords(item.formSlug);
      records.unshift({ id: item.id, syncedAt: new Date().toISOString(), ...(item.data as object) });
      writeRecords(item.formSlug, records);
    } else {
      remaining.push(item);
    }
  }
  writeQueue(remaining);
  notify();
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { void processQueue(); });
  // Resume any leftover items from prior session at app boot.
  void processQueue();
}
```

- [ ] **Step 4: Verify typecheck and build**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
# Expected: exit 0
npm run build
# Expected: build succeeds
```

- [ ] **Step 5: Commit (clean staging)**

```bash
cd /Users/adebimpegodwin/Projects/hjc

git restore --staged .
git add web/src/lib/useDebouncedCallback.ts web/src/lib/draftStorage.ts web/src/lib/submitQueue.ts
git diff --cached --stat
# Expected: ONLY the 3 new lib files

git commit -m "$(cat <<'EOF'
feat(web): storage primitives — drafts + submit queue + debounce

Three pure modules with no UI dependencies:
- useDebouncedCallback: debounced setter for autosave
- draftStorage: per-form/per-draft localStorage persistence
- submitQueue: enqueue + retry-on-online + simulated 1s network

The submit queue's network simulation is the swap point for real
Laravel endpoints in a follow-up phase.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

If `git diff --cached --stat` shows files outside `web/src/lib/`, STOP and report NEEDS_CONTEXT.

---

## Task 2: Field components and forms.css

Nine reusable form-field components and a small CSS file for form-specific layout.

**Files:**
- Create: `web/src/screens/forms/fields.tsx`
- Create: `web/src/screens/forms/forms.css`

- [ ] **Step 1: Create `forms.css`**

```css
/* Form-specific layout. Inherits .field, .input, .seg, .action-bar, .stepper
   from app.css. Scoped under .app-root same as the rest of the app. */

.app-root .form-shell-top {
  padding: 16px 20px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.app-root .form-shell-top .back {
  background: transparent;
  border: 0;
  padding: 0;
  font-size: 14px;
  color: var(--ink-3);
  cursor: pointer;
  font-family: inherit;
  letter-spacing: -0.005em;
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.app-root .form-shell-top .back::before {
  content: '←';
  font-size: 16px;
}
.app-root .form-shell-top .titlerow {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.app-root .form-shell-top .title {
  font-family: 'Playfair Display', serif;
  font-size: 28px;
  font-weight: 300;
  letter-spacing: -0.03em;
  line-height: 1.05;
  color: var(--ink);
}
.app-root .form-shell-top .title em {
  font-style: italic;
  color: var(--ink-3);
}
.app-root .form-shell-top .pillar-badge {
  font-family: 'Playfair Display', serif;
  font-size: 14px;
  color: var(--ink);
  border: 1px solid var(--line);
  padding: 2px 10px;
  border-radius: 999px;
}
.app-root .form-shell-top .save-status {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--ink-3);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.app-root .form-shell-top .save-status.synced { color: var(--ink); }
.app-root .form-shell-top .save-status.pending { color: var(--accent); }

.app-root .field-error {
  font-size: 11px;
  color: var(--accent);
  margin-top: 4px;
  letter-spacing: 0.02em;
}
.app-root .field.has-error .input,
.app-root .field.has-error textarea.input {
  border-bottom: 1px solid var(--accent);
}
.app-root .field .input.bordered {
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 14px;
}
.app-root .field .input.bordered:focus {
  border-color: var(--ink);
}

.app-root .checklist {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}
.app-root .checklist .item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--ink);
  background: var(--bg);
  user-select: none;
}
.app-root .checklist .item.on {
  border-color: var(--ink);
  background: var(--bg-2);
}
.app-root .checklist .item .box {
  width: 18px; height: 18px;
  border: 1.5px solid var(--ink-3);
  border-radius: 4px;
  display: grid;
  place-items: center;
  font-size: 12px;
  color: var(--bg);
  flex-shrink: 0;
}
.app-root .checklist .item.on .box {
  background: var(--ink);
  border-color: var(--ink);
}
.app-root .checklist .item.on .box::after { content: '✓'; }

.app-root .form-list-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid var(--line);
  align-items: center;
}
.app-root .form-list-row:last-child { border-bottom: none; }
.app-root .form-list-row .name {
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
}
.app-root .form-list-row .sub {
  font-size: 11px;
  color: var(--ink-3);
  margin-top: 4px;
}
.app-root .form-list-row .right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}
.app-root .form-list-row .status {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 600;
}
.app-root .form-list-row .status.confirmed { color: var(--ink); }
.app-root .form-list-row .status.pending   { color: var(--accent); }
.app-root .form-list-row .status.declined  { color: var(--ink-3); }

.app-root .stat-strip {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line);
}
.app-root .stat-strip .num {
  font-family: 'Playfair Display', serif;
  font-size: 36px;
  font-weight: 300;
  letter-spacing: -0.03em;
  color: var(--ink);
  line-height: 1;
}
.app-root .stat-strip .lbl {
  font-size: 11px;
  color: var(--ink-3);
  letter-spacing: 0.04em;
}
.app-root .stat-strip .lbl b { color: var(--ink); font-weight: 500; }

.app-root .date-strip {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 12px 20px;
  border-bottom: 1px solid var(--line);
}
.app-root .date-strip::-webkit-scrollbar { display: none; }
.app-root .date-strip .day {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  background: transparent;
  border: 0;
  font-family: inherit;
  min-width: 52px;
}
.app-root .date-strip .day .dow {
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.app-root .date-strip .day .dnum {
  font-family: 'Playfair Display', serif;
  font-size: 22px;
  font-weight: 300;
  color: var(--ink);
  margin-top: 2px;
}
.app-root .date-strip .day.on {
  background: var(--bg-2);
}
.app-root .date-strip .day.on::after {
  content: '';
  display: block;
  width: 16px;
  height: 2px;
  background: var(--accent);
  margin-top: 4px;
}

.app-root .add-toggle {
  display: block;
  width: 100%;
  padding: 12px 20px;
  background: var(--bg-2);
  border: 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
  letter-spacing: -0.005em;
  cursor: pointer;
  text-align: left;
}
.app-root .add-toggle::before {
  content: '+ ';
  color: var(--accent);
  font-weight: 600;
}

.app-root .inline-form {
  padding: 8px 20px 16px;
  background: var(--bg-2);
  border-bottom: 1px solid var(--line);
}
.app-root .inline-form .row {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}
.app-root .inline-form .row .btn {
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 999px;
  border: 1px solid var(--ink);
  background: var(--bg);
  color: var(--ink);
  font-family: inherit;
  cursor: pointer;
}
.app-root .inline-form .row .btn.primary {
  background: var(--ink);
  color: var(--bg);
}
.app-root .inline-form .row .btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (min-width: 1024px) {
  .app-root .form-shell-top {
    max-width: 760px;
    margin: 0 auto;
    padding: 32px 48px 16px;
  }
  .app-root .form-shell-top .title { font-size: 36px; }
  .app-root .stepper {
    max-width: 760px;
    margin: 0 auto;
  }
  .app-root .fields,
  .app-root .stat-strip,
  .app-root .date-strip,
  .app-root .add-toggle,
  .app-root .inline-form {
    max-width: 760px;
    margin-left: auto;
    margin-right: auto;
  }
}
```

- [ ] **Step 2: Create `fields.tsx`**

```tsx
import { type ChangeEvent, type ReactNode } from 'react';

type BaseFieldProps = {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
};

const FieldWrapper = ({ label, required, error, children }: BaseFieldProps) => (
  <div className={'field' + (error ? ' has-error' : '')}>
    <div className="lbl">
      <span>{label}{required && <span className="req"> *</span>}</span>
    </div>
    {children}
    {error && <div className="field-error">{error}</div>}
  </div>
);

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
  type?: 'text' | 'email';
};

export const TextField = ({ label, value, onChange, required, error, placeholder, type = 'text' }: TextFieldProps) => (
  <FieldWrapper label={label} required={required} error={error}>
    <input
      type={type}
      className="input"
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </FieldWrapper>
);

export const TextareaField = ({ label, value, onChange, required, error, placeholder }: Omit<TextFieldProps, 'type'>) => (
  <FieldWrapper label={label} required={required} error={error}>
    <textarea
      className="input area"
      value={value}
      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </FieldWrapper>
);

export const PhoneField = ({ label, value, onChange, required, error, placeholder = '+233 …' }: Omit<TextFieldProps, 'type'>) => (
  <FieldWrapper label={label} required={required} error={error}>
    <input
      type="tel"
      className="input"
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </FieldWrapper>
);

type NumberFieldProps = {
  label: string;
  value: number | '';
  onChange: (v: number | '') => void;
  required?: boolean;
  error?: string;
  suffix?: string;
  prefix?: string;
};

export const NumberField = ({ label, value, onChange, required, error, suffix, prefix }: NumberFieldProps) => (
  <FieldWrapper label={label} required={required} error={error}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      {prefix && <span style={{ color: 'var(--ink-3)', fontSize: 14 }}>{prefix}</span>}
      <input
        type="number"
        className="input"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const raw = e.target.value;
          onChange(raw === '' ? '' : Number(raw));
        }}
      />
      {suffix && <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>{suffix}</span>}
    </div>
  </FieldWrapper>
);

export const CurrencyField = (props: Omit<NumberFieldProps, 'prefix'> & { currency?: string }) => (
  <NumberField {...props} prefix={props.currency ?? '₵'} />
);

type SegmentedFieldProps = {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
};

export const SegmentedField = ({ label, options, value, onChange, required, error }: SegmentedFieldProps) => (
  <FieldWrapper label={label} required={required} error={error}>
    <div className="seg">
      {options.map((opt) => (
        <span
          key={opt.value}
          className={value === opt.value ? 'on' : ''}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </span>
      ))}
    </div>
  </FieldWrapper>
);

type SelectFieldProps = {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
};

export const SelectField = ({ label, options, value, onChange, required, error, placeholder }: SelectFieldProps) => (
  <FieldWrapper label={label} required={required} error={error}>
    <select
      className="input bordered"
      value={value}
      onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </FieldWrapper>
);

type DateFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  type?: 'date' | 'time' | 'datetime-local';
};

export const DateField = ({ label, value, onChange, required, error, type = 'date' }: DateFieldProps) => (
  <FieldWrapper label={label} required={required} error={error}>
    <input
      type={type}
      className="input bordered"
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
    />
  </FieldWrapper>
);

type ChecklistFieldProps = {
  label: string;
  items: string[];
  value: string[];
  onChange: (v: string[]) => void;
  required?: boolean;
  minRequired?: number;
  error?: string;
};

export const ChecklistField = ({ label, items, value, onChange, required, minRequired, error }: ChecklistFieldProps) => {
  const toggle = (item: string) => {
    if (value.includes(item)) onChange(value.filter((v) => v !== item));
    else onChange([...value, item]);
  };
  const subLabel = minRequired ? `${label} (≥ ${minRequired})` : label;
  return (
    <FieldWrapper label={subLabel} required={required} error={error}>
      <div className="checklist">
        {items.map((item) => (
          <button
            type="button"
            key={item}
            className={'item' + (value.includes(item) ? ' on' : '')}
            onClick={() => toggle(item)}
          >
            <span className="box"/>
            <span>{item}</span>
          </button>
        ))}
      </div>
    </FieldWrapper>
  );
};
```

- [ ] **Step 3: Verify typecheck and build**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
npm run build
```

- [ ] **Step 4: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc

git restore --staged .
git add web/src/screens/forms/fields.tsx web/src/screens/forms/forms.css
git diff --cached --stat
# Expected: ONLY fields.tsx and forms.css

git commit -m "$(cat <<'EOF'
feat(web): form field components + forms.css

Nine reusable presentational field components (TextField,
TextareaField, PhoneField, NumberField, CurrencyField,
SegmentedField, SelectField, DateField, ChecklistField) and a CSS
file for form-shell layout, stat strips, date-pickers, inline
add-forms, and checklist styling. All scoped under .app-root.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: FormShell component

The shell that wraps form content — top bar (back / title / pillar / save-status) and an action bar at the bottom. Optional stepper.

**Files:**
- Create: `web/src/screens/forms/FormShell.tsx`

- [ ] **Step 1: Create `FormShell.tsx`**

```tsx
import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import './forms.css';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'pending' | 'synced' | 'error';

export type FormShellProps = {
  title: ReactNode;
  pillar: string;
  steps?: Array<{ id: string; label: string }>;
  currentStepId?: string;
  saveStatus?: SaveStatus;
  saveStatusLabel?: string;
  primaryAction: { label: string; onClick: () => void; disabled?: boolean };
  secondaryAction?: { label: string; onClick: () => void };
  backTo?: string;
  children: ReactNode;
};

const statusLabel = (s: SaveStatus, override?: string): string => {
  if (override) return override;
  switch (s) {
    case 'saving': return 'Saving…';
    case 'saved': return 'Saved';
    case 'pending': return 'Pending sync';
    case 'synced': return 'Synced ✓';
    case 'error': return 'Save error';
    default: return '';
  }
};

const statusClass = (s: SaveStatus): string => {
  if (s === 'pending') return 'pending';
  if (s === 'synced' || s === 'saved') return 'synced';
  return '';
};

export const FormShell = ({
  title,
  pillar,
  steps,
  currentStepId,
  saveStatus = 'idle',
  saveStatusLabel,
  primaryAction,
  secondaryAction,
  backTo = '/forms',
  children,
}: FormShellProps) => {
  const navigate = useNavigate();
  const currentStepIndex = steps?.findIndex((s) => s.id === currentStepId) ?? -1;

  return (
    <>
      <div className="form-shell-top">
        <button type="button" className="back" onClick={() => navigate(backTo)}>Back to forms</button>
        <div className="titlerow">
          <h1 className="title serif">{title}</h1>
          <span className="pillar-badge">{pillar}</span>
        </div>
        {saveStatus !== 'idle' && (
          <div className={'save-status ' + statusClass(saveStatus)}>
            {statusLabel(saveStatus, saveStatusLabel)}
          </div>
        )}
      </div>

      {steps && steps.length > 1 && (
        <div className="stepper">
          {steps.map((s, i) => {
            const isDone = i < currentStepIndex;
            const isActive = i === currentStepIndex;
            return (
              <div
                key={s.id}
                className={'st' + (isDone ? ' done' : '') + (isActive ? ' active' : '')}
                title={s.label}
              />
            );
          })}
        </div>
      )}

      {children}

      <div className="action-bar">
        {secondaryAction && (
          <button type="button" className="btn" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </button>
        )}
        <div style={{ flex: 1 }}/>
        <button
          type="button"
          className="btn primary"
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
        >
          {primaryAction.label}
        </button>
      </div>
    </>
  );
};
```

- [ ] **Step 2: Verify typecheck**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc

git restore --staged .
git add web/src/screens/forms/FormShell.tsx
git diff --cached --stat
# Expected: ONLY FormShell.tsx

git commit -m "$(cat <<'EOF'
feat(web): FormShell — editorial top bar, optional stepper, action bar

Shared shell for form-fill screens. Renders the form's editorial top
bar (back arrow, Playfair-italic title, pillar badge, save status),
an optional .stepper progress strip, the children content, and the
sticky .action-bar with primary/secondary CTAs. Inherits all visual
tokens from app.css.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: BOT Roster form

The simplest form. Single-screen list + inline-add. First end-to-end use of FormShell, fields, and submitQueue.

**Files:**
- Create: `web/src/screens/forms/BOTForm.tsx`
- Modify: `web/src/App.tsx` — add `/forms/bot` route

- [ ] **Step 1: Create `BOTForm.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, PhoneField, SegmentedField, TextareaField } from './fields';
import { enqueue, getRecords, subscribe } from '../../lib/submitQueue';
import './forms.css';

type BOTRecord = {
  id?: string;
  name: string;
  role: string;
  organization: string;
  phone: string;
  email: string;
  status: 'confirmed' | 'pending' | 'declined';
  notes: string;
};

const SEED: BOTRecord[] = [
  { name: 'Rev. Edmund Asare', role: 'Chair', organization: 'Wa Council of Churches', phone: '+233 24 555 0100', email: '', status: 'confirmed', notes: '' },
  { name: 'Mrs. Adwoa Mensah', role: 'Treasurer', organization: 'Christ Apostolic', phone: '+233 24 555 0101', email: '', status: 'confirmed', notes: '' },
  { name: 'Pastor Kwaku Frimpong', role: 'Secretary', organization: 'Living Word', phone: '+233 24 555 0102', email: '', status: 'pending', notes: '' },
];

const FORM_SLUG = 'bot';

const emptyForm: BOTRecord = {
  name: '', role: '', organization: '', phone: '', email: '', status: 'pending', notes: '',
};

export function BOTForm() {
  const [trustees, setTrustees] = useState<BOTRecord[]>(() => {
    const stored = getRecords<BOTRecord>(FORM_SLUG);
    return stored.length > 0 ? stored : SEED;
  });
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<BOTRecord>(emptyForm);

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      const stored = getRecords<BOTRecord>(FORM_SLUG);
      if (stored.length > 0) setTrustees(stored);
    });
    return () => { unsubscribe(); };
  }, []);

  const canSave = draft.name.trim() !== '' && draft.role.trim() !== '' && draft.phone.trim() !== '';

  const handleSave = () => {
    enqueue<BOTRecord>(FORM_SLUG, draft);
    setDraft(emptyForm);
    setShowForm(false);
  };

  const confirmedCount = trustees.filter((t) => t.status === 'confirmed').length;
  const pendingCount = trustees.filter((t) => t.status === 'pending').length;

  return (
    <ResponsiveShell active="forms">
      <FormShell
        title={<>BOT <em>Board of Trustees</em></>}
        pillar="P3"
        primaryAction={{ label: 'Done', onClick: () => window.history.back() }}
      >
        <div className="stat-strip">
          <div>
            <div className="num">{confirmedCount}</div>
            <div className="lbl">of {trustees.length} confirmed</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div>
            <div className="lbl"><b>{pendingCount}</b> pending</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {trustees.map((t, i) => (
            <div key={t.id ?? `${t.name}-${i}`} className="form-list-row">
              <div>
                <div className="name">{t.name}</div>
                <div className="sub">{t.role}{t.organization && ` · ${t.organization}`}</div>
              </div>
              <div className="right">
                <div className={'status ' + t.status}>{t.status}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>{t.phone}</div>
              </div>
            </div>
          ))}
        </div>

        <button type="button" className="add-toggle" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Cancel' : 'Add trustee'}
        </button>

        {showForm && (
          <div className="inline-form">
            <div className="fields" style={{ padding: 0 }}>
              <TextField label="Full name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} required/>
              <TextField label="Role" placeholder="e.g. Treasurer" value={draft.role} onChange={(v) => setDraft({ ...draft, role: v })} required/>
              <TextField label="Organization" value={draft.organization} onChange={(v) => setDraft({ ...draft, organization: v })}/>
              <PhoneField label="Phone" value={draft.phone} onChange={(v) => setDraft({ ...draft, phone: v })} required/>
              <TextField label="Email" type="email" value={draft.email} onChange={(v) => setDraft({ ...draft, email: v })}/>
              <SegmentedField
                label="Status"
                options={[
                  { value: 'confirmed', label: 'Confirmed' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'declined', label: 'Declined' },
                ]}
                value={draft.status}
                onChange={(v) => setDraft({ ...draft, status: v as BOTRecord['status'] })}
                required
              />
              <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>
            </div>
            <div className="row">
              <button type="button" className="btn" onClick={() => { setDraft(emptyForm); setShowForm(false); }}>Cancel</button>
              <button type="button" className="btn primary" onClick={handleSave} disabled={!canSave}>Save trustee</button>
            </div>
          </div>
        )}
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
```

- [ ] **Step 2: Add `/forms/bot` route to `App.tsx`**

In `web/src/App.tsx`:

a. Add import near the other screen imports:

```tsx
import { BOTForm } from './screens/forms/BOTForm';
```

b. Add the route. Find the `/forms` placeholder route (or the `/log` route) and place the new route nearby, before the `/m/*` redirects. The existing `Placeholder` route is `<Route path="/forms" element={...}>` — wait, the current App.tsx routes the `/forms` path to `<FormsScreen/>`, not Placeholder. We're adding a CHILD path: `/forms/bot`.

Add this line in the "Real screens at root" section (after `/forms`):

```tsx
<Route path="/forms/bot" element={<RequireAuth><BOTForm /></RequireAuth>} />
```

- [ ] **Step 3: Verify typecheck and build**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
npm run build
```

- [ ] **Step 4: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc

git restore --staged .
git add web/src/screens/forms/BOTForm.tsx web/src/App.tsx
git diff --cached --stat
# Expected: ONLY BOTForm.tsx and App.tsx

git commit -m "$(cat <<'EOF'
feat(web): BOT roster form (single-screen append-to-list)

First end-to-end form using FormShell + fields + submitQueue.
Lists existing trustees (seeded with 3 mock records, replaced by
synced records from localStorage once anything is added). Inline
"Add trustee" form expands below the toggle button, validates
name/role/phone as required, enqueues the new trustee on Save.
Routed at /forms/bot.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: PCM Hunt Daily Activity form

Date-keyed append-mode log. Each entry is its own submission; same date can have many.

**Files:**
- Create: `web/src/screens/forms/PCMHuntDailyForm.tsx`
- Modify: `web/src/App.tsx` — add `/forms/pcm-hunt-daily` route

- [ ] **Step 1: Create `PCMHuntDailyForm.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { TextField, PhoneField, SegmentedField, TextareaField, NumberField, CurrencyField, DateField } from './fields';
import { enqueue, getRecords, subscribe } from '../../lib/submitQueue';
import './forms.css';

type HuntEntry = {
  id?: string;
  date: string;          // YYYY-MM-DD
  time: string;          // HH:MM
  location: string;
  contactName: string;
  contactPhone: string;
  outcome: 'met' | 'no-show' | 'reschedule' | 'won';
  leadsGenerated: number | '';
  expense: number | '';
  notes: string;
};

const FORM_SLUG = 'pcm-hunt-daily';

const SEED: HuntEntry[] = [
  { date: todayISO(), time: '11:42', location: 'Wa Pastors\' Fellowship', contactName: 'Pst. Kofi Adjei', contactPhone: '+233 24 555 1001', outcome: 'won', leadsGenerated: 2, expense: 45, notes: 'Confirmed for PCM. Following up Tue.' },
  { date: todayISO(), time: '09:14', location: 'Christ Apostolic Wa', contactName: 'Rev. Mensah', contactPhone: '+233 24 555 1002', outcome: 'met', leadsGenerated: 1, expense: 30, notes: '' },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function last14Days(): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function formatDayLabel(iso: string): { dow: string; dnum: string } {
  const d = new Date(iso + 'T00:00:00');
  return {
    dow: d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase(),
    dnum: String(d.getDate()),
  };
}

const emptyEntry = (date: string): HuntEntry => ({
  date,
  time: nowHHMM(),
  location: '',
  contactName: '',
  contactPhone: '',
  outcome: 'met',
  leadsGenerated: '',
  expense: '',
  notes: '',
});

export function PCMHuntDailyForm() {
  const [allEntries, setAllEntries] = useState<HuntEntry[]>(() => {
    const stored = getRecords<HuntEntry>(FORM_SLUG);
    return stored.length > 0 ? stored : SEED;
  });
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<HuntEntry>(emptyEntry(todayISO()));

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      const stored = getRecords<HuntEntry>(FORM_SLUG);
      if (stored.length > 0) setAllEntries(stored);
    });
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    setDraft((d) => ({ ...d, date: selectedDate }));
  }, [selectedDate]);

  const dayEntries = useMemo(
    () => allEntries.filter((e) => e.date === selectedDate).sort((a, b) => b.time.localeCompare(a.time)),
    [allEntries, selectedDate],
  );

  const dayContacts = dayEntries.filter((e) => e.outcome === 'met' || e.outcome === 'won').length;
  const daySpend = dayEntries.reduce((sum, e) => sum + (typeof e.expense === 'number' ? e.expense : 0), 0);

  const canAdd = draft.location.trim() !== '' && draft.contactName.trim() !== '' && draft.time !== '';

  const handleAdd = () => {
    enqueue<HuntEntry>(FORM_SLUG, draft);
    setDraft(emptyEntry(selectedDate));
    // Don't collapse the form — director may want to add another immediately.
  };

  const days = last14Days();
  const isToday = selectedDate === todayISO();

  return (
    <ResponsiveShell active="forms">
      <FormShell
        title={<>PCM Hunt <em>Daily Activity</em></>}
        pillar="P1"
        primaryAction={{ label: 'Done', onClick: () => window.history.back() }}
      >
        <div className="date-strip">
          {days.map((iso) => {
            const { dow, dnum } = formatDayLabel(iso);
            return (
              <button
                type="button"
                key={iso}
                className={'day' + (selectedDate === iso ? ' on' : '')}
                onClick={() => setSelectedDate(iso)}
              >
                <span className="dow">{dow}</span>
                <span className="dnum">{dnum}</span>
              </button>
            );
          })}
        </div>

        <div className="stat-strip">
          <div>
            <div className="num">{dayEntries.length}</div>
            <div className="lbl">entries</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div>
            <div className="lbl"><b>{dayContacts}</b> contacts · <b>₵{daySpend}</b> spent</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {dayEntries.length === 0 && (
            <div style={{ padding: '24px 0', fontSize: 13, color: 'var(--ink-3)', textAlign: 'center' }}>
              No entries logged for this day.
            </div>
          )}
          {dayEntries.map((e, i) => (
            <div key={e.id ?? `${e.time}-${i}`} className="form-list-row">
              <div>
                <div className="name">{e.location}</div>
                <div className="sub">{e.contactName}{e.notes && ` · ${e.notes.slice(0, 60)}${e.notes.length > 60 ? '…' : ''}`}</div>
              </div>
              <div className="right">
                <div className={'status ' + (e.outcome === 'won' ? 'confirmed' : e.outcome === 'no-show' ? 'declined' : 'pending')}>{e.outcome.replace('-', ' ')}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>
                  {e.time}{typeof e.expense === 'number' && e.expense > 0 ? ` · ₵${e.expense}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>

        {isToday && (
          <button type="button" className="add-toggle" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : 'Log activity'}
          </button>
        )}

        {showForm && isToday && (
          <div className="inline-form">
            <div className="fields" style={{ padding: 0 }}>
              <DateField label="Time" type="time" value={draft.time} onChange={(v) => setDraft({ ...draft, time: v })} required/>
              <TextField label="Location visited" placeholder="Church / venue" value={draft.location} onChange={(v) => setDraft({ ...draft, location: v })} required/>
              <TextField label="Contact name" value={draft.contactName} onChange={(v) => setDraft({ ...draft, contactName: v })} required/>
              <PhoneField label="Contact phone" value={draft.contactPhone} onChange={(v) => setDraft({ ...draft, contactPhone: v })}/>
              <SegmentedField
                label="Outcome"
                options={[
                  { value: 'met', label: 'Met' },
                  { value: 'no-show', label: 'No-show' },
                  { value: 'reschedule', label: 'Re-sched' },
                  { value: 'won', label: 'Won' },
                ]}
                value={draft.outcome}
                onChange={(v) => setDraft({ ...draft, outcome: v as HuntEntry['outcome'] })}
                required
              />
              <NumberField label="Leads generated" value={draft.leadsGenerated} onChange={(v) => setDraft({ ...draft, leadsGenerated: v })}/>
              <CurrencyField label="Expense" value={draft.expense} onChange={(v) => setDraft({ ...draft, expense: v })}/>
              <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })}/>
            </div>
            <div className="row">
              <button type="button" className="btn" onClick={() => setDraft(emptyEntry(selectedDate))}>Clear</button>
              <button type="button" className="btn primary" onClick={handleAdd} disabled={!canAdd}>Add entry</button>
            </div>
          </div>
        )}
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
```

- [ ] **Step 2: Add `/forms/pcm-hunt-daily` route to `App.tsx`**

In `web/src/App.tsx`, add the import:

```tsx
import { PCMHuntDailyForm } from './screens/forms/PCMHuntDailyForm';
```

And add the route in the "Real screens at root" section, alongside `/forms/bot`:

```tsx
<Route path="/forms/pcm-hunt-daily" element={<RequireAuth><PCMHuntDailyForm /></RequireAuth>} />
```

- [ ] **Step 3: Verify typecheck and build**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
npm run build
```

- [ ] **Step 4: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc

git restore --staged .
git add web/src/screens/forms/PCMHuntDailyForm.tsx web/src/App.tsx
git diff --cached --stat
# Expected: ONLY PCMHuntDailyForm.tsx and App.tsx

git commit -m "$(cat <<'EOF'
feat(web): PCM Hunt Daily Activity form (date-keyed append log)

Per-day view of hunt activity. 14-day horizontal date selector;
selecting a day filters entries client-side. Day rollup shows
entry count, met/won contacts, total spend. Inline "Log activity"
form on today only — past days are read-only. Each entry is
enqueued independently as added; the form stays open after add so
the director can rapid-fire entries during a hunt day.

Routed at /forms/pcm-hunt-daily.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: PCM List + Wizard

The most complex form. List screen + 4-step wizard with autosave + draft restore.

**Files:**
- Create: `web/src/screens/forms/PCMListScreen.tsx`
- Create: `web/src/screens/forms/PCMForm.tsx`
- Modify: `web/src/App.tsx` — add `/forms/pcm` and `/forms/pcm/new` routes

- [ ] **Step 1: Create `PCMListScreen.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell } from './FormShell';
import { getRecords, subscribe } from '../../lib/submitQueue';
import './forms.css';

export type PCMRecord = {
  id?: string;
  fullName: string;
  denomination: string;
  churchName: string;
  role: string;
  yearsInMinistry: number | '';
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  zone: string;
  backgroundCheck: 'pending' | 'cleared' | 'flagged';
  reference1Name: string;
  reference1Phone: string;
  reference2Name: string;
  reference2Phone: string;
  characteristicsMet: string[];
  vettingNotes: string;
  attestation: boolean;
  syncedAt?: string;
};

const FORM_SLUG = 'pcm';

const SEED: PCMRecord[] = [
  { fullName: 'Pst. Bernard Anchebah', denomination: 'pentecostal', churchName: 'Fountain Gate Wa', role: 'Senior Pastor', yearsInMinistry: 12, phone: '+233 24 555 0200', whatsapp: '', email: '', address: '', zone: 'wa-central', backgroundCheck: 'cleared', reference1Name: 'Bp. Lovell Asare', reference1Phone: '+233 24 555 9000', reference2Name: '', reference2Phone: '', characteristicsMet: ['Ordained 5+ years', 'Active congregation 100+', 'Endorsed by district overseer'], vettingNotes: '', attestation: true },
  { fullName: 'Rev. Kofi Adjei', denomination: 'methodist', churchName: 'Living Word Wa', role: 'Senior Pastor', yearsInMinistry: 8, phone: '+233 24 555 0201', whatsapp: '', email: '', address: '', zone: 'wa-north', backgroundCheck: 'cleared', reference1Name: 'Bp. Lovell Asare', reference1Phone: '+233 24 555 9000', reference2Name: '', reference2Phone: '', characteristicsMet: ['Ordained 5+ years', 'Active congregation 100+', 'Fluent in local language'], vettingNotes: '', attestation: true },
];

const STATUS_LABEL: Record<PCMRecord['backgroundCheck'], string> = {
  cleared: 'Confirmed',
  pending: 'Vetting',
  flagged: 'Flagged',
};

const STATUS_CLASS: Record<PCMRecord['backgroundCheck'], string> = {
  cleared: 'confirmed',
  pending: 'pending',
  flagged: 'declined',
};

export function PCMListScreen() {
  const navigate = useNavigate();
  const [pcms, setPcms] = useState<PCMRecord[]>(() => {
    const stored = getRecords<PCMRecord>(FORM_SLUG);
    return stored.length > 0 ? stored : SEED;
  });

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      const stored = getRecords<PCMRecord>(FORM_SLUG);
      if (stored.length > 0) setPcms(stored);
    });
    return () => { unsubscribe(); };
  }, []);

  const confirmedCount = pcms.filter((p) => p.backgroundCheck === 'cleared').length;
  const vettingCount = pcms.filter((p) => p.backgroundCheck === 'pending').length;

  return (
    <ResponsiveShell active="forms">
      <FormShell
        title={<>PCM <em>Primary Committee</em></>}
        pillar="P1"
        primaryAction={{ label: 'Add new PCM', onClick: () => navigate('/forms/pcm/new') }}
      >
        <div className="stat-strip">
          <div>
            <div className="num">{confirmedCount}</div>
            <div className="lbl">of {pcms.length} confirmed</div>
          </div>
          <div style={{ flex: 1 }}/>
          <div>
            <div className="lbl"><b>{vettingCount}</b> in vetting</div>
          </div>
        </div>

        <div style={{ padding: '0 20px' }}>
          {pcms.map((p, i) => (
            <div key={p.id ?? `${p.fullName}-${i}`} className="form-list-row">
              <div>
                <div className="name">{p.fullName}</div>
                <div className="sub">{p.churchName}{p.role && ` · ${p.role}`}</div>
              </div>
              <div className="right">
                <div className={'status ' + STATUS_CLASS[p.backgroundCheck]}>{STATUS_LABEL[p.backgroundCheck]}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--ink-3)' }}>{p.phone}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}
```

- [ ] **Step 2: Create `PCMForm.tsx` (the wizard)**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveShell } from '../app/Shell';
import { FormShell, type SaveStatus } from './FormShell';
import {
  TextField, TextareaField, PhoneField, NumberField,
  SegmentedField, SelectField, ChecklistField,
} from './fields';
import { saveDraft, loadDraft, clearDraft } from '../../lib/draftStorage';
import { enqueue } from '../../lib/submitQueue';
import { useDebouncedCallback } from '../../lib/useDebouncedCallback';
import type { PCMRecord } from './PCMListScreen';
import './forms.css';

const FORM_SLUG = 'pcm';

const STEPS = [
  { id: 'identification', label: 'Identification' },
  { id: 'contact', label: 'Contact & Location' },
  { id: 'vetting', label: 'Vetting' },
  { id: 'review', label: 'Review' },
];

const DENOMINATIONS = [
  { value: 'pentecostal', label: 'Pentecostal' },
  { value: 'baptist', label: 'Baptist' },
  { value: 'methodist', label: 'Methodist' },
  { value: 'anglican', label: 'Anglican' },
  { value: 'catholic', label: 'Catholic' },
  { value: 'other', label: 'Other' },
];

const ZONES = [
  { value: 'wa-central', label: 'Wa Central' },
  { value: 'wa-north', label: 'Wa North' },
  { value: 'wa-south', label: 'Wa South' },
  { value: 'wa-east', label: 'Wa East' },
  { value: 'wa-west', label: 'Wa West' },
];

const CHARACTERISTICS = [
  'Ordained 5+ years',
  'Active congregation 100+',
  'No prior moral failures',
  'Fluent in local language',
  'Endorsed by district overseer',
  'Available throughout crusade window',
  'Owns transport',
];

const MIN_CHARACTERISTICS = 3;

const emptyForm: PCMRecord = {
  fullName: '', denomination: '', churchName: '', role: '', yearsInMinistry: '',
  phone: '', whatsapp: '', email: '', address: '', zone: '',
  backgroundCheck: 'pending',
  reference1Name: '', reference1Phone: '', reference2Name: '', reference2Phone: '',
  characteristicsMet: [],
  vettingNotes: '',
  attestation: false,
};

type DraftState = { stepId: string; data: PCMRecord };

function newDraftId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function PCMForm() {
  const navigate = useNavigate();
  const [draftId] = useState<string>(() => {
    const stored = sessionStorage.getItem('hjc_active_pcm_draft');
    if (stored) return stored;
    const id = newDraftId();
    sessionStorage.setItem('hjc_active_pcm_draft', id);
    return id;
  });
  const [stepId, setStepId] = useState<string>(STEPS[0].id);
  const [data, setData] = useState<PCMRecord>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [hasRestored, setHasRestored] = useState(false);

  // Restore draft once on mount.
  useEffect(() => {
    const restored = loadDraft<DraftState>(FORM_SLUG, draftId);
    if (restored) {
      setData(restored.data);
      setStepId(restored.stepId);
    }
    setHasRestored(true);
  }, [draftId]);

  const persist = useDebouncedCallback((next: PCMRecord, nextStepId: string) => {
    saveDraft<DraftState>(FORM_SLUG, draftId, { stepId: nextStepId, data: next });
    setSaveStatus('saved');
  }, 500);

  // Autosave once the restore step has run, so we don't overwrite stored
  // drafts with the initial empty form on first mount.
  useEffect(() => {
    if (!hasRestored) return;
    persist(data, stepId);
    setSaveStatus('saving');
  }, [data, stepId, persist, hasRestored]);

  const update = <K extends keyof PCMRecord>(key: K, value: PCMRecord[K]) => {
    setData((d) => ({ ...d, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const { [key as string]: _removed, ...rest } = e;
      return rest;
    });
  };

  const validateStep = (id: string): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (id === 'identification') {
      if (!data.fullName.trim()) errs.fullName = 'Required';
      if (!data.denomination) errs.denomination = 'Required';
      if (!data.churchName.trim()) errs.churchName = 'Required';
      if (!data.role.trim()) errs.role = 'Required';
    } else if (id === 'contact') {
      if (!data.phone.trim()) errs.phone = 'Required';
      if (!data.zone) errs.zone = 'Required';
    } else if (id === 'vetting') {
      if (!data.backgroundCheck) errs.backgroundCheck = 'Required';
      if (!data.reference1Name.trim()) errs.reference1Name = 'Required';
      if (!data.reference1Phone.trim()) errs.reference1Phone = 'Required';
      if (data.characteristicsMet.length < MIN_CHARACTERISTICS) {
        errs.characteristicsMet = `Select at least ${MIN_CHARACTERISTICS}`;
      }
    } else if (id === 'review') {
      if (!data.attestation) errs.attestation = 'You must attest before submitting';
    }
    return errs;
  };

  const stepIndex = STEPS.findIndex((s) => s.id === stepId);
  const isReview = stepId === 'review';

  const handleContinue = () => {
    const errs = validateStep(stepId);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    if (stepIndex < STEPS.length - 1) {
      setStepId(STEPS[stepIndex + 1].id);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepId(STEPS[stepIndex - 1].id);
  };

  const handleSubmit = () => {
    const errs = validateStep('review');
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    enqueue<PCMRecord>(FORM_SLUG, data);
    clearDraft(FORM_SLUG, draftId);
    sessionStorage.removeItem('hjc_active_pcm_draft');
    navigate('/forms/pcm');
  };

  const handleSaveDraft = () => {
    saveDraft<DraftState>(FORM_SLUG, draftId, { stepId, data });
    setSaveStatus('saved');
  };

  const titleByStep = useMemo(() => STEPS.find((s) => s.id === stepId)?.label ?? '', [stepId]);

  return (
    <ResponsiveShell active="forms">
      <FormShell
        title={<>New PCM · <em>{titleByStep}</em></>}
        pillar="P1"
        steps={STEPS}
        currentStepId={stepId}
        saveStatus={saveStatus}
        backTo="/forms/pcm"
        primaryAction={
          isReview
            ? { label: 'Submit PCM', onClick: handleSubmit, disabled: !data.attestation }
            : { label: 'Continue →', onClick: handleContinue }
        }
        secondaryAction={
          stepIndex > 0
            ? { label: 'Back', onClick: handleBack }
            : { label: 'Save draft', onClick: handleSaveDraft }
        }
      >
        <div className="fields">
          {stepId === 'identification' && (
            <>
              <TextField label="Full name" required value={data.fullName} onChange={(v) => update('fullName', v)} error={errors.fullName}/>
              <SelectField label="Denomination" required options={DENOMINATIONS} value={data.denomination} onChange={(v) => update('denomination', v)} placeholder="Select…" error={errors.denomination}/>
              <TextField label="Church name" required value={data.churchName} onChange={(v) => update('churchName', v)} error={errors.churchName}/>
              <TextField label="Role / title" required placeholder="e.g. Senior Pastor" value={data.role} onChange={(v) => update('role', v)} error={errors.role}/>
              <NumberField label="Years in ministry" suffix="yrs" value={data.yearsInMinistry} onChange={(v) => update('yearsInMinistry', v)}/>
              <div className="field">
                <div className="lbl"><span>Photo</span></div>
                <button type="button" className="btn" disabled style={{ opacity: 0.5 }}>+ Add photo (coming soon)</button>
              </div>
            </>
          )}

          {stepId === 'contact' && (
            <>
              <PhoneField label="Phone" required value={data.phone} onChange={(v) => update('phone', v)} error={errors.phone}/>
              <PhoneField label="WhatsApp" value={data.whatsapp} onChange={(v) => update('whatsapp', v)}/>
              <TextField label="Email" type="email" value={data.email} onChange={(v) => update('email', v)}/>
              <TextareaField label="Address" value={data.address} onChange={(v) => update('address', v)}/>
              <SelectField label="Zone" required options={ZONES} value={data.zone} onChange={(v) => update('zone', v)} placeholder="Select…" error={errors.zone}/>
              <div className="field">
                <div className="lbl"><span>GPS coordinates</span></div>
                <button type="button" className="btn" disabled style={{ opacity: 0.5 }}>Use my location (coming soon)</button>
              </div>
            </>
          )}

          {stepId === 'vetting' && (
            <>
              <SegmentedField
                label="Background check status"
                required
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'cleared', label: 'Cleared' },
                  { value: 'flagged', label: 'Flagged' },
                ]}
                value={data.backgroundCheck}
                onChange={(v) => update('backgroundCheck', v as PCMRecord['backgroundCheck'])}
                error={errors.backgroundCheck}
              />
              <TextField label="Reference 1 — name" required value={data.reference1Name} onChange={(v) => update('reference1Name', v)} error={errors.reference1Name}/>
              <PhoneField label="Reference 1 — phone" required value={data.reference1Phone} onChange={(v) => update('reference1Phone', v)} error={errors.reference1Phone}/>
              <TextField label="Reference 2 — name" value={data.reference2Name} onChange={(v) => update('reference2Name', v)}/>
              <PhoneField label="Reference 2 — phone" value={data.reference2Phone} onChange={(v) => update('reference2Phone', v)}/>
              <ChecklistField
                label="Characteristics met"
                items={CHARACTERISTICS}
                value={data.characteristicsMet}
                onChange={(v) => update('characteristicsMet', v)}
                required
                minRequired={MIN_CHARACTERISTICS}
                error={errors.characteristicsMet}
              />
              <TextareaField label="Vetting notes" value={data.vettingNotes} onChange={(v) => update('vettingNotes', v)}/>
            </>
          )}

          {stepId === 'review' && (
            <>
              <ReviewSection title="Identification" onEdit={() => setStepId('identification')}>
                <ReviewLine label="Full name" value={data.fullName}/>
                <ReviewLine label="Denomination" value={DENOMINATIONS.find((d) => d.value === data.denomination)?.label ?? data.denomination}/>
                <ReviewLine label="Church" value={data.churchName}/>
                <ReviewLine label="Role" value={data.role}/>
                {data.yearsInMinistry !== '' && <ReviewLine label="Years in ministry" value={`${data.yearsInMinistry} yrs`}/>}
              </ReviewSection>
              <ReviewSection title="Contact & Location" onEdit={() => setStepId('contact')}>
                <ReviewLine label="Phone" value={data.phone}/>
                {data.whatsapp && <ReviewLine label="WhatsApp" value={data.whatsapp}/>}
                {data.email && <ReviewLine label="Email" value={data.email}/>}
                {data.address && <ReviewLine label="Address" value={data.address}/>}
                <ReviewLine label="Zone" value={ZONES.find((z) => z.value === data.zone)?.label ?? data.zone}/>
              </ReviewSection>
              <ReviewSection title="Vetting" onEdit={() => setStepId('vetting')}>
                <ReviewLine label="Background check" value={data.backgroundCheck}/>
                <ReviewLine label="Reference 1" value={`${data.reference1Name} · ${data.reference1Phone}`}/>
                {data.reference2Name && <ReviewLine label="Reference 2" value={`${data.reference2Name} · ${data.reference2Phone}`}/>}
                <ReviewLine label="Characteristics met" value={`${data.characteristicsMet.length} of ${CHARACTERISTICS.length}`}/>
                {data.vettingNotes && <ReviewLine label="Notes" value={data.vettingNotes}/>}
              </ReviewSection>

              <SegmentedField
                label="Attestation"
                required
                options={[
                  { value: 'no', label: 'Not yet' },
                  { value: 'yes', label: 'I confirm vetted per HJC criteria' },
                ]}
                value={data.attestation ? 'yes' : 'no'}
                onChange={(v) => update('attestation', v === 'yes')}
                error={errors.attestation}
              />
            </>
          )}
        </div>
        <div className="bot-pad"/>
      </FormShell>
    </ResponsiveShell>
  );
}

const ReviewSection = ({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) => (
  <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: 14, marginBottom: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
      <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 500 }}>{title}</div>
      <button type="button" onClick={onEdit} style={{ background: 'transparent', border: 0, fontSize: 11, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
    </div>
    {children}
  </div>
);

const ReviewLine = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
    <span style={{ color: 'var(--ink-3)' }}>{label}</span>
    <span style={{ color: 'var(--ink)', fontWeight: 500, textAlign: 'right' }}>{value || '—'}</span>
  </div>
);
```

- [ ] **Step 3: Add PCM routes to `App.tsx`**

In `web/src/App.tsx`, add the imports:

```tsx
import { PCMListScreen } from './screens/forms/PCMListScreen';
import { PCMForm } from './screens/forms/PCMForm';
```

And add the routes alongside `/forms/bot` and `/forms/pcm-hunt-daily`:

```tsx
<Route path="/forms/pcm" element={<RequireAuth><PCMListScreen /></RequireAuth>} />
<Route path="/forms/pcm/new" element={<RequireAuth><PCMForm /></RequireAuth>} />
```

- [ ] **Step 4: Verify typecheck and build**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
npm run build
```

- [ ] **Step 5: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc

git restore --staged .
git add web/src/screens/forms/PCMListScreen.tsx web/src/screens/forms/PCMForm.tsx web/src/App.tsx
git diff --cached --stat
# Expected: ONLY PCMListScreen.tsx, PCMForm.tsx, App.tsx

git commit -m "$(cat <<'EOF'
feat(web): PCM list + 4-step intake wizard

PCMListScreen renders existing PCMs (seeded with 2 mock + any
synced) at /forms/pcm with stat strip and "Add new PCM" CTA.

PCMForm at /forms/pcm/new is a 4-step wizard (Identification /
Contact / Vetting / Review) with per-step inline validation,
debounced autosave to localStorage (restored on refresh, lands
on the last step you were on), and submit-on-attest. Submission
clears the draft and navigates back to the list.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Wire Forms hub navigation + add catch-all route

The Forms hub at `/forms` currently has static rows. Wire each row to navigate to its slug. Add the missing PCM Hunt Daily row. Special-case Weekly to navigate to `/weekly` (not `/forms/weekly`). Add a `/forms/:slug` catch-all that renders `<Placeholder>` for the other 33 forms.

**Files:**
- Modify: `web/src/screens/app/FormsScreen.tsx` — add row click handlers + add Hunt Daily row
- Modify: `web/src/App.tsx` — add `/forms/:slug` catch-all route

- [ ] **Step 1: Add slug to each row's data and wire onClick in `FormsScreen.tsx`**

`web/src/screens/app/FormsScreen.tsx` currently defines arrays of `FormRow` objects. Extend the type and arrays to include a `slug` field, and wire row clicks.

a. Update the `FormRow` type at the top of the file:

```tsx
type FormRow = { n: string; p: string; meta: string; due: string; dueClass: 'ok' | 'warn' | 'urgent'; slug: string };
```

b. Add a `slug` field to every entry in `PARTICIPATION`, `AWARENESS`, `VENUE`, and `DAILY` arrays. Use these values:

```tsx
const PARTICIPATION: FormRow[] = [
  { n: 'PCM (Primary Committee Members)', p: 'P1', meta: '9 of 10 confirmed · 2h ago', due: 'OK', dueClass: 'ok', slug: 'pcm' },
  { n: 'Fathers of the Land',             p: 'P2', meta: '3 of 4 verified · yesterday', due: 'DRAFT', dueClass: 'warn', slug: 'fathers' },
  { n: 'BOT (Board of Trustees)',         p: 'P3', meta: 'Last edit 5d ago · Director', due: 'SUN · 4D', dueClass: 'warn', slug: 'bot' },
  { n: 'CPC (Central Planning)',          p: 'P4', meta: '42 zones mapped · today', due: 'OK', dueClass: 'ok', slug: 'cpc' },
  { n: 'Worker Groups',                   p: 'P6', meta: 'Choir 28 enrolled · 5d ago', due: 'DRAFT', dueClass: 'warn', slug: 'workers' },
  { n: 'PCM Hunt Daily Activity',         p: 'P1', meta: 'Active today', due: 'TODAY', dueClass: 'ok', slug: 'pcm-hunt-daily' },
];

const AWARENESS: FormRow[] = [
  { n: 'Awareness Survey · Field',  p: 'A9',    meta: '500 posters printed · 4d ago', due: 'MON · 5D', dueClass: 'warn', slug: 'awareness-survey' },
  { n: 'PPPPPPPAVEDDD Town Name',   p: 'A·all', meta: 'Population baseline · 12d',    due: 'DONE',     dueClass: 'ok',   slug: 'town-name' },
  { n: 'Publicity & Video Campaign', p: 'D13',  meta: 'On track · today',             due: 'OK',       dueClass: 'ok',   slug: 'publicity' },
];

const VENUE: FormRow[] = [
  { n: 'Venue Inspection (Regular)', p: 'V10', meta: 'Permits secured · 3d ago', due: 'OK', dueClass: 'ok', slug: 'venue-inspection' },
  { n: 'Must-Do Checklist',          p: 'V10', meta: '82% complete · 2d ago',    due: 'OK', dueClass: 'ok', slug: 'must-do' },
];

const DAILY: FormRow[] = [
  { n: 'Weekly Assessment Rating', p: 'All',    meta: 'W8 awaiting submission',     due: 'FRI · 2D', dueClass: 'urgent', slug: 'weekly' },
  { n: 'Crusade Daily Expenses',   p: 'Budget', meta: '$43.8k of $84k · today',     due: 'DAILY',    dueClass: 'ok',     slug: 'daily-expenses' },
];
```

c. Update `FormGroup` to wire onClick. The component currently maps rows to `<div className="form-row">…</div>`. Convert each row to a clickable element by passing the navigator down:

Add `useNavigate` import at the top:

```tsx
import { useNavigate } from 'react-router-dom';
```

Replace the `FormGroup` definition:

```tsx
const FormGroup = ({ rows }: { rows: FormRow[] }) => {
  const navigate = useNavigate();
  const goto = (slug: string) => () => {
    if (slug === 'weekly') navigate('/weekly');
    else navigate(`/forms/${slug}`);
  };
  return (
    <div className="form-list forms-grid">
      {rows.map((r, i) => (
        <button
          type="button"
          className="form-row"
          key={i}
          onClick={goto(r.slug)}
          style={{ background: 'transparent', border: 0, padding: '16px 0', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}
        >
          <div>
            <div className="name">{r.n}</div>
            <div className="meta">
              <span className="pillar serif">{r.p}</span>
              <span className="d">·</span>
              <span>{r.meta}</span>
            </div>
          </div>
          <div className="right">
            <div className={'due ' + r.dueClass}>{r.due}</div>
            <div className="arr">›</div>
          </div>
        </button>
      ))}
    </div>
  );
};
```

The `<button>` wrapper preserves the grid-row visual (`.form-row` already styles a 2-column grid layout) while making the entire row clickable.

- [ ] **Step 2: Add `/forms/:slug` catch-all route to `App.tsx`**

In `web/src/App.tsx`, find the existing routes section. Add this route AFTER the specific `/forms/*` routes (so React Router matches the specific ones first):

```tsx
<Route path="/forms/:slug" element={<RequireAuth><Placeholder title="Form" /></RequireAuth>} />
```

The placement matters — it must come after `/forms/pcm`, `/forms/pcm/new`, `/forms/bot`, and `/forms/pcm-hunt-daily` in the JSX order.

- [ ] **Step 3: Verify typecheck and build**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npx tsc -p tsconfig.app.json --noEmit
npm run build
```

- [ ] **Step 4: Commit**

```bash
cd /Users/adebimpegodwin/Projects/hjc

git restore --staged .
git add web/src/screens/app/FormsScreen.tsx web/src/App.tsx
git diff --cached --stat
# Expected: ONLY FormsScreen.tsx and App.tsx

git commit -m "$(cat <<'EOF'
feat(web): wire Forms hub row navigation + /forms/:slug catch-all

Each row in the Forms hub now navigates to /forms/<slug>; the three
implemented forms (pcm, bot, pcm-hunt-daily) land on real screens.
The Weekly row special-cases to /weekly (existing screen). All other
rows hit a /forms/:slug catch-all that renders the "Coming soon"
Placeholder.

Adds a row for "PCM Hunt Daily Activity" under P · Participation.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Final manual sweep

No code changes. Confirm the three forms work end-to-end at three viewport widths. No commit unless an issue surfaces during the sweep.

- [ ] **Step 1: Verify build is clean**

```bash
cd /Users/adebimpegodwin/Projects/hjc/web
npm run build
# Expected: success
```

- [ ] **Step 2: Open `http://localhost:5173/forms` and click each row**

| Row | Expected destination |
|---|---|
| PCM (Primary Committee Members) | `/forms/pcm` — list with 2 seed PCMs + "Add new PCM" CTA |
| Fathers of the Land | `/forms/fathers` — Placeholder "Coming soon" |
| BOT (Board of Trustees) | `/forms/bot` — list with 3 seed trustees + "Add trustee" toggle |
| CPC (Central Planning) | `/forms/cpc` — Placeholder |
| Worker Groups | `/forms/workers` — Placeholder |
| PCM Hunt Daily Activity | `/forms/pcm-hunt-daily` — date strip + 2 seed entries for today + "Log activity" toggle |
| Awareness Survey · Field | `/forms/awareness-survey` — Placeholder |
| Weekly Assessment Rating | `/weekly` — existing weekly screen (NOT `/forms/weekly`) |
| (any other row) | Placeholder |

- [ ] **Step 3: BOT happy path**

1. `/forms/bot` → click "Add trustee".
2. Fill: Name "Test Pastor", Role "Member", Phone "+233 24 555 9999". Status defaults to "Pending".
3. Click "Save trustee". Form collapses; new row appears at the top of the list with status "pending" within ~1 second (after the simulated network round-trip).
4. Refresh the page. New trustee persists (read from `hjc_records_bot` localStorage).

- [ ] **Step 4: PCM Hunt Daily happy path**

1. `/forms/pcm-hunt-daily` → today is selected, 2 seed entries visible.
2. Click "Log activity".
3. Fill: Time defaults to now, Location "Test church", Contact name "Test pastor", Outcome "Met". Leave others blank.
4. Click "Add entry". New entry appears at top of today's list within ~1 second.
5. Click a prior day in the date strip. List shows "No entries logged for this day." Add button is hidden (only today is editable).
6. Click today again. Entries return.

- [ ] **Step 5: PCM wizard happy path**

1. `/forms/pcm` → click "Add new PCM" → `/forms/pcm/new` lands on Step 1 (Identification).
2. Try to click "Continue →" with empty fields. Required fields highlight with red border + "Required" message.
3. Fill all required Step 1 fields. Continue → Step 2.
4. Step 2: fill Phone and Zone. Continue → Step 3.
5. Step 3: select Background check, fill Reference 1 name + phone, check 3+ characteristics. Continue → Step 4.
6. Step 4: review page shows a summary of everything you entered, grouped by step with Edit links.
7. Toggle the attestation. "Submit PCM" becomes enabled. Click it. Lands back at `/forms/pcm` with the new PCM at the top of the list (within 1s).

- [ ] **Step 6: Draft autosave**

1. Start a fresh PCM at `/forms/pcm/new`. Type a few characters in "Full name". Wait 1 second.
2. Hard-refresh the browser (Cmd+R).
3. The wizard reopens with your typed value preserved on Step 1. The save status indicator should show "Saved".

- [ ] **Step 7: Three-viewport check**

In DevTools device toolbar, swap between iPhone 14 (393×852), iPad (820×1180), and laptop (1280×800). Each form should render correctly:
- Phone: single column, sticky action bar at bottom, no sidebar.
- Tablet: same as phone, more breathing room.
- Desktop: sidebar on the left, content centered with max-width 760px, action bar inline (still sticky to bottom of `.phone`).

- [ ] **Step 8: If anything breaks**

Open `/Users/adebimpegodwin/Projects/hjc/docs/superpowers/specs/2026-05-01-form-fill-trio-design.md` for the source-of-truth design. File a follow-up commit if a small fix is needed; raise a discussion before any larger change.

---

## Self-Review Notes

**Spec coverage:**
- FormShell architecture → Task 3
- Field components (9) → Task 2
- draftStorage / submitQueue / useDebouncedCallback → Task 1
- BOT roster spec → Task 4
- PCM Hunt Daily spec → Task 5
- PCM list + wizard spec → Task 6
- Forms hub row wiring + Hunt Daily row addition → Task 7
- `/forms/:slug` catch-all → Task 7
- All 4 routes (`/forms/bot`, `/forms/pcm-hunt-daily`, `/forms/pcm`, `/forms/pcm/new`) → Tasks 4, 5, 6
- Weekly row special-case → Task 7
- Manual sweep → Task 8

**Type consistency:** `PCMRecord` is exported from `PCMListScreen.tsx` and re-imported in `PCMForm.tsx`. `BOTRecord` and `HuntEntry` are local to their respective files (no cross-file consumers). `Submission` and `SaveStatus` are exported from their lib modules and consumed by FormShell and forms. All consistent.

**Known minor (acknowledged in spec):**
- PCM Photo and GPS buttons are placeholders that do nothing.
- Past days in PCM Hunt Daily are read-only.
- PCM detail/edit screen at `/forms/pcm/<id>` is out of scope.
- Real Laravel backend wiring is a separate phase.

**Spec deviation (justified):** The spec lists `seedData.ts` as a separate shared file. The plan inlines seed records in each form file. Rationale: each form's seeds are self-contained, no cross-form sharing, and inlining keeps each form file readable as a single unit. If a future phase wants to centralize seeds for testing fixtures, refactoring is trivial.

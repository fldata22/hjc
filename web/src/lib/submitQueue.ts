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

let isProcessing = false;

export async function processQueue(): Promise<void> {
  if (isProcessing) return;
  const queue = readQueue();
  if (queue.length === 0) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

  isProcessing = true;
  try {
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
  } finally {
    isProcessing = false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { void processQueue(); });
  // Resume any leftover items from prior session at app boot.
  void processQueue();
}

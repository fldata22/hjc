import { useMemo, useState } from 'react';
import {
  type Contact,
  useContacts,
  useCreateContact,
  useCrusade,
} from '../../api/hooks';

type ContactPickerProps = {
  label?: string;
  value: Contact | null;
  onChange: (contact: Contact | null) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
  /** Allow quick-adding a brand-new person from the picker. Default true. */
  allowCreate?: boolean;
};

const contactSub = (c: Contact): string => {
  const parts: string[] = [];
  if (c.title) parts.push(c.title);
  if (c.phone) parts.push(c.phone);
  return parts.join(' · ');
};

export function ContactPicker({
  label = 'Person',
  value,
  onChange,
  required,
  error,
  placeholder = 'Search people…',
  allowCreate = true,
}: ContactPickerProps) {
  const { data: crusade } = useCrusade();
  const createContact = useCreateContact();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const { data: contacts, isLoading } = useContacts({ q: query.trim() || undefined });

  const results = useMemo(() => (contacts ?? []).slice(0, 8), [contacts]);
  const trimmed = query.trim();
  const exactMatch = useMemo(
    () => (contacts ?? []).some((c) => c.full_name.toLowerCase() === trimmed.toLowerCase()),
    [contacts, trimmed],
  );
  const showQuickAdd = allowCreate && trimmed.length > 0 && !exactMatch && !!crusade;

  const pick = (c: Contact) => {
    onChange(c);
    setQuery('');
    setFocused(false);
  };

  const quickAdd = async () => {
    if (!crusade || createContact.isPending || trimmed === '') return;
    const c = await createContact.mutateAsync({ crusade_id: crusade.id, full_name: trimmed });
    pick(c);
  };

  // Selected state — show a chip with the chosen person and a clear button.
  if (value) {
    return (
      <div className={'field' + (error ? ' has-error' : '')}>
        <div className="lbl"><span>{label}{required && <span className="req"> *</span>}</span></div>
        <div className="contact-chip">
          <div className="cc-body">
            <div className="cc-name">{value.full_name}</div>
            {contactSub(value) && <div className="cc-sub">{contactSub(value)}</div>}
          </div>
          <button type="button" className="cc-clear" aria-label="Change person" onClick={() => onChange(null)}>
            Change
          </button>
        </div>
        {error && <div className="field-error">{error}</div>}
      </div>
    );
  }

  const open = focused || trimmed.length > 0;

  return (
    <div className={'field' + (error ? ' has-error' : '')}>
      <div className="lbl"><span>{label}{required && <span className="req"> *</span>}</span></div>
      <input
        type="search"
        className="input"
        value={query}
        placeholder={placeholder}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        autoComplete="off"
      />
      {open && (
        <div className="contact-menu">
          {isLoading ? (
            <div className="cm-empty">Searching…</div>
          ) : results.length === 0 && !showQuickAdd ? (
            <div className="cm-empty">{trimmed ? 'No people match.' : 'No people added yet.'}</div>
          ) : (
            <>
              {results.map((c) => (
                <button type="button" key={c.id} className="cm-item" onClick={() => pick(c)}>
                  <span className="cm-name">{c.full_name}</span>
                  {contactSub(c) && <span className="cm-sub">{contactSub(c)}</span>}
                </button>
              ))}
              {showQuickAdd && (
                <button type="button" className="cm-add" onClick={quickAdd} disabled={createContact.isPending}>
                  {createContact.isPending ? 'Adding…' : <>+ Add “{trimmed}” as new person</>}
                </button>
              )}
            </>
          )}
        </div>
      )}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { type Contact, useContacts, useCreateContact, useCrusade } from '@/api/hooks';
import { radius, sand, space } from '@/theme/tokens';

const sub = (c: Contact) => [c.title, c.phone].filter(Boolean).join(' · ');

export function ContactPicker({
  label = 'Person',
  value,
  onChange,
  required,
  error,
  placeholder = 'Search people…',
  allowCreate = true,
}: {
  label?: string;
  value: Contact | null;
  onChange: (c: Contact | null) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
  allowCreate?: boolean;
}) {
  const { data: crusade } = useCrusade();
  const createContact = useCreateContact();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const trimmed = query.trim();
  const { data: contacts, isLoading } = useContacts({ q: trimmed || undefined });
  const results = useMemo(() => (contacts ?? []).slice(0, 8), [contacts]);
  const exact = useMemo(
    () => (contacts ?? []).some((c) => c.full_name.toLowerCase() === trimmed.toLowerCase()),
    [contacts, trimmed],
  );
  const showQuickAdd = allowCreate && trimmed.length > 0 && !exact && !!crusade;

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

  const Lbl = (
    <Text style={styles.label}>
      {label.toUpperCase()}
      {required ? <Text style={{ color: sand.accent }}> *</Text> : null}
    </Text>
  );

  if (value) {
    return (
      <View style={styles.field}>
        {Lbl}
        <View style={styles.chip}>
          <View style={{ flex: 1 }}>
            <Text style={styles.chipName}>{value.full_name}</Text>
            {sub(value) ? <Text style={styles.chipSub}>{sub(value)}</Text> : null}
          </View>
          <Pressable onPress={() => onChange(null)} style={styles.changeBtn}>
            <Text style={styles.changeText}>Change</Text>
          </Pressable>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    );
  }

  const open = focused || trimmed.length > 0;

  return (
    <View style={styles.field}>
      {Lbl}
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        placeholderTextColor={sand.ink3}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {open ? (
        <View style={styles.menu}>
          {isLoading ? (
            <Text style={styles.menuEmpty}>Searching…</Text>
          ) : results.length === 0 && !showQuickAdd ? (
            <Text style={styles.menuEmpty}>{trimmed ? 'No people match.' : 'No people added yet.'}</Text>
          ) : (
            <>
              {results.map((c) => (
                <Pressable key={c.id} style={styles.item} onPress={() => pick(c)}>
                  <Text style={styles.itemName}>{c.full_name}</Text>
                  {sub(c) ? <Text style={styles.itemSub}>{sub(c)}</Text> : null}
                </Pressable>
              ))}
              {showQuickAdd ? (
                <Pressable style={styles.add} onPress={quickAdd} disabled={createContact.isPending}>
                  <Text style={styles.addText}>
                    {createContact.isPending ? 'Adding…' : `+ Add “${trimmed}” as new person`}
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { paddingVertical: space.md },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: sand.ink2, marginBottom: 7 },
  input: {
    backgroundColor: sand.chipBg,
    borderWidth: 1,
    borderColor: sand.line,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: sand.ink,
    fontWeight: '500',
  },
  error: { fontSize: 11, color: sand.risk, marginTop: 4, fontWeight: '600' },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 1,
    borderColor: sand.line,
    borderRadius: radius.md,
    padding: space.md,
    backgroundColor: sand.chipBg,
  },
  chipName: { fontSize: 15, fontWeight: '600', color: sand.ink },
  chipSub: { fontSize: 12, color: sand.ink3, marginTop: 1 },
  changeBtn: { borderWidth: 1, borderColor: sand.line2, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  changeText: { fontSize: 12, fontWeight: '600', color: sand.ink2 },

  menu: { marginTop: 6, borderWidth: 1, borderColor: sand.line2, borderRadius: radius.md, overflow: 'hidden' },
  menuEmpty: { padding: 12, fontSize: 13, color: sand.ink3 },
  item: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: sand.line },
  itemName: { fontSize: 14, color: sand.ink },
  itemSub: { fontSize: 12, color: sand.ink3 },
  add: { paddingHorizontal: 14, paddingVertical: 11, backgroundColor: sand.accentBg },
  addText: { fontSize: 13, fontWeight: '600', color: sand.accent },
});

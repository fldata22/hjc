import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type Contact, useContacts, useCreateContact, useCrusade } from '@/api/hooks';
import { extractApiMessage } from '@/lib/api';
import { cardSurface, radius, sand, space } from '@/theme/tokens';

type Draft = { full_name: string; title: string; phone: string; email: string };
const empty: Draft = { full_name: '', title: '', phone: '', email: '' };

export default function PeopleScreen() {
  const [search, setSearch] = useState('');
  const { data: contacts, isLoading } = useContacts({ q: search.trim() || undefined });
  const { data: crusade } = useCrusade();
  const createContact = useCreateContact();

  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty);
  const [error, setError] = useState<string | null>(null);

  const list = useMemo(() => contacts ?? [], [contacts]);
  const canSave = draft.full_name.trim() !== '' && !createContact.isPending;

  const sub = (c: Contact) => [c.title, c.phone].filter(Boolean).join(' · ') || '—';

  const close = () => {
    setShowAdd(false);
    setDraft(empty);
    setError(null);
  };

  const save = async () => {
    if (!canSave || !crusade) return;
    setError(null);
    try {
      await createContact.mutateAsync({
        crusade_id: crusade.id,
        full_name: draft.full_name.trim(),
        title: draft.title.trim() || null,
        phone: draft.phone.trim() || null,
        email: draft.email.trim() || null,
      });
      close();
    } catch (e) {
      setError(extractApiMessage(e));
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Text style={styles.title}>People</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.search}
            value={search}
            onChangeText={setSearch}
            placeholder="Search people…"
            placeholderTextColor={sand.ink3}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable style={styles.addBtn} onPress={() => setShowAdd(true)}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 24 }} />
        ) : list.length === 0 ? (
          <Text style={styles.empty}>
            {search ? `No people match “${search}”.` : 'No people yet. Tap + Add.'}
          </Text>
        ) : (
          <>
            <Text style={styles.count}>
              {list.length} {list.length === 1 ? 'PERSON' : 'PEOPLE'}
            </Text>
            <View style={styles.card}>
              {list.map((c, i) => (
                <View key={c.id} style={[styles.row, i > 0 && styles.divider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{c.full_name}</Text>
                    <Text style={styles.sub}>{sub(c)}</Text>
                  </View>
                  {c.phone ? <Text style={styles.phone}>{c.phone}</Text> : null}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={showAdd} animationType="slide" transparent onRequestClose={close}>
        <View style={styles.backdrop}>
          <Pressable style={{ flex: 1 }} onPress={close} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>New contact</Text>

              <Text style={styles.label}>FULL NAME</Text>
              <TextInput
                style={styles.input}
                value={draft.full_name}
                onChangeText={(v) => setDraft({ ...draft, full_name: v })}
                placeholder="e.g. Rev. Edmund Asare"
                placeholderTextColor={sand.ink3}
              />
              <Text style={styles.label}>TITLE / ROLE</Text>
              <TextInput
                style={styles.input}
                value={draft.title}
                onChangeText={(v) => setDraft({ ...draft, title: v })}
                placeholder="optional"
                placeholderTextColor={sand.ink3}
              />
              <Text style={styles.label}>PHONE</Text>
              <TextInput
                style={styles.input}
                value={draft.phone}
                onChangeText={(v) => setDraft({ ...draft, phone: v })}
                placeholder="+233 …"
                placeholderTextColor={sand.ink3}
                keyboardType="phone-pad"
              />
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                style={styles.input}
                value={draft.email}
                onChangeText={(v) => setDraft({ ...draft, email: v })}
                placeholder="optional"
                placeholderTextColor={sand.ink3}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <View style={styles.actions}>
                <Pressable style={[styles.btn, styles.btnGhost]} onPress={close}>
                  <Text style={styles.btnGhostText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, styles.btnPrimary, !canSave && styles.btnDisabled]}
                  onPress={save}
                  disabled={!canSave}
                >
                  <Text style={styles.btnPrimaryText}>
                    {createContact.isPending ? 'Saving…' : 'Add contact'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: sand.bg },
  head: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md },
  title: { fontSize: 28, fontWeight: '700', color: sand.ink, marginBottom: space.md },
  searchRow: { flexDirection: 'row', gap: space.sm },
  search: {
    flex: 1,
    backgroundColor: sand.surface,
    borderWidth: 1,
    borderColor: sand.line2,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: sand.ink,
  },
  addBtn: { backgroundColor: sand.ink, borderRadius: radius.md, paddingHorizontal: 16, justifyContent: 'center' },
  addBtnText: { color: sand.surface, fontWeight: '700', fontSize: 13 },
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl },
  count: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: sand.ink3, marginTop: space.lg, marginBottom: space.sm },
  card: { ...cardSurface, paddingHorizontal: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 14 },
  divider: { borderTopWidth: 1, borderTopColor: sand.line },
  name: { fontSize: 15, fontWeight: '600', color: sand.ink },
  sub: { fontSize: 12, color: sand.ink3, marginTop: 2 },
  phone: { fontSize: 11, color: sand.ink3, fontVariant: ['tabular-nums'] },
  empty: { fontSize: 13, color: sand.ink3, textAlign: 'center', marginTop: 40 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: sand.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: space.xl,
    paddingBottom: space.xxl,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: sand.line2, marginBottom: space.md },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: sand.ink, marginBottom: space.md },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: sand.ink3, marginTop: space.md, marginBottom: 4 },
  input: { borderBottomWidth: 1, borderBottomColor: sand.line2, paddingVertical: 8, fontSize: 15, color: sand.ink },
  error: { color: sand.risk, fontSize: 13, marginTop: space.md },
  actions: { flexDirection: 'row', gap: space.md, marginTop: space.xl },
  btn: { flex: 1, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center' },
  btnGhost: { borderWidth: 1.5, borderColor: sand.ink },
  btnGhostText: { color: sand.ink, fontWeight: '600', fontSize: 14 },
  btnPrimary: { backgroundColor: sand.ink },
  btnPrimaryText: { color: sand.surface, fontWeight: '600', fontSize: 14 },
  btnDisabled: { opacity: 0.4 },
});

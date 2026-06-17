import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type BudgetTransaction,
  useBudgetCategories,
  useBudgetSummary,
  useCreateExpenseTransaction,
  useCrusade,
  useExpenseTransactions,
} from '@/api/hooks';
import { Button, CurrencyField, DateField, SelectField, TextField, TextareaField } from '@/components/ui/fields';
import { Sheet, SheetActions } from '@/components/ui/Sheet';
import { cardSurface, radius, sand, space } from '@/theme/tokens';

const today = () => new Date().toISOString().slice(0, 10);

type Draft = {
  date: string;
  vendor: string;
  budgetCategoryId: number | '';
  amount: number | '';
  notes: string;
};
const empty = (date: string): Draft => ({ date, vendor: '', budgetCategoryId: '', amount: '', notes: '' });

function composeDescription(vendor: string, notes: string): string {
  const v = vendor.trim();
  const n = notes.trim();
  if (!n) return v;
  return `${v} — ${n}`;
}

export function DailyExpensesScreen() {
  const router = useRouter();
  const { data: crusade } = useCrusade();
  const { data: categories } = useBudgetCategories();
  const { data: summary } = useBudgetSummary();

  const [selectedDate] = useState<string>(today());
  const { data: dayPage, isLoading } = useExpenseTransactions(selectedDate, selectedDate);
  const createRec = useCreateExpenseTransaction();

  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty(today()));

  const list = useMemo(
    () => (dayPage?.data ?? []).slice().sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [dayPage],
  );
  const categoryById = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c] as const)), [categories]);
  const categoryOptions = useMemo(() => (categories ?? []).map((c) => ({ value: String(c.id), label: c.name })), [categories]);

  const daySpend = list.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalBudget = summary ? Number(summary.total_budget) : 0;
  const totalSpent = summary ? Number(summary.spent) : 0;
  const budgetRemaining = Math.max(0, totalBudget - totalSpent);

  const canSave =
    !!crusade &&
    draft.vendor.trim() !== '' &&
    typeof draft.amount === 'number' &&
    draft.amount > 0 &&
    !createRec.isPending;

  const close = () => {
    setShowForm(false);
    setDraft(empty(selectedDate));
  };

  const add = async () => {
    if (!canSave || !crusade) return;
    await createRec.mutateAsync({
      crusade_id: crusade.id,
      budget_category_id: typeof draft.budgetCategoryId === 'number' ? draft.budgetCategoryId : null,
      description: composeDescription(draft.vendor, draft.notes),
      occurred_on: draft.date,
      amount: typeof draft.amount === 'number' ? draft.amount : 0,
      receipt_photo: null,
    });
    close();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>‹ Back to forms</Text>
        </Pressable>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Daily Expenses</Text>
          <View style={styles.pillarBadge}><Text style={styles.pillarText}>Budget</Text></View>
        </View>

        <View style={styles.statStrip}>
          <Text style={styles.statNum}>₵{daySpend.toFixed(0)}</Text>
          <Text style={styles.statLabel}>spent today · ₵{budgetRemaining.toFixed(0)} of ₵{totalBudget.toFixed(0)} remaining</Text>
        </View>

        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator style={{ margin: space.lg }} />
          ) : list.length === 0 ? (
            <Text style={styles.empty}>No expenses logged today.</Text>
          ) : (
            list.map((e: BudgetTransaction, i) => {
              const cat = e.budget_category_id != null ? categoryById.get(e.budget_category_id) : null;
              return (
                <View key={e.id} style={[styles.row, i > 0 && styles.divider]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{e.description}</Text>
                    <Text style={styles.sub}>{cat?.name ?? 'Uncategorized'}</Text>
                  </View>
                  <Text style={styles.total}>₵{Number(e.amount).toFixed(2)}</Text>
                </View>
              );
            })
          )}
        </View>

        <Pressable style={styles.addToggle} onPress={() => setShowForm(true)}>
          <Text style={styles.addToggleText}>Add expense</Text>
        </Pressable>
      </ScrollView>

      <Sheet open={showForm} onClose={close} title="Add expense">
        <DateField label="Date" required value={draft.date} onChange={(v) => setDraft({ ...draft, date: v })} />
        <TextField label="Vendor" placeholder="e.g. Sahel Transport" value={draft.vendor} onChange={(v) => setDraft({ ...draft, vendor: v })} required />
        <SelectField
          label="Category"
          options={categoryOptions}
          value={draft.budgetCategoryId === '' ? '' : String(draft.budgetCategoryId)}
          onChange={(v) => setDraft({ ...draft, budgetCategoryId: v === '' ? '' : Number(v) })}
          placeholder="Uncategorized"
        />
        <CurrencyField label="Amount" value={draft.amount} onChange={(v) => setDraft({ ...draft, amount: v })} required />
        <TextareaField label="Notes" value={draft.notes} onChange={(v) => setDraft({ ...draft, notes: v })} />
        <SheetActions>
          <Button label="Cancel" variant="ghost" onPress={close} />
          <Button label={createRec.isPending ? 'Saving…' : 'Save expense'} onPress={add} disabled={!canSave} />
        </SheetActions>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: sand.bg },
  scroll: { padding: space.xl, paddingBottom: space.xxl },
  back: { fontSize: 14, color: sand.ink2, marginBottom: space.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '800', color: sand.ink },
  pillarBadge: { backgroundColor: sand.accentBg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillarText: { fontSize: 11, fontWeight: '800', color: sand.accent },
  statStrip: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, marginTop: space.lg, flexWrap: 'wrap' },
  statNum: { fontSize: 30, fontWeight: '800', color: sand.ink },
  statLabel: { fontSize: 13, color: sand.ink3 },
  card: { ...cardSurface, paddingHorizontal: space.lg, marginTop: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderTopColor: sand.line },
  name: { fontSize: 15, fontWeight: '600', color: sand.ink },
  sub: { fontSize: 12, color: sand.ink3, marginTop: 2 },
  total: { fontSize: 14, fontWeight: '700', color: sand.ink2, fontVariant: ['tabular-nums'] },
  empty: { fontSize: 13, color: sand.ink3, textAlign: 'center', paddingVertical: space.lg },
  addToggle: { marginTop: space.lg, borderWidth: 1.5, borderColor: sand.ink, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center' },
  addToggleText: { fontSize: 14, fontWeight: '600', color: sand.ink },
});

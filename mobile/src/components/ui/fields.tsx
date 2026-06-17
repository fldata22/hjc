import { type ReactNode, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { radius, sand, space } from '@/theme/tokens';

type Option = { value: string; label: string };

function Label({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={styles.label}>
      {label.toUpperCase()}
      {required ? <Text style={{ color: sand.accent }}> *</Text> : null}
    </Text>
  );
}

function Wrapper({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Label label={label} required={required} />
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function TextField({
  label,
  value,
  onChange,
  required,
  error,
  placeholder,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}) {
  return (
    <Wrapper label={label} required={required} error={error}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={sand.ink3}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </Wrapper>
  );
}

export function PhoneField(props: Omit<Parameters<typeof TextField>[0], 'keyboardType'>) {
  return <TextField {...props} keyboardType="phone-pad" placeholder={props.placeholder ?? '+233 …'} />;
}

export function NumberField({
  label,
  value,
  onChange,
  required,
  error,
  suffix,
  prefix,
  placeholder,
}: {
  label: string;
  value: number | '';
  onChange: (v: number | '') => void;
  required?: boolean;
  error?: string;
  suffix?: string;
  prefix?: string;
  placeholder?: string;
}) {
  return (
    <Wrapper label={label} required={required} error={error}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {prefix ? <Text style={{ color: sand.ink3, fontSize: 15 }}>{prefix}</Text> : null}
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={value === '' ? '' : String(value)}
          onChangeText={(t) => {
            const clean = t.replace(/[^0-9.]/g, '');
            onChange(clean === '' ? '' : Number(clean));
          }}
          keyboardType="number-pad"
          placeholder={placeholder}
          placeholderTextColor={sand.ink3}
        />
        {suffix ? <Text style={{ color: sand.ink3, fontSize: 12 }}>{suffix}</Text> : null}
      </View>
    </Wrapper>
  );
}

export function CurrencyField(props: Omit<Parameters<typeof NumberField>[0], 'prefix'> & { currency?: string }) {
  return <NumberField {...props} prefix={props.currency ?? '₵'} />;
}

export function TextareaField({ label, value, onChange, required, error, placeholder }: Parameters<typeof TextField>[0]) {
  return (
    <Wrapper label={label} required={required} error={error}>
      <TextInput
        style={[styles.input, styles.area]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={sand.ink3}
        multiline
      />
    </Wrapper>
  );
}

export function DateField({ label, value, onChange, required, error }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; error?: string }) {
  // Plain YYYY-MM-DD text entry for v1 (avoids a native datetime-picker dep).
  return (
    <Wrapper label={label} required={required} error={error}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={sand.ink3}
        autoCapitalize="none"
      />
    </Wrapper>
  );
}

export function SegmentedField({
  label,
  options,
  value,
  onChange,
  required,
  error,
}: {
  label: string;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
}) {
  return (
    <Wrapper label={label} required={required} error={error}>
      <View style={styles.segRow}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              style={[styles.seg, on && styles.segOn]}
              onPress={() => onChange(o.value)}
            >
              <Text style={[styles.segText, on && styles.segTextOn]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Wrapper>
  );
}

export function SelectField({
  label,
  options,
  value,
  onChange,
  required,
  error,
  placeholder = 'Select…',
}: {
  label: string;
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <Wrapper label={label} required={required} error={error}>
      <Pressable style={styles.select} onPress={() => setOpen(true)}>
        <Text style={[styles.selectText, !selected && { color: sand.ink3 }]}>
          {selected?.label ?? placeholder}
        </Text>
        <Text style={styles.selectChevron}>⌄</Text>
      </Pressable>
      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.optBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.optSheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {placeholder ? (
                <Pressable style={styles.optRow} onPress={() => { onChange(''); setOpen(false); }}>
                  <Text style={[styles.optText, { color: sand.ink3 }]}>{placeholder}</Text>
                </Pressable>
              ) : null}
              {options.map((o) => (
                <Pressable key={o.value} style={styles.optRow} onPress={() => { onChange(o.value); setOpen(false); }}>
                  <Text style={[styles.optText, o.value === value && { fontWeight: '700', color: sand.accent }]}>
                    {o.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </Wrapper>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.btn,
        variant === 'primary' && styles.btnPrimary,
        variant === 'ghost' && styles.btnGhost,
        variant === 'danger' && styles.btnDanger,
        disabled && styles.btnDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text
        style={[
          styles.btnText,
          variant === 'primary' && { color: sand.surface },
          variant === 'ghost' && { color: sand.ink },
          variant === 'danger' && { color: sand.risk },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { paddingVertical: space.md },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: sand.ink3, marginBottom: 6 },
  input: { borderBottomWidth: 1, borderBottomColor: sand.line2, paddingVertical: 8, fontSize: 15, color: sand.ink },
  area: { minHeight: 64, textAlignVertical: 'top' },
  error: { fontSize: 11, color: sand.risk, marginTop: 4 },

  segRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  seg: { borderWidth: 1, borderColor: sand.line2, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 6 },
  segOn: { backgroundColor: sand.ink, borderColor: sand.ink },
  segText: { fontSize: 13, fontWeight: '500', color: sand.ink2 },
  segTextOn: { color: sand.surface },

  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: sand.line2,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  selectText: { fontSize: 15, color: sand.ink },
  selectChevron: { fontSize: 16, color: sand.ink3 },
  optBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: space.xl },
  optSheet: { backgroundColor: sand.surface, borderRadius: radius.lg, maxHeight: '70%', paddingVertical: space.sm },
  optRow: { paddingHorizontal: space.xl, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: sand.line },
  optText: { fontSize: 15, color: sand.ink },

  btn: { flex: 1, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center' },
  btnPrimary: { backgroundColor: sand.ink },
  btnGhost: { borderWidth: 1.5, borderColor: sand.ink },
  btnDanger: { borderWidth: 1.5, borderColor: sand.risk },
  btnText: { fontSize: 14, fontWeight: '600' },
  btnDisabled: { opacity: 0.4 },
});

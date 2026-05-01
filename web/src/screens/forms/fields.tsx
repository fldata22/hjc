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

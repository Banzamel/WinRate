export function Select<T extends string | number>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: string) => void }) {
  return (
    <select value={String(value)} onChange={(e) => onChange(e.target.value)}>
      {options.map(([v, label]) => <option key={String(v)} value={String(v)}>{label}</option>)}
    </select>
  );
}

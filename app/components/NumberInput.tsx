import s from "./NumberInput.module.css";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  step?: number;
  min?: number;
  disabled?: boolean;
  error?: string;
}

export function NumberInput({ value, onChange, placeholder, step = 1, min = 0, disabled, error }: Props) {
  const decrement = () => onChange(String(Math.max(min, (Number(value) || 0) - step)));
  const increment = () => onChange(String((Number(value) || 0) + step));

  const borderColor = error ? "#ef4444" : disabled ? "#1e293b" : "#334155";

  return (
    <div className={disabled ? s.wrapperDisabled : s.wrapper} style={{ border: `1px solid ${borderColor}` }}>
      <button disabled={disabled} onClick={decrement} className={disabled ? s.btnDisabled : s.btn}>
        −
      </button>
      <input
        type="number"
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={disabled ? s.inputDisabled : s.input}
      />
      <button disabled={disabled} onClick={increment} className={disabled ? s.btnDisabled : s.btn}>
        +
      </button>
    </div>
  );
}

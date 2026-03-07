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
  const btnBg = disabled ? "#0f172a" : "#334155";

  return (
    <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: `1px solid ${borderColor}`, opacity: disabled ? 0.35 : 1 }}>
      <button disabled={disabled} onClick={decrement}
        style={{ width: 36, border: "none", background: btnBg, color: "#94a3b8", fontSize: 18, cursor: disabled ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        −
      </button>
      <input type="number" disabled={disabled} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        style={{ flex: 1, padding: "9px 8px", border: "none", background: disabled ? "#0a0f1a" : "#0f172a", color: disabled ? "#334155" : "#fff", fontSize: 14, textAlign: "center", outline: "none", cursor: disabled ? "default" : "text" }} />
      <button disabled={disabled} onClick={increment}
        style={{ width: 36, border: "none", background: btnBg, color: "#94a3b8", fontSize: 18, cursor: disabled ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        +
      </button>
    </div>
  );
}

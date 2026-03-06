"use client";

import React, { useState, useEffect } from "react";

// =====================
// КОНСТАНТЫ
// =====================
const DEFAULT_REACH = 100;
const STORAGE_KEY = "rice-features";

const IMPACT_SCALE = [
  { val: 0.25, label: "0.25 — Минимальное" },
  { val: 0.5, label: "0.5 — Низкое" },
  { val: 1, label: "1 — Среднее" },
  { val: 2, label: "2 — Высокое" },
  { val: 3, label: "3 — Огромное" },
];

const CONF_OPTIONS = [
  { val: 100, label: "100% — Точные данные" },
  { val: 80, label: "80% — Уверен" },
  { val: 50, label: "50% — Гипотеза" },
  { val: 30, label: "30% — Догадка" },
  { val: 10, label: "10% — Интуиция" },
];

interface Feature {
  id: number;
  name: string;
  desc: string;
  reach: number;
  impact: number;
  confidence: number;
  effort: number;
}

const DEMO_FEATURES: Feature[] = [
  { id: 1, name: "Онбординг новых пользователей", desc: "Пошаговый гайд для новичков", reach: 1000, impact: 3, confidence: 80, effort: 2 },
  { id: 2, name: "Тёмная тема", desc: "Переключение светлая/тёмная", reach: 500, impact: 0.5, confidence: 90, effort: 0.5 },
  { id: 3, name: "Интеграция с Slack", desc: "Уведомления и команды в Slack", reach: 300, impact: 2, confidence: 50, effort: 5 },
];

const EMPTY_FORM = { name: "", desc: "", reach: "", impact: "1", confidence: "80", effort: "" };

// =====================
// СТИЛИ
// =====================
const st = {
  input: { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #334155", background: "#0f172a", color: "#fff", fontSize: 14, boxSizing: "border-box" as const },
  select: { width: "100%", padding: "9px 32px 9px 12px", borderRadius: 8, border: "1px solid #334155", background: "#0f172a", color: "#fff", fontSize: 14, boxSizing: "border-box" as const, appearance: "none" as const, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" },
  label: { fontSize: 12, color: "#64748b", display: "block" as const, marginBottom: 4 },
  err: { fontSize: 11, color: "#ef4444", marginTop: 3 },
  editInput: { width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #6366f1", background: "#0f172a", color: "#fff", fontSize: 14, boxSizing: "border-box" as const, outline: "none" },
  editSelect: { width: "100%", padding: "6px 28px 6px 10px", borderRadius: 6, border: "1px solid #6366f1", background: "#0f172a", color: "#fff", fontSize: 13, boxSizing: "border-box" as const, appearance: "none" as const, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", outline: "none" },
  editInputDisabled: { width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #1e293b", background: "#0a0f1a", color: "#334155", fontSize: 14, boxSizing: "border-box" as const, outline: "none" },
};

// =====================
// УТИЛИТЫ
// =====================
const calcRice = (f: Feature) => f.effort > 0 ? Math.round((f.reach * f.impact * (f.confidence / 100)) / f.effort) : 0;
const calcIce = (f: Feature) => f.effort > 0 ? Math.round((f.impact * (f.confidence / 100) * (10 / f.effort)) * 100) / 100 : 0;
const getScore = (f: Feature, mode: string) => mode === "RICE" ? calcRice(f) : calcIce(f);

const getBarColor = (score: number, maxScore: number) => {
  const p = maxScore > 0 ? score / maxScore : 0;
  return p > 0.66 ? "#22c55e" : p > 0.33 ? "#eab308" : "#ef4444";
};

const validateFeature = (data: Record<string, string>, mode: string) => {
  const e: Record<string, string> = {};
  if (!data.name || !data.name.trim()) e.name = "Введи название фичи";
  if (mode === "RICE" && (!data.reach || Number(data.reach) <= 0)) e.reach = "Укажи число больше 0";
  if (!data.effort || Number(data.effort) <= 0) e.effort = "Укажи число больше 0";
  return { valid: Object.keys(e).length === 0, errors: e };
};

const buildCsv = (features: Feature[]) => {
  const header = ["#", "Название", "Описание", "Охват", "Влияние", "Уверенность %", "Трудозатраты (мес)", "RICE", "ICE"];
  const rows = features.map((f, i) => [
    i + 1, `"${f.name.replace(/"/g, '""')}"`, `"${(f.desc || "").replace(/"/g, '""')}"`,
    f.reach, f.impact, f.confidence, f.effort, calcRice(f), calcIce(f),
  ]);
  return "\uFEFF" + [header.join(","), ...rows.map(r => r.join(","))].join("\n");
};

// =====================
// КОМПОНЕНТЫ
// =====================
const NumberInput = ({ value, onChange, placeholder, step = 1, min = 0, disabled, error }: {
  value: string; onChange: (v: string) => void; placeholder: string;
  step?: number; min?: number; disabled?: boolean; error?: string;
}) => (
  <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: `1px solid ${error ? "#ef4444" : disabled ? "#1e293b" : "#334155"}`, opacity: disabled ? 0.35 : 1 }}>
    <button disabled={disabled} onClick={() => { const n = Math.max(min, (Number(value) || 0) - step); onChange(String(n)); }}
      style={{ width: 36, border: "none", background: disabled ? "#0f172a" : "#334155", color: "#94a3b8", fontSize: 18, cursor: disabled ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
    <input type="number" disabled={disabled} placeholder={placeholder} value={value}
      onChange={e => onChange(e.target.value)}
      style={{ flex: 1, padding: "9px 8px", border: "none", background: disabled ? "#0a0f1a" : "#0f172a", color: disabled ? "#334155" : "#fff", fontSize: 14, textAlign: "center", outline: "none", cursor: disabled ? "default" : "text" }} />
    <button disabled={disabled} onClick={() => { const n = (Number(value) || 0) + step; onChange(String(n)); }}
      style={{ width: 36, border: "none", background: disabled ? "#0f172a" : "#334155", color: "#94a3b8", fontSize: 18, cursor: disabled ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
  </div>
);

const PencilIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>
  </svg>
);

const FeatureCard = ({ feature, index, score, maxScore, isEditing, isIce, editForm, setEditForm, onStartEdit, onSaveEdit, onCancelEdit, onRemove }: {
  feature: Feature; index: number; score: number; maxScore: number;
  isEditing: boolean; isIce: boolean; editForm: Record<string, string>;
  setEditForm: (f: Record<string, string>) => void;
  onStartEdit: () => void; onSaveEdit: () => void; onCancelEdit: () => void; onRemove: () => void;
}) => {
  const barW = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const color = getBarColor(score, maxScore);

  if (isEditing) {
    return (
      <div style={{ background: "#1e293b", borderRadius: 10, padding: 14, marginBottom: 10, border: "1px solid #6366f1" }}>
        <input value={editForm.name} autoFocus onChange={e => setEditForm({ ...editForm, name: e.target.value })}
          style={{ ...st.editInput, fontSize: 15, fontWeight: 600, marginBottom: 6 }} placeholder="Название фичи" />
        <input value={editForm.desc} onChange={e => setEditForm({ ...editForm, desc: e.target.value })}
          style={{ ...st.editInput, fontSize: 12, marginBottom: 10, borderColor: "#334155" }} placeholder="Какую проблему решает?" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: isIce ? "#334155" : "#64748b" }}>📊 Охват</label>
            <input type="number" value={editForm.reach} disabled={isIce}
              onChange={e => setEditForm({ ...editForm, reach: e.target.value })}
              style={isIce ? st.editInputDisabled : st.editInput} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#64748b" }}>💥 Влияние</label>
            <select value={editForm.impact} onChange={e => setEditForm({ ...editForm, impact: e.target.value })} style={st.editSelect}>
              {IMPACT_SCALE.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#64748b" }}>🎯 Уверенность</label>
            <select value={editForm.confidence} onChange={e => setEditForm({ ...editForm, confidence: e.target.value })} style={st.editSelect}>
              {CONF_OPTIONS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#64748b" }}>⚡ Трудозатраты</label>
            <input type="number" value={editForm.effort} step="0.25"
              onChange={e => setEditForm({ ...editForm, effort: e.target.value })} style={st.editInput} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onSaveEdit} style={{ flex: 1, padding: "7px", borderRadius: 7, border: "none", background: "#6366f1", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Сохранить</button>
          <button onClick={onCancelEdit} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid #334155", background: "transparent", color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>Отмена</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#1e293b", borderRadius: 10, padding: 14, marginBottom: 10, border: "1px solid transparent" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ background: color, color: "#000", fontWeight: 700, fontSize: 12, padding: "2px 7px", borderRadius: 5 }}>#{index + 1}</span>
          <span onClick={onStartEdit} className="feature-name"
            style={{ fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: "#e2e8f0", transition: "color 0.15s" }}>
            {feature.name}
            <span className="pencil-icon" style={{ color: "#475569", transition: "color 0.15s", display: "flex" }}><PencilIcon /></span>
          </span>
        </div>
        <button onClick={onRemove} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>✕</button>
      </div>
      {feature.desc && <p style={{ margin: "0 0 6px", fontSize: 12, color: "#64748b", fontStyle: "italic" }}>{feature.desc}</p>}
      <div className="feature-metrics" style={{ display: "flex", gap: 14, fontSize: 11, color: "#64748b", marginBottom: 6 }}>
        <span style={{ opacity: isIce ? 0.35 : 1 }}>📊 Охват: {feature.reach}</span>
        <span>💥 Влияние: {feature.impact}</span>
        <span>🎯 Уверенность: {feature.confidence}%</span>
        <span>⚡ Трудозатраты: {feature.effort} мес</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, height: 7, background: "#0f172a", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${barW}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.3s" }} />
        </div>
        <span style={{ fontWeight: 700, fontSize: 15, color, minWidth: 55, textAlign: "right" }}>{score}</span>
      </div>
    </div>
  );
};

// =====================
// ОСНОВНОЙ КОМПОНЕНТ
// =====================
export default function Home() {
  const [mode, setMode] = useState("RICE");
  const [features, setFeatures] = useState<Feature[]>([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [loaded, setLoaded] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [justAdded, setJustAdded] = useState(false);

  const isIce = mode === "ICE";

  // Загрузка из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) { setFeatures(JSON.parse(saved)); }
      else { setFeatures(DEMO_FEATURES); }
    } catch { setFeatures(DEMO_FEATURES); }
    setLoaded(true);
  }, []);

  // Сохранение в localStorage
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(features));
  }, [features, loaded]);

  const addFeature = () => {
    const { valid, errors: e } = validateFeature(form, mode);
    setErrors(e);
    if (!valid) return;
    setFeatures([...features, {
      id: Date.now(), name: form.name.trim(), desc: form.desc.trim(),
      reach: Number(form.reach) || DEFAULT_REACH, impact: Number(form.impact),
      confidence: Number(form.confidence), effort: Number(form.effort),
    }]);
    setForm({ ...EMPTY_FORM });
    setErrors({});
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const removeFeature = (id: number) => {
    setFeatures(features.filter(f => f.id !== id));
    if (editId === id) setEditId(null);
  };

  const startEdit = (f: Feature) => {
    setEditId(f.id);
    setEditForm({ name: f.name, desc: f.desc || "", reach: String(f.reach), impact: String(f.impact), confidence: String(f.confidence), effort: String(f.effort) });
  };

  const saveEdit = () => {
    const { valid } = validateFeature(editForm, mode);
    if (!valid) return;
    setFeatures(features.map(f => f.id === editId ? {
      ...f, name: editForm.name.trim(), desc: editForm.desc.trim(),
      reach: Number(editForm.reach) || f.reach, impact: Number(editForm.impact),
      confidence: Number(editForm.confidence), effort: Number(editForm.effort),
    } : f));
    setEditId(null);
  };

  const exportCsv = () => {
    if (sorted.length === 0) return;
    const csv = buildCsv(sorted);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backlog-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sorted = [...features].sort((a, b) => getScore(b, mode) - getScore(a, mode));
  const maxScore = sorted.length ? getScore(sorted[0], mode) : 1;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 860, margin: "0 auto", padding: 20, background: "#0f172a", minHeight: "100vh", color: "#e2e8f0" }}>
      
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: 0 }}>🎯 Приоритизатор фич</h1>
        <p style={{ color: "#94a3b8", marginTop: 6, fontSize: 13 }}>Оцени фичи — получи приоритет для команды</p>
        <div style={{ display: "inline-flex", background: "#1e293b", borderRadius: 10, padding: 3, marginTop: 12 }}>
          {["RICE", "ICE"].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: "6px 20px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: mode === m ? "#6366f1" : "transparent", color: mode === m ? "#fff" : "#64748b",
            }}>{m}</button>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>
          {isIce ? "ICE = Влияние × Уверенность% × (10 ÷ Трудозатраты)" : "RICE = (Охват × Влияние × Уверенность%) ÷ Трудозатраты"}
        </p>
      </div>

      <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, color: "#94a3b8" }}>➕ Новая фича</h3>
        
        <div style={{ marginBottom: 10 }}>
          <label style={st.label}>Название *</label>
          <input placeholder="Например: Онбординг новых пользователей" value={form.name}
            onChange={e => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: null }); }}
            style={{ ...st.input, borderColor: errors.name ? "#ef4444" : "#334155" }} />
          {errors.name && <div style={st.err}>{errors.name}</div>}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={st.label}>Какую проблему решает? (необязательно)</label>
          <input placeholder="Например: пользователи уходят на втором шаге" value={form.desc}
            onChange={e => setForm({ ...form, desc: e.target.value })} style={st.input} />
        </div>

        <div className="form-fields-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ ...st.label, opacity: isIce ? 0.35 : 1 }}>📊 Охват (пользователей/мес) {!isIce && "*"}</label>
            <NumberInput value={form.reach} placeholder="1000" step={100} min={0}
              disabled={isIce} error={errors.reach ?? undefined}
              onChange={v => { setForm({ ...form, reach: v }); setErrors({ ...errors, reach: null }); }} />
            {errors.reach && <div style={st.err}>{errors.reach}</div>}
          </div>
          <div>
            <label style={st.label}>💥 Влияние</label>
            <select value={form.impact} onChange={e => setForm({ ...form, impact: e.target.value })} style={st.select}>
              {IMPACT_SCALE.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={st.label}>🎯 Уверенность</label>
            <select value={form.confidence} onChange={e => setForm({ ...form, confidence: e.target.value })} style={st.select}>
              {CONF_OPTIONS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={st.label}>⚡ Трудозатраты (чел-мес) *</label>
            <NumberInput value={form.effort} placeholder="2" step={0.5} min={0.25}
              error={errors.effort ?? undefined}
              onChange={v => { setForm({ ...form, effort: v }); setErrors({ ...errors, effort: null }); }} />
            {errors.effort && <div style={st.err}>{errors.effort}</div>}
          </div>
        </div>

        <button onClick={addFeature} className="add-btn" style={{
          marginTop: 14, width: "100%", padding: "10px", borderRadius: 8, border: "none",
          background: justAdded ? "#22c55e" : "#6366f1", color: "#fff", fontSize: 14, fontWeight: 600,
          cursor: "pointer", transition: "all 0.2s"
        }}>{justAdded ? "✓ Добавлено!" : "Добавить в бэклог"}</button>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 15, color: "#94a3b8" }}>📋 Бэклог ({sorted.length})</h3>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {sorted.length > 0 && (
              <button onClick={exportCsv} className="csv-btn" style={{
                padding: "5px 12px", borderRadius: 7, border: "1px solid #334155",
                background: "transparent", color: "#94a3b8", fontSize: 12, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4, transition: "all 0.2s"
              }}>📥 Скачать CSV</button>
            )}
            <span style={{ fontSize: 12, color: "#475569" }}>по {mode}-скору ↓</span>
          </div>
        </div>

        {!loaded && <p style={{ color: "#475569", textAlign: "center", padding: 40 }}>Загрузка...</p>}
        {loaded && sorted.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#475569" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
            <p style={{ margin: 0, fontSize: 15 }}>Бэклог пуст</p>
            <p style={{ margin: "6px 0 0", fontSize: 13 }}>Добавь первую фичу — заполни форму выше</p>
          </div>
        )}

        {sorted.map((f, i) => (
          <FeatureCard key={f.id} feature={f} index={i}
            score={getScore(f, mode)} maxScore={maxScore}
            isEditing={editId === f.id} isIce={isIce}
            editForm={editForm} setEditForm={setEditForm}
            onStartEdit={() => startEdit(f)} onSaveEdit={saveEdit}
            onCancelEdit={() => setEditId(null)} onRemove={() => removeFeature(f.id)} />
        ))}
      </div>

      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; cursor: text; }
        input:focus::placeholder { color: transparent; }
        .add-btn:hover { filter: brightness(1.15); }
        .csv-btn:hover { border-color: #6366f1 !important; color: #fff !important; }
        .feature-name:hover { color: #818cf8 !important; }
        .feature-name:hover .pencil-icon { color: #818cf8 !important; }
        @media (max-width: 639px) {
          .form-fields-grid { grid-template-columns: 1fr !important; }
          .feature-metrics { display: grid !important; grid-template-columns: 1fr 1fr; gap: 4px 10px; }
        }
      `}</style>
    </div>
  );
}
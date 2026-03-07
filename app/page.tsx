"use client";

import { useState } from "react";
import { useFeatures } from "./hooks/useFeatures";
import { FeatureCard } from "./components/FeatureCard";
import { NumberInput } from "./components/NumberInput";
import { Tooltip } from "./components/Tooltip";
import { STATUSES } from "./lib/types";
import type { Status, ScoringMode, FormState, FormErrors, Feature } from "./lib/types";
import { IMPACT_SCALE, CONF_OPTIONS, STATUS_CYCLE, EMPTY_FORM, DEFAULT_REACH } from "./lib/constants";
import { getScore, getBarColor, validateFeature, buildCsv } from "./lib/utils";

// ─── Стили ─────────────────────────────────────────────────────────────────
const inputStyle = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #334155", background: "#0f172a", color: "#fff", fontSize: 14, boxSizing: "border-box" as const };
const selectStyle = { ...inputStyle, padding: "9px 32px 9px 12px", appearance: "none" as const, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" };
const labelStyle = { fontSize: 12, color: "#64748b", display: "block" as const, marginBottom: 4 };
const errorStyle = { fontSize: 11, color: "#ef4444", marginTop: 3 };

// ─── Компонент ──────────────────────────────────────────────────────────────
export default function Home() {
  const { features, loaded, addFeature, removeFeature, updateFeature, updateStatus, clearAll } = useFeatures();

  const [mode, setMode] = useState<ScoringMode>("RICE");
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<FormErrors>({});
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormState>({ ...EMPTY_FORM });
  const [justAdded, setJustAdded] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [filterStatus, setFilterStatus] = useState<Status | "all">("all");

  const isIce = mode === "ICE";

  const handleAddFeature = () => {
    const { valid, errors: e } = validateFeature(form, mode);
    setErrors(e);
    if (!valid) return;
    addFeature({
      name: form.name.trim(),
      desc: form.desc.trim(),
      reach: Number(form.reach) || DEFAULT_REACH,
      impact: Number(form.impact),
      confidence: Number(form.confidence),
      effort: Number(form.effort),
    });
    setForm({ ...EMPTY_FORM });
    setErrors({});
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const startEdit = (f: Feature) => {
    setEditId(f.id);
    setEditForm({ name: f.name, desc: f.desc || "", reach: String(f.reach), impact: String(f.impact), confidence: String(f.confidence), effort: String(f.effort) });
  };

  const saveEdit = () => {
    const { valid } = validateFeature(editForm, mode);
    if (!valid || editId === null) return;
    updateFeature(editId, {
      name: editForm.name.trim(),
      desc: editForm.desc.trim(),
      reach: Number(editForm.reach),
      impact: Number(editForm.impact),
      confidence: Number(editForm.confidence),
      effort: Number(editForm.effort),
    });
    setEditId(null);
  };

  const handleClear = () => {
    if (confirmClear) {
      clearAll();
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  const sorted = [...features].sort((a, b) => getScore(b, mode) - getScore(a, mode));
  const maxScore = sorted.length ? getScore(sorted[0], mode) : 1;
  const filtered = filterStatus === "all" ? sorted : sorted.filter(f => f.status === filterStatus);

  const handleExportCsv = () => {
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

  // Preview score while filling form
  const previewScore = (() => {
    if (!form.effort || Number(form.effort) <= 0) return null;
    const mock: Feature = { id: 0, name: "", desc: "", status: "new", reach: Number(form.reach) || DEFAULT_REACH, impact: Number(form.impact), confidence: Number(form.confidence), effort: Number(form.effort) };
    return getScore(mock, mode);
  })();
  const previewRank = previewScore !== null ? sorted.filter(f => getScore(f, mode) > previewScore).length + 1 : null;
  const previewColor = previewScore !== null ? getBarColor(previewScore, Math.max(maxScore, previewScore)) : "#64748b";

  return (
    <div className="main-container" style={{ fontFamily: "system-ui, sans-serif", maxWidth: 860, margin: "0 auto", padding: 20, background: "#0f172a", minHeight: "100vh", color: "#e2e8f0" }}>

      {/* ─── Шапка ─── */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h1 className="main-title" style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: 0 }}>🎯 Приоритизатор фич</h1>
        <p style={{ color: "#94a3b8", marginTop: 6, fontSize: 13 }}>Оцени фичи — получи приоритет для команды</p>
        <div style={{ display: "inline-flex", background: "#1e293b", borderRadius: 10, padding: 3, marginTop: 12 }}>
          {(["RICE", "ICE"] as ScoringMode[]).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ padding: "6px 20px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: mode === m ? "#6366f1" : "transparent", color: mode === m ? "#fff" : "#64748b" }}>
              {m}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "#475569", marginTop: 6 }}>
          {isIce ? "ICE = Влияние × Уверенность% × (10 ÷ Трудозатраты)" : "RICE = (Охват × Влияние × Уверенность%) ÷ Трудозатраты"}
        </p>
      </div>

      {/* ─── Форма ─── */}
      <div style={{ background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, color: "#94a3b8" }}>➕ Новая фича</h3>

        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Название *</label>
          <input placeholder="Например: Онбординг новых пользователей" value={form.name}
            onChange={e => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: undefined }); }}
            style={{ ...inputStyle, borderColor: errors.name ? "#ef4444" : "#334155" }} />
          {errors.name && <div style={errorStyle}>{errors.name}</div>}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Какую проблему решает? (необязательно)</label>
          <input placeholder="Например: пользователи уходят на втором шаге" value={form.desc}
            onChange={e => setForm({ ...form, desc: e.target.value })} style={inputStyle} />
        </div>

        <div className="form-fields-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ ...labelStyle, opacity: isIce ? 0.35 : 1 }}>
              📊 Охват (пользователей/мес) {!isIce && "*"}
              <Tooltip text="Сколько пользователей столкнётся с этой фичей в месяц. Чем больше охват — тем выше скор." />
            </label>
            <NumberInput value={form.reach} placeholder="1000" step={100} min={0} disabled={isIce} error={errors.reach}
              onChange={v => { setForm({ ...form, reach: v }); setErrors({ ...errors, reach: undefined }); }} />
            {errors.reach && <div style={errorStyle}>{errors.reach}</div>}
          </div>
          <div>
            <label style={labelStyle}>
              💥 Влияние
              <Tooltip text="Насколько сильно фича изменит поведение или опыт пользователя. 3 — трансформирует продукт, 0.25 — едва заметно." />
            </label>
            <select value={form.impact} onChange={e => setForm({ ...form, impact: e.target.value })} style={selectStyle}>
              {IMPACT_SCALE.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>
              🎯 Уверенность
              <Tooltip text="Насколько ты уверен в оценках охвата и влияния. 100% — есть данные, 10% — чистая интуиция." />
            </label>
            <select value={form.confidence} onChange={e => setForm({ ...form, confidence: e.target.value })} style={selectStyle}>
              {CONF_OPTIONS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>
              ⚡ Трудозатраты (чел-мес) *
              <Tooltip text="Сколько человеко-месяцев займёт реализация. 0.5 — пара недель одного разработчика, 3 — квартал команды." />
            </label>
            <NumberInput value={form.effort} placeholder="2" step={0.5} min={0.25} error={errors.effort}
              onChange={v => { setForm({ ...form, effort: v }); setErrors({ ...errors, effort: undefined }); }} />
            {errors.effort && <div style={errorStyle}>{errors.effort}</div>}
          </div>
        </div>

        {previewScore !== null && (
          <div className="preview-block" style={{ marginTop: 12, padding: "12px 16px", borderRadius: 10, background: "#0f172a", border: `1px solid ${previewColor}40`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>Прогноз {mode}-скора</div>
              <div style={{ fontSize: 12, color: "#475569" }}>
                {previewRank === 1 && sorted.length > 0 ? "🥇 Войдёт на 1-е место"
                  : previewRank !== null && sorted.length > 0 ? `📍 Место в бэклоге: #${previewRank} из ${sorted.length + 1}`
                  : "📍 Первая фича в бэклоге"}
              </div>
            </div>
            <span style={{ fontSize: 26, fontWeight: 800, color: previewColor, lineHeight: 1 }}>{previewScore}</span>
          </div>
        )}

        <button onClick={handleAddFeature} className="add-btn" style={{ marginTop: 14, width: "100%", padding: "10px", borderRadius: 8, border: "none", background: justAdded ? "#22c55e" : "#6366f1", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
          {justAdded ? "✓ Добавлено!" : "Добавить в бэклог"}
        </button>
      </div>

      {/* ─── Бэклог ─── */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 15, color: "#94a3b8" }}>📋 Бэклог ({sorted.length})</h3>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {sorted.length > 0 && (
              <button onClick={handleExportCsv} className="csv-btn" style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #334155", background: "transparent", color: "#94a3b8", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, transition: "all 0.2s" }}>
                📥 Скачать CSV
              </button>
            )}
            {sorted.length > 0 && (
              <button onClick={handleClear} className="clear-btn" style={{ padding: "5px 12px", borderRadius: 7, fontSize: 12, cursor: "pointer", border: `1px solid ${confirmClear ? "#ef4444" : "#334155"}`, background: confirmClear ? "#ef444415" : "transparent", color: confirmClear ? "#ef4444" : "#475569", transition: "all 0.2s" }}>
                {confirmClear ? "Точно удалить?" : "🗑 Очистить"}
              </button>
            )}
            <span style={{ fontSize: 12, color: "#475569" }}>по {mode}-скору ↓</span>
          </div>
        </div>

        {/* Фильтр по статусам */}
        {sorted.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {(["all", ...STATUS_CYCLE] as const).map(s => {
              const count = s === "all" ? features.length : features.filter(f => f.status === s).length;
              const active = filterStatus === s;
              const sc = s === "all" ? null : STATUSES[s];
              return (
                <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer", border: "1px solid", borderColor: active ? (sc?.color ?? "#6366f1") : "#334155", background: active ? (sc ? sc.bg : "#6366f118") : "transparent", color: active ? (sc?.color ?? "#a5b4fc") : "#475569", fontWeight: active ? 600 : 400, transition: "all 0.15s" }}>
                  {s === "all" ? "Все" : STATUSES[s].label}{count > 0 && <span style={{ opacity: 0.7 }}> ({count})</span>}
                </button>
              );
            })}
          </div>
        )}

        {!loaded && <p style={{ color: "#475569", textAlign: "center", padding: 40 }}>Загрузка...</p>}
        {loaded && sorted.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#475569" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
            <p style={{ margin: 0, fontSize: 15 }}>Бэклог пуст</p>
            <p style={{ margin: "6px 0 0", fontSize: 13 }}>Добавь первую фичу — заполни форму выше</p>
          </div>
        )}

        {filtered.map((f, i) => (
          <FeatureCard key={f.id} feature={f} index={i}
            score={getScore(f, mode)} maxScore={maxScore}
            barColor={getBarColor(getScore(f, mode), maxScore)}
            isEditing={editId === f.id} isIce={isIce} mode={mode}
            editForm={editForm} setEditForm={setEditForm}
            onStartEdit={() => startEdit(f)} onSaveEdit={saveEdit}
            onCancelEdit={() => setEditId(null)} onRemove={() => removeFeature(f.id)}
            onStatusChange={s => updateStatus(f.id, s)} />
        ))}
      </div>

      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; cursor: text; }
        input:focus::placeholder { color: transparent; }
        .add-btn:hover { filter: brightness(1.15); }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .preview-block { animation: fadeSlideIn 0.2s ease; }
        .csv-btn:hover { border-color: #6366f1 !important; color: #fff !important; }
        .feature-name:hover { color: #818cf8 !important; }
        .feature-name:hover .pencil-icon { color: #818cf8 !important; }
        .status-badge:hover { filter: brightness(1.2); }
        @media (max-width: 639px) {
          .main-container { max-width: 100% !important; padding: 16px !important; box-sizing: border-box; overflow-x: hidden; }
          .main-title { font-size: 22px !important; }
          .form-fields-grid { grid-template-columns: 1fr !important; }
          .feature-metrics { display: grid !important; grid-template-columns: 1fr 1fr; gap: 4px 10px; }
        }
      `}</style>
    </div>
  );
}

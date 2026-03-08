"use client";

import { useState } from "react";
import { useFeatures } from "../../hooks/useFeatures";
import { FeatureCard } from "../../components/FeatureCard";
import { NumberInput } from "../../components/NumberInput";
import { Tooltip } from "../../components/Tooltip";
import { STATUSES } from "../../lib/types";
import type { Status, ScoringMode, FormState, FormErrors, Feature } from "../../lib/types";
import { IMPACT_SCALE, CONF_OPTIONS, STATUS_CYCLE, EMPTY_FORM, DEFAULT_REACH } from "../../lib/constants";
import { getScore, getBarColor, validateFeature, buildCsv } from "../../lib/utils";
import s from "./page.module.css";

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

  // Прогноз скора при заполнении формы
  const previewScore = (() => {
    if (!form.effort || Number(form.effort) <= 0) return null;
    const mock: Feature = { id: 0, name: "", desc: "", status: "new", reach: Number(form.reach) || DEFAULT_REACH, impact: Number(form.impact), confidence: Number(form.confidence), effort: Number(form.effort) };
    return getScore(mock, mode);
  })();
  const previewRank = previewScore !== null ? sorted.filter(f => getScore(f, mode) > previewScore).length + 1 : null;
  const previewColor = previewScore !== null ? getBarColor(previewScore, Math.max(maxScore, previewScore)) : "#64748b";

  return (
    <div className={s.container}>

      {/* Header */}
      <div className={s.header}>
        <h1 className={s.title}>🎯 Приоритизатор фич</h1>
        <div className={s.modeToggle}>
          {(["RICE", "ICE"] as ScoringMode[]).map(m => (
            <span key={m} className={s.modeItem}>
              <button type="button" onClick={() => setMode(m)} className={mode === m ? s.modeBtnActive : s.modeBtn}>
                {m}
              </button>
              <Tooltip text={m === "RICE"
                ? "RICE = (Охват × Влияние × Уверенность%) ÷ Трудозатраты"
                : "ICE = Влияние × Уверенность% × (10 ÷ Трудозатраты)"}
              />
            </span>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className={s.formCard}>
        <div className={s.nameDescRow}>
          <div>
            <label className={s.label}>Название *</label>
            <input placeholder="Например: Онбординг новых пользователей" value={form.name}
              onChange={e => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: undefined }); }}
              className={errors.name ? s.inputError : s.input} />
            {errors.name && <div className={s.error}>{errors.name}</div>}
          </div>
          <div>
            <label className={s.label}>Какую проблему решает? (необязательно)</label>
            <input placeholder="Например: пользователи уходят на втором шаге" value={form.desc}
              onChange={e => setForm({ ...form, desc: e.target.value })} className={s.input} />
          </div>
        </div>

        <div className={s.fieldsGrid}>
          <div>
            <label className={isIce ? s.labelDimmed : s.label}>
              📊 Охват (пользователей/мес) {!isIce && "*"}
              <Tooltip text="Сколько пользователей столкнётся с этой фичей в месяц. Чем больше охват — тем выше скор." />
            </label>
            <NumberInput value={form.reach} placeholder="1000" step={100} min={0} disabled={isIce} error={errors.reach}
              onChange={v => { setForm({ ...form, reach: v }); setErrors({ ...errors, reach: undefined }); }} />
            {errors.reach && <div className={s.error}>{errors.reach}</div>}
          </div>
          <div>
            <label className={s.label}>
              💥 Влияние
              <Tooltip text="Насколько сильно фича изменит поведение или опыт пользователя. 3 — трансформирует продукт, 0.25 — едва заметно." />
            </label>
            <select value={form.impact} onChange={e => setForm({ ...form, impact: e.target.value })} className={s.select}>
              {IMPACT_SCALE.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={s.label}>
              🎯 Уверенность
              <Tooltip text="Насколько ты уверен в оценках охвата и влияния. 100% — есть данные, 10% — чистая интуиция." />
            </label>
            <select value={form.confidence} onChange={e => setForm({ ...form, confidence: e.target.value })} className={s.select}>
              {CONF_OPTIONS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={s.label}>
              ⚡ Трудозатраты (чел-мес) *
              <Tooltip text="Сколько человеко-месяцев займёт реализация. 0.5 — пара недель одного разработчика, 3 — квартал команды." />
            </label>
            <NumberInput value={form.effort} placeholder="2" step={0.5} min={0.25} error={errors.effort}
              onChange={v => { setForm({ ...form, effort: v }); setErrors({ ...errors, effort: undefined }); }} />
            {errors.effort && <div className={s.error}>{errors.effort}</div>}
          </div>
        </div>

        {previewScore !== null && (
          <div className={s.preview} style={{ borderColor: `${previewColor}40` }}>
            <div>
              <div className={s.previewLabel}>Прогноз {mode}-скора</div>
              <div className={s.previewRank}>
                {previewRank === 1 && sorted.length > 0 ? "🥇 Войдёт на 1-е место"
                  : previewRank !== null && sorted.length > 0 ? `📍 Место в бэклоге: #${previewRank} из ${sorted.length + 1}`
                  : "📍 Первая фича в бэклоге"}
              </div>
            </div>
            <span className={s.previewScore} style={{ color: previewColor }}>{previewScore}</span>
          </div>
        )}

        <button type="button" onClick={handleAddFeature} className={justAdded ? s.addBtnSuccess : s.addBtn}>
          {justAdded ? "✓ Добавлено!" : "Добавить в бэклог"}
        </button>
      </div>

      {/* Backlog */}
      <div>
        <div className={s.backlogHeader}>
          <h3 className={s.backlogTitle}>📋 Бэклог ({sorted.length})</h3>
          <div className={s.backlogActions}>
            {sorted.length > 0 && (
              <button type="button" onClick={handleExportCsv} className={s.csvBtn}>📥 Скачать CSV</button>
            )}
            {sorted.length > 0 && (
              <button type="button" onClick={handleClear} className={confirmClear ? s.clearBtnConfirm : s.clearBtn}>
                {confirmClear ? "Точно удалить?" : "🗑 Очистить"}
              </button>
            )}
            <span className={s.sortLabel}>по {mode}-скору ↓</span>
          </div>
        </div>

        {/* Фильтр по статусу */}
        {sorted.length > 0 && (
          <div className={s.filterRow}>
            {(["all", ...STATUS_CYCLE] as const).map(st => {
              const count = st === "all" ? features.length : features.filter(f => f.status === st).length;
              const active = filterStatus === st;
              const sc = st === "all" ? null : STATUSES[st];
              return (
                <button type="button" key={st} onClick={() => setFilterStatus(st)} className={s.filterPill}
                  style={{
                    borderColor: active ? (sc?.color ?? "#6366f1") : undefined,
                    background: active ? (sc ? sc.bg : "#6366f118") : undefined,
                    color: active ? (sc?.color ?? "#a5b4fc") : undefined,
                    fontWeight: active ? 600 : undefined,
                  }}>
                  {st === "all" ? "Все" : STATUSES[st].label}
                  {count > 0 && <span className={s.filterPillCount}> ({count})</span>}
                </button>
              );
            })}
          </div>
        )}

        {!loaded && <p className={s.loading}>Загрузка...</p>}
        {loaded && sorted.length === 0 && (
          <div className={s.emptyState}>
            <div className={s.emptyIcon}>📝</div>
            <p className={s.emptyTitle}>Бэклог пуст</p>
            <p className={s.emptyHint}>Добавь первую фичу — заполни форму выше</p>
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
            onStatusChange={st => updateStatus(f.id, st)} />
        ))}
      </div>
    </div>
  );
}

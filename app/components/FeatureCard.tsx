"use client";

import { STATUSES } from "../lib/types";
import type { Feature, Status, FormState, ScoringMode } from "../lib/types";
import { IMPACT_SCALE, CONF_OPTIONS, STATUS_CYCLE } from "../lib/constants";
import s from "./FeatureCard.module.css";

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" />
    </svg>
  );
}

interface Props {
  feature: Feature;
  index: number;
  score: number;
  maxScore: number;
  isEditing: boolean;
  isIce: boolean;
  mode: ScoringMode;
  editForm: FormState;
  setEditForm: (f: FormState) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onRemove: () => void;
  onStatusChange: (s: Status) => void;
  barColor: string;
}

export function FeatureCard({ feature, index, score, maxScore, isEditing, isIce, editForm, setEditForm, onStartEdit, onSaveEdit, onCancelEdit, onRemove, onStatusChange, barColor }: Props) {
  const barWidth = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const st = STATUSES[feature.status];

  if (isEditing) {
    return (
      <div className={s.cardEditing}>
        <input value={editForm.name} autoFocus onChange={e => setEditForm({ ...editForm, name: e.target.value })}
          className={s.editInputName} placeholder="Название фичи" />
        <input value={editForm.desc} onChange={e => setEditForm({ ...editForm, desc: e.target.value })}
          className={s.editInputDesc} placeholder="Какую проблему решает?" />
        <div className={s.editGrid}>
          <div>
            <label className={isIce ? s.editLabelDimmed : s.editLabel}>📊 Охват</label>
            <input type="number" value={editForm.reach} disabled={isIce}
              onChange={e => setEditForm({ ...editForm, reach: e.target.value })}
              className={isIce ? s.editInputDisabled : s.editInput} />
          </div>
          <div>
            <label className={s.editLabel}>💥 Влияние</label>
            <select value={editForm.impact} onChange={e => setEditForm({ ...editForm, impact: e.target.value })} className={s.editSelect}>
              {IMPACT_SCALE.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={s.editLabel}>🎯 Уверенность</label>
            <select value={editForm.confidence} onChange={e => setEditForm({ ...editForm, confidence: e.target.value })} className={s.editSelect}>
              {CONF_OPTIONS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={s.editLabel}>⚡ Трудозатраты</label>
            <input type="number" value={editForm.effort} step="0.25"
              onChange={e => setEditForm({ ...editForm, effort: e.target.value })} className={s.editInput} />
          </div>
        </div>
        <div className={s.editActions}>
          <button type="button" onClick={onSaveEdit} className={s.saveBtn}>Сохранить</button>
          <button type="button" onClick={onCancelEdit} className={s.cancelBtn}>Отмена</button>
        </div>
      </div>
    );
  }

  const cycleStatus = () => {
    const i = STATUS_CYCLE.indexOf(feature.status);
    onStatusChange(STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length]);
  };

  const isDimmed = feature.status === "done" || feature.status === "deferred";

  return (
    <div className={isDimmed ? s.cardDimmed : s.card}>
      <div className={s.topRow}>
        <div className={s.badges}>
          <span className={s.rank} style={{ background: barColor }}>#{index + 1}</span>
          <button
            type="button"
            onClick={cycleStatus}
            className={s.statusBadge}
            aria-label={`Изменить статус фичи "${feature.name}"`}
            style={{ background: st.bg, color: st.color, borderColor: `${st.color}40` }}>
            {st.label}
          </button>
          <button type="button" onClick={onStartEdit} className={s.featureName} aria-label={`Редактировать фичу "${feature.name}"`}>
            {feature.name}
            <span className={s.pencilIcon}><PencilIcon /></span>
          </button>
        </div>
        <button type="button" onClick={onRemove} className={s.removeBtn} aria-label={`Удалить фичу "${feature.name}"`}>✕</button>
      </div>
      {feature.desc && <p className={s.desc}>{feature.desc}</p>}
      <div className={s.metrics}>
        <span className={isIce ? s.metricDimmed : undefined}>📊 Охват: {feature.reach}</span>
        <span>💥 Влияние: {feature.impact}</span>
        <span>🎯 Уверенность: {feature.confidence}%</span>
        <span>⚡ Трудозатраты: {feature.effort} мес</span>
      </div>
      <div className={s.barRow}>
        <div className={s.barTrack}>
          <div className={s.barFill} style={{ width: `${barWidth}%`, background: barColor }} />
        </div>
        <span className={s.scoreValue} style={{ color: barColor }}>{score}</span>
      </div>
    </div>
  );
}

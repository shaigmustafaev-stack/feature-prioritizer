"use client";

import { STATUSES } from "../lib/types";
import type { Feature, Status, FormState, ScoringMode } from "../lib/types";
import { IMPACT_SCALE, CONF_OPTIONS, STATUS_CYCLE } from "../lib/constants";

const inputStyle = { width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #6366f1", background: "#0f172a", color: "#fff", fontSize: 14, boxSizing: "border-box" as const, outline: "none" };
const inputDisabledStyle = { ...inputStyle, border: "1px solid #1e293b", background: "#0a0f1a", color: "#334155" };
const selectStyle = { ...inputStyle, padding: "6px 28px 6px 10px", fontSize: 13, appearance: "none" as const, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" };

function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" />
    </svg>
  );
}

interface EditFormState extends FormState {}

interface Props {
  feature: Feature;
  index: number;
  score: number;
  maxScore: number;
  isEditing: boolean;
  isIce: boolean;
  mode: ScoringMode;
  editForm: EditFormState;
  setEditForm: (f: EditFormState) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onRemove: () => void;
  onStatusChange: (s: Status) => void;
  barColor: string;
}

export function FeatureCard({ feature, index, score, maxScore, isEditing, isIce, editForm, setEditForm, onStartEdit, onSaveEdit, onCancelEdit, onRemove, onStatusChange, barColor }: Props) {
  const barWidth = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const statusStyle = STATUSES[feature.status];

  if (isEditing) {
    return (
      <div style={{ background: "#1e293b", borderRadius: 10, padding: 14, marginBottom: 10, border: "1px solid #6366f1" }}>
        <input value={editForm.name} autoFocus onChange={e => setEditForm({ ...editForm, name: e.target.value })}
          style={{ ...inputStyle, fontSize: 15, fontWeight: 600, marginBottom: 6 }} placeholder="Название фичи" />
        <input value={editForm.desc} onChange={e => setEditForm({ ...editForm, desc: e.target.value })}
          style={{ ...inputStyle, fontSize: 12, marginBottom: 10, borderColor: "#334155" }} placeholder="Какую проблему решает?" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: isIce ? "#334155" : "#64748b" }}>📊 Охват</label>
            <input type="number" value={editForm.reach} disabled={isIce}
              onChange={e => setEditForm({ ...editForm, reach: e.target.value })}
              style={isIce ? inputDisabledStyle : inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#64748b" }}>💥 Влияние</label>
            <select value={editForm.impact} onChange={e => setEditForm({ ...editForm, impact: e.target.value })} style={selectStyle}>
              {IMPACT_SCALE.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#64748b" }}>🎯 Уверенность</label>
            <select value={editForm.confidence} onChange={e => setEditForm({ ...editForm, confidence: e.target.value })} style={selectStyle}>
              {CONF_OPTIONS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "#64748b" }}>⚡ Трудозатраты</label>
            <input type="number" value={editForm.effort} step="0.25"
              onChange={e => setEditForm({ ...editForm, effort: e.target.value })} style={inputStyle} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onSaveEdit} style={{ flex: 1, padding: "7px", borderRadius: 7, border: "none", background: "#6366f1", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Сохранить</button>
          <button onClick={onCancelEdit} style={{ padding: "7px 14px", borderRadius: 7, border: "1px solid #334155", background: "transparent", color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>Отмена</button>
        </div>
      </div>
    );
  }

  const cycleStatus = () => {
    const i = STATUS_CYCLE.indexOf(feature.status);
    onStatusChange(STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length]);
  };

  return (
    <div style={{ background: "#1e293b", borderRadius: 10, padding: 14, marginBottom: 10, border: "1px solid transparent", opacity: (feature.status === "done" || feature.status === "deferred") ? 0.6 : 1, transition: "opacity 0.2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ background: barColor, color: "#000", fontWeight: 700, fontSize: 12, padding: "2px 7px", borderRadius: 5 }}>#{index + 1}</span>
          <span onClick={cycleStatus} className="status-badge" style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, cursor: "pointer", background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.color}40`, transition: "all 0.15s", userSelect: "none" }}>
            {statusStyle.label}
          </span>
          <span onClick={onStartEdit} className="feature-name" style={{ fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: "#e2e8f0", transition: "color 0.15s" }}>
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
          <div style={{ width: `${barWidth}%`, height: "100%", background: barColor, borderRadius: 4, transition: "width 0.3s" }} />
        </div>
        <span style={{ fontWeight: 700, fontSize: 15, color: barColor, minWidth: 55, textAlign: "right" }}>{score}</span>
      </div>
    </div>
  );
}

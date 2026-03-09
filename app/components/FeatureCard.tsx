"use client";

import { STATUSES } from "../lib/types";
import type { Feature, Status, FormState, ScoringMode } from "../lib/types";
import { IMPACT_SCALE, CONF_OPTIONS, STATUS_CYCLE } from "../lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

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
      <Card className="mb-2.5 border-primary">
        <CardContent className="space-y-2">
          <Input
            value={editForm.name}
            autoFocus
            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
            className="text-[15px] font-semibold"
            placeholder="Название фичи"
          />
          <Input
            value={editForm.desc}
            onChange={e => setEditForm({ ...editForm, desc: e.target.value })}
            className="text-xs"
            placeholder="Какую проблему решает?"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`text-[11px] ${isIce ? "text-muted-foreground/35" : "text-muted-foreground"}`}>📊 Охват</label>
              <Input
                type="number"
                value={editForm.reach}
                disabled={isIce}
                onChange={e => setEditForm({ ...editForm, reach: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">💥 Влияние</label>
              <Select value={editForm.impact} onValueChange={v => v && setEditForm({ ...editForm, impact: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPACT_SCALE.map(o => <SelectItem key={o.val} value={String(o.val)}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">🎯 Уверенность</label>
              <Select value={editForm.confidence} onValueChange={v => v && setEditForm({ ...editForm, confidence: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONF_OPTIONS.map(o => <SelectItem key={o.val} value={String(o.val)}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">⚡ Трудозатраты</label>
              <Input
                type="number"
                value={editForm.effort}
                step="0.25"
                onChange={e => setEditForm({ ...editForm, effort: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={onSaveEdit} className="flex-1" size="sm">Сохранить</Button>
            <Button variant="outline" onClick={onCancelEdit} size="sm">Отмена</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const cycleStatus = () => {
    const i = STATUS_CYCLE.indexOf(feature.status);
    onStatusChange(STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length]);
  };

  const isDimmed = feature.status === "done" || feature.status === "deferred";

  return (
    <Card className={`mb-2.5 ${isDimmed ? "opacity-60" : ""}`}>
      <CardContent>
        <div className="mb-1.5 flex items-start justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-md text-xs font-bold text-black" style={{ background: barColor }}>
              #{index + 1}
            </Badge>
            <button
              type="button"
              onClick={cycleStatus}
              className="cursor-pointer select-none rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-all hover:brightness-125"
              aria-label={`Изменить статус фичи "${feature.name}"`}
              style={{ background: st.bg, color: st.color, borderColor: `${st.color}40` }}
            >
              {st.label}
            </button>
            <button type="button" onClick={onStartEdit}
              className="flex items-center gap-1.5 border-none bg-transparent p-0 text-sm font-semibold text-foreground transition-colors hover:text-primary cursor-pointer"
              aria-label={`Редактировать фичу "${feature.name}"`}>
              {feature.name}
              <span className="text-muted-foreground transition-colors group-hover:text-primary"><PencilIcon /></span>
            </button>
          </div>
          <Button variant="ghost" size="icon-xs" onClick={onRemove} aria-label={`Удалить фичу "${feature.name}"`}>
            ✕
          </Button>
        </div>

        {feature.desc && <p className="mb-1.5 text-xs italic text-muted-foreground">{feature.desc}</p>}

        <div className="mb-1.5 flex gap-3.5 text-[11px] text-muted-foreground max-sm:grid max-sm:grid-cols-2 max-sm:gap-x-2.5 max-sm:gap-y-1">
          <span className={isIce ? "opacity-35" : ""}>📊 Охват: {feature.reach}</span>
          <span>💥 Влияние: {feature.impact}</span>
          <span>🎯 Уверенность: {feature.confidence}%</span>
          <span>⚡ Трудозатраты: {feature.effort} мес</span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="h-[7px] flex-1 overflow-hidden rounded bg-background">
            <div className="h-full rounded transition-[width] duration-300" style={{ width: `${barWidth}%`, background: barColor }} />
          </div>
          <span className="min-w-[55px] text-right text-[15px] font-bold" style={{ color: barColor }}>{score}</span>
        </div>
      </CardContent>
    </Card>
  );
}

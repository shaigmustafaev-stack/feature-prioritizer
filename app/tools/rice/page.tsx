"use client";

import { useState } from "react";
import { useFeatures } from "../../hooks/useFeatures";
import { FeatureCard } from "../../components/FeatureCard";
import { NumberInput } from "../../components/NumberInput";
import { STATUSES } from "../../lib/types";
import type { Status, ScoringMode, FormState, FormErrors, Feature } from "../../lib/types";
import { IMPACT_SCALE, CONF_OPTIONS, STATUS_CYCLE, EMPTY_FORM, DEFAULT_REACH } from "../../lib/constants";
import { getScore, getBarColor, validateFeature, buildCsv } from "../../lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

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

  const previewScore = (() => {
    if (!form.effort || Number(form.effort) <= 0) return null;
    const mock: Feature = { id: 0, name: "", desc: "", status: "new", reach: Number(form.reach) || DEFAULT_REACH, impact: Number(form.impact), confidence: Number(form.confidence), effort: Number(form.effort) };
    return getScore(mock, mode);
  })();
  const previewRank = previewScore !== null ? sorted.filter(f => getScore(f, mode) > previewScore).length + 1 : null;
  const previewColor = previewScore !== null ? getBarColor(previewScore, Math.max(maxScore, previewScore)) : "#64748b";

  return (
    <div className="mx-auto min-h-screen max-w-[860px] px-5 py-4 max-sm:px-4">

      {/* Header */}
      <div className="mb-4 flex items-center justify-between max-sm:flex-col max-sm:items-start max-sm:gap-2.5">
        <h1 className="text-xl font-bold text-foreground">🎯 Приоритизатор фич</h1>
        <Tabs value={mode} onValueChange={(v) => setMode(v as ScoringMode)}>
          <TabsList>
            <Tooltip>
              <TooltipTrigger render={<TabsTrigger value="RICE">RICE</TabsTrigger>} />
              <TooltipContent side="bottom">
                RICE = (Охват × Влияние × Уверенность%) ÷ Трудозатраты
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<TabsTrigger value="ICE">ICE</TabsTrigger>} />
              <TooltipContent side="bottom">
                ICE = Влияние × Уверенность% × (10 ÷ Трудозатраты)
              </TooltipContent>
            </Tooltip>
          </TabsList>
        </Tabs>
      </div>

      {/* Form */}
      <Card className="mb-4">
        <CardContent className="space-y-2">
          <div className="grid grid-cols-[3fr_2fr] gap-2 max-sm:grid-cols-1">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Название *</label>
              <Input
                placeholder="Например: Онбординг новых пользователей"
                value={form.name}
                onChange={e => { setForm({ ...form, name: e.target.value }); setErrors({ ...errors, name: undefined }); }}
                aria-invalid={!!errors.name}
              />
              {errors.name && <div className="mt-0.5 text-[11px] text-destructive">{errors.name}</div>}
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Какую проблему решает? (необязательно)</label>
              <Input
                placeholder="Например: пользователи уходят на втором шаге"
                value={form.desc}
                onChange={e => setForm({ ...form, desc: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
            <div>
              <label className={`mb-1 flex items-center gap-1 text-xs ${isIce ? "text-muted-foreground/35" : "text-muted-foreground"}`}>
                📊 Охват (пользователей/мес) {!isIce && "*"}
                <Tooltip>
                  <TooltipTrigger className="cursor-help text-[10px] text-muted-foreground">?</TooltipTrigger>
                  <TooltipContent>Сколько пользователей столкнётся с этой фичей в месяц. Чем больше охват — тем выше скор.</TooltipContent>
                </Tooltip>
              </label>
              <NumberInput value={form.reach} placeholder="1000" step={100} min={0} disabled={isIce} error={errors.reach}
                onChange={v => { setForm({ ...form, reach: v }); setErrors({ ...errors, reach: undefined }); }} />
              {errors.reach && <div className="mt-0.5 text-[11px] text-destructive">{errors.reach}</div>}
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                💥 Влияние
                <Tooltip>
                  <TooltipTrigger className="cursor-help text-[10px] text-muted-foreground">?</TooltipTrigger>
                  <TooltipContent>Насколько сильно фича изменит поведение или опыт пользователя. 3 — трансформирует продукт, 0.25 — едва заметно.</TooltipContent>
                </Tooltip>
              </label>
              <Select value={form.impact} onValueChange={v => v && setForm({ ...form, impact: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPACT_SCALE.map(o => <SelectItem key={o.val} value={String(o.val)}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                🎯 Уверенность
                <Tooltip>
                  <TooltipTrigger className="cursor-help text-[10px] text-muted-foreground">?</TooltipTrigger>
                  <TooltipContent>Насколько ты уверен в оценках охвата и влияния. 100% — есть данные, 10% — чистая интуиция.</TooltipContent>
                </Tooltip>
              </label>
              <Select value={form.confidence} onValueChange={v => v && setForm({ ...form, confidence: v })}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONF_OPTIONS.map(o => <SelectItem key={o.val} value={String(o.val)}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                ⚡ Трудозатраты (чел-мес) *
                <Tooltip>
                  <TooltipTrigger className="cursor-help text-[10px] text-muted-foreground">?</TooltipTrigger>
                  <TooltipContent>Сколько человеко-месяцев займёт реализация. 0.5 — пара недель одного разработчика, 3 — квартал команды.</TooltipContent>
                </Tooltip>
              </label>
              <NumberInput value={form.effort} placeholder="2" step={0.5} min={0.25} error={errors.effort}
                onChange={v => { setForm({ ...form, effort: v }); setErrors({ ...errors, effort: undefined }); }} />
              {errors.effort && <div className="mt-0.5 text-[11px] text-destructive">{errors.effort}</div>}
            </div>
          </div>

          {previewScore !== null && (
            <div className="flex animate-in fade-in slide-in-from-top-1 items-center justify-between rounded-lg bg-background p-2.5" style={{ borderColor: `${previewColor}40` }}>
              <div>
                <div className="text-[11px] text-muted-foreground">Прогноз {mode}-скора</div>
                <div className="text-xs text-muted-foreground/70">
                  {previewRank === 1 && sorted.length > 0 ? "🥇 Войдёт на 1-е место"
                    : previewRank !== null && sorted.length > 0 ? `📍 Место в бэклоге: #${previewRank} из ${sorted.length + 1}`
                    : "📍 Первая фича в бэклоге"}
                </div>
              </div>
              <span className="text-2xl font-extrabold leading-none" style={{ color: previewColor }}>{previewScore}</span>
            </div>
          )}

          <Button
            type="button"
            onClick={handleAddFeature}
            className={`w-full ${justAdded ? "bg-green-500 hover:bg-green-500" : ""}`}
          >
            {justAdded ? "✓ Добавлено!" : "Добавить в бэклог"}
          </Button>
        </CardContent>
      </Card>

      {/* Backlog */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-muted-foreground">📋 Бэклог ({sorted.length})</h3>
          <div className="flex items-center gap-2.5">
            {sorted.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleExportCsv}>
                📥 Скачать CSV
              </Button>
            )}
            {sorted.length > 0 && (
              <Button
                variant={confirmClear ? "destructive" : "outline"}
                size="sm"
                onClick={handleClear}
              >
                {confirmClear ? "Точно удалить?" : "🗑 Очистить"}
              </Button>
            )}
            <span className="text-xs text-muted-foreground/70">по {mode}-скору ↓</span>
          </div>
        </div>

        {/* Фильтр по статусу */}
        {sorted.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {(["all", ...STATUS_CYCLE] as const).map(st => {
              const count = st === "all" ? features.length : features.filter(f => f.status === st).length;
              const active = filterStatus === st;
              const sc = st === "all" ? null : STATUSES[st];
              return (
                <button type="button" key={st} onClick={() => setFilterStatus(st)}
                  className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-all hover:border-primary/50"
                  style={{
                    borderColor: active ? (sc?.color ?? "#6366f1") : undefined,
                    background: active ? (sc ? sc.bg : "#6366f118") : undefined,
                    color: active ? (sc?.color ?? "#a5b4fc") : undefined,
                    fontWeight: active ? 600 : undefined,
                  }}>
                  {st === "all" ? "Все" : STATUSES[st].label}
                  {count > 0 && <span className="opacity-70"> ({count})</span>}
                </button>
              );
            })}
          </div>
        )}

        {!loaded && <p className="py-8 text-center text-muted-foreground">Загрузка...</p>}
        {loaded && sorted.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            <div className="mb-2 text-3xl">📝</div>
            <p className="text-[15px] font-medium">Бэклог пуст</p>
            <p className="mt-1.5 text-[13px]">Добавь первую фичу — заполни форму выше</p>
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

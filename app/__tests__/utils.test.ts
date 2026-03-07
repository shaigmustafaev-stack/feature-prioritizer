import { describe, it, expect } from "vitest";
import { calcRice, calcIce, getScore, getBarColor, validateFeature, buildCsv } from "../lib/utils";
import type { Feature, FormState } from "../lib/types";

const makeFeature = (overrides: Partial<Feature> = {}): Feature => ({
  id: 1, name: "Test", desc: "", reach: 1000, impact: 2, confidence: 80, effort: 4, status: "new", ...overrides,
});

const makeForm = (overrides: Partial<FormState> = {}): FormState => ({
  name: "Feature", desc: "", reach: "1000", impact: "2", confidence: "80", effort: "4", ...overrides,
});

// ─── calcRice ───────────────────────────────────────────────────────────────
describe("calcRice", () => {
  it("вычисляет правильно: (1000 * 2 * 0.8) / 4 = 400", () => {
    expect(calcRice(makeFeature())).toBe(400);
  });

  it("возвращает 0 если effort = 0", () => {
    expect(calcRice(makeFeature({ effort: 0 }))).toBe(0);
  });

  it("округляет до целого", () => {
    expect(calcRice(makeFeature({ reach: 1000, impact: 1, confidence: 33, effort: 1 }))).toBe(330);
  });

  it("работает с дробным effort", () => {
    expect(calcRice(makeFeature({ reach: 100, impact: 1, confidence: 100, effort: 0.5 }))).toBe(200);
  });
});

// ─── calcIce ────────────────────────────────────────────────────────────────
describe("calcIce", () => {
  it("вычисляет правильно: 2 * 0.8 * (10/4) = 4", () => {
    expect(calcIce(makeFeature())).toBe(4);
  });

  it("возвращает 0 если effort = 0", () => {
    expect(calcIce(makeFeature({ effort: 0 }))).toBe(0);
  });

  it("возвращает 0 если confidence = 0", () => {
    expect(calcIce(makeFeature({ confidence: 0 }))).toBe(0);
  });

  it("максимальный ICE: impact=3, conf=100, effort=0.25", () => {
    expect(calcIce(makeFeature({ impact: 3, confidence: 100, effort: 0.25 }))).toBe(120);
  });
});

// ─── getScore ───────────────────────────────────────────────────────────────
describe("getScore", () => {
  it("возвращает RICE в режиме RICE", () => {
    const f = makeFeature();
    expect(getScore(f, "RICE")).toBe(calcRice(f));
  });

  it("возвращает ICE в режиме ICE", () => {
    const f = makeFeature();
    expect(getScore(f, "ICE")).toBe(calcIce(f));
  });
});

// ─── getBarColor ─────────────────────────────────────────────────────────────
describe("getBarColor", () => {
  it("зелёный если > 66%", () => {
    expect(getBarColor(70, 100)).toBe("#22c55e");
  });

  it("жёлтый если 33–66%", () => {
    expect(getBarColor(50, 100)).toBe("#eab308");
  });

  it("красный если < 33%", () => {
    expect(getBarColor(20, 100)).toBe("#ef4444");
  });

  it("красный если maxScore = 0", () => {
    expect(getBarColor(0, 0)).toBe("#ef4444");
  });

  it("зелёный на 100%", () => {
    expect(getBarColor(100, 100)).toBe("#22c55e");
  });
});

// ─── validateFeature ─────────────────────────────────────────────────────────
describe("validateFeature", () => {
  it("валидная форма RICE проходит", () => {
    expect(validateFeature(makeForm(), "RICE").valid).toBe(true);
  });

  it("валидная форма ICE проходит (без reach)", () => {
    expect(validateFeature(makeForm({ reach: "" }), "ICE").valid).toBe(true);
  });

  it("пустое название — ошибка", () => {
    const r = validateFeature(makeForm({ name: "" }), "RICE");
    expect(r.valid).toBe(false);
    expect(r.errors.name).toBeDefined();
  });

  it("только пробелы в названии — ошибка", () => {
    const r = validateFeature(makeForm({ name: "   " }), "RICE");
    expect(r.valid).toBe(false);
    expect(r.errors.name).toBeDefined();
  });

  it("reach = 0 в режиме RICE — ошибка", () => {
    const r = validateFeature(makeForm({ reach: "0" }), "RICE");
    expect(r.valid).toBe(false);
    expect(r.errors.reach).toBeDefined();
  });

  it("reach не обязателен в режиме ICE", () => {
    const r = validateFeature(makeForm({ reach: "0" }), "ICE");
    expect(r.errors.reach).toBeUndefined();
  });

  it("effort = 0 — ошибка", () => {
    const r = validateFeature(makeForm({ effort: "0" }), "RICE");
    expect(r.valid).toBe(false);
    expect(r.errors.effort).toBeDefined();
  });

  it("отрицательный effort — ошибка", () => {
    const r = validateFeature(makeForm({ effort: "-1" }), "RICE");
    expect(r.valid).toBe(false);
  });
});

// ─── buildCsv ─────────────────────────────────────────────────────────────
describe("buildCsv", () => {
  it("содержит заголовок с полем Статус", () => {
    const csv = buildCsv([makeFeature()]);
    expect(csv).toContain("Статус");
  });

  it("содержит название фичи", () => {
    const csv = buildCsv([makeFeature({ name: "Онбординг" })]);
    expect(csv).toContain("Онбординг");
  });

  it("экранирует кавычки в названии", () => {
    const csv = buildCsv([makeFeature({ name: 'Say "hello"' })]);
    expect(csv).toContain('""hello""');
  });

  it("пустой массив — только заголовок", () => {
    const csv = buildCsv([]);
    const lines = csv.replace(/^\uFEFF/, "").split("\n");
    expect(lines).toHaveLength(1);
  });

  it("несколько фич — правильное количество строк", () => {
    const csv = buildCsv([makeFeature({ id: 1 }), makeFeature({ id: 2 })]);
    const lines = csv.replace(/^\uFEFF/, "").split("\n");
    expect(lines).toHaveLength(3); // заголовок + 2 строки
  });

  it("статус 'in-progress' отображается как 'В работе'", () => {
    const csv = buildCsv([makeFeature({ status: "in-progress" })]);
    expect(csv).toContain("В работе");
  });
});

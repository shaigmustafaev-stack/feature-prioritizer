# Task for Claude: OpenRouter model pinning + safe chartType policy

## Decision (approved)
Implement **only what is safe now**:

1) ✅ Replace `model: "openrouter/free"` with a concrete model (configurable).
2) ⚠️ Do **not** switch chart rendering to AI-controlled `chartType` yet.
   Keep deterministic frontend logic (`pickChartType`) as source of truth.

Reason: model pinning improves stability immediately; AI-selected chartType can degrade UX consistency if not strictly validated and tested.

---

## Scope

### A) OpenRouter model pinning (must do)
- File: `app/api/analytics/generate/route.ts`
- Replace hardcoded `"openrouter/free"` with config-based value:
  - `OPENROUTER_MODEL` env var
  - default fallback: `google/gemini-2.0-flash-exp:free`
- Keep existing fallback chain by key priority:
  - OpenRouter -> Gemini -> Anthropic
- Return clear error if provider key/model config is invalid.

### B) AI chartType in response (defer as non-breaking prep)
- Do **not** change current UI behavior.
- Optionally allow backend to parse optional `chartType` field from AI response,
  but frontend must ignore it for rendering for now.
- Current renderer must continue using `pickChartType(metric, periods.length)`.

---

## Explicit non-goals (do not do now)
- Do not make chart selection fully AI-driven.
- Do not change existing `DashboardView`/`ChartBlock` rendering policy.
- Do not refactor analytics architecture in this task.

---

## Acceptance criteria
- `app/api/analytics/generate/route.ts` no longer contains `"openrouter/free"`.
- Model is read from env with deterministic fallback.
- Existing analytics flow still works with current UI chart logic.
- No regressions in tests/build.

Run and report:
- `npm test`
- `npm run build`

If `build` fails only due Google Fonts/network in this environment, mark it as env limitation, not feature regression.

---

## Suggested commit message
`fix(analytics): pin OpenRouter model and keep deterministic chart selection`

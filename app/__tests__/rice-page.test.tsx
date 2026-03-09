// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import RicePage from "../tools/rice/page";
import type { Feature } from "../lib/types";

const MOCK_FEATURES: Feature[] = [
  { id: 1, name: "Онбординг новых пользователей", desc: "Пошаговый гайд для новичков", reach: 1000, impact: 3, confidence: 80, effort: 2, status: "in-progress" },
  { id: 2, name: "Тёмная тема", desc: "Переключение светлая/тёмная", reach: 500, impact: 0.5, confidence: 90, effort: 0.5, status: "new" },
  { id: 3, name: "Интеграция с Slack", desc: "Уведомления и команды в Slack", reach: 300, impact: 2, confidence: 50, effort: 5, status: "deferred" },
];

function makeFetchMock(features: Feature[] = MOCK_FEATURES) {
  return async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
    const method = options?.method ?? "GET";
    if (method === "GET") {
      return { ok: true, json: async () => features } as Response;
    }
    if (method === "POST") {
      const body = JSON.parse(options!.body as string);
      const newFeature: Feature = {
        id: 99, name: body.name, desc: body.description ?? "",
        reach: body.reach, impact: body.impact, confidence: body.confidence,
        effort: body.effort, status: body.status ?? "new",
      };
      return { ok: true, json: async () => newFeature } as Response;
    }
    if (method === "PUT") {
      const body = JSON.parse(options!.body as string);
      const updated: Feature = {
        id: body.id, name: body.name ?? "", desc: body.description ?? "",
        reach: body.reach, impact: body.impact, confidence: body.confidence,
        effort: body.effort, status: body.status ?? "new",
      };
      return { ok: true, json: async () => updated } as Response;
    }
    return { ok: true, json: async () => ({ success: true }) } as Response;
  };
}

const WAIT_OPTS = { timeout: 8000 };

describe("RicePage integration", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn(makeFetchMock());
    localStorage.clear();
    localStorage.setItem("producthub-user-id", "test-user");
  });

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("показывает ошибку валидации, если не заполнены обязательные поля", async () => {
    render(<RicePage />);

    // Кнопка всегда в DOM, валидация не зависит от загрузки фич
    await userEvent.click(screen.getByRole("button", { name: "Добавить в бэклог" }));

    expect(screen.getByText("Введи название фичи")).toBeInTheDocument();
    expect(screen.getAllByText("Укажи число больше 0")).toHaveLength(2);
  }, 10000);

  it("добавляет новую фичу в бэклог", async () => {
    const user = userEvent.setup();
    render(<RicePage />);

    // Ждём загрузки фич (userId устанавливается в том же эффекте)
    await waitFor(() => {
      expect(screen.getByRole("button", { name: 'Редактировать фичу "Онбординг новых пользователей"' })).toBeInTheDocument();
    }, WAIT_OPTS);

    const nameInput = screen.getByPlaceholderText("Например: Онбординг новых пользователей");
    const reachInput = screen.getByPlaceholderText("1000");
    const effortInput = screen.getByPlaceholderText("2");

    await user.clear(nameInput);
    await user.type(nameInput, "Автосохранение формы");
    await user.clear(reachInput);
    await user.type(reachInput, "100");
    await user.clear(effortInput);
    await user.type(effortInput, "1");
    await user.click(screen.getByRole("button", { name: "Добавить в бэклог" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: 'Редактировать фичу "Автосохранение формы"' })).toBeInTheDocument();
    }, WAIT_OPTS);
  }, 15000);

  it("циклически меняет статус фичи", async () => {
    render(<RicePage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: 'Редактировать фичу "Онбординг новых пользователей"' })).toBeInTheDocument();
    }, WAIT_OPTS);

    const statusButton = screen.getAllByRole("button", { name: /Изменить статус фичи "Онбординг новых пользователей"/ })[0];
    expect(statusButton).toHaveTextContent("В работе");

    await userEvent.click(statusButton);
    expect(statusButton).toHaveTextContent("Готово");
  }, 10000);
});

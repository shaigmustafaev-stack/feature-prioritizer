// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import RicePage from "../tools/rice/page";

describe("RicePage integration", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it("показывает ошибку валидации, если не заполнены обязательные поля", async () => {
    const user = userEvent.setup();
    render(<RicePage />);

    await user.click(screen.getByRole("button", { name: "Добавить в бэклог" }));

    expect(screen.getByText("Введи название фичи")).toBeInTheDocument();
    expect(screen.getAllByText("Укажи число больше 0")).toHaveLength(2);
  });

  it("добавляет новую фичу в бэклог", async () => {
    const user = userEvent.setup();
    render(<RicePage />);

    const nameInput = screen.getAllByPlaceholderText("Например: Онбординг новых пользователей")[0];
    const reachInput = screen.getByPlaceholderText("1000");
    const effortInput = screen.getByPlaceholderText("2");

    await user.clear(nameInput);
    await user.type(nameInput, "Автосохранение формы");
    await user.clear(reachInput);
    await user.type(reachInput, "100");
    await user.clear(effortInput);
    await user.type(effortInput, "1");
    await user.click(screen.getByRole("button", { name: "Добавить в бэклог" }));

    expect(screen.getByRole("button", { name: 'Редактировать фичу "Автосохранение формы"' })).toBeInTheDocument();
  });

  it("циклически меняет статус фичи", async () => {
    const user = userEvent.setup();
    render(<RicePage />);

    const featureButtons = screen.getAllByRole("button", { name: 'Редактировать фичу "Онбординг новых пользователей"' });
    expect(featureButtons.length).toBeGreaterThan(0);

    const statusButton = screen.getAllByRole("button", { name: /Изменить статус фичи/ })[0];
    expect(statusButton).toHaveTextContent("В работе");

    await user.click(statusButton);
    expect(statusButton).toHaveTextContent("Готово");
  });
});

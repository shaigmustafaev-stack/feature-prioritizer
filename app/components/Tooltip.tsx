"use client";

import { useState } from "react";
import s from "./Tooltip.module.css";

interface Props {
  text: string;
}

export function Tooltip({ text }: Props) {
  const [show, setShow] = useState(false);

  return (
    <span className={s.wrapper} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <button
        type="button"
        className={s.trigger}
        aria-label="Показать подсказку"
        aria-expanded={show}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
      >
        ?
      </button>
      {show && (
        <div className={s.popup} role="tooltip">
          {text}
          <div className={s.arrow} />
        </div>
      )}
    </span>
  );
}

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
      <span className={s.trigger}>?</span>
      {show && (
        <div className={s.popup}>
          {text}
          <div className={s.arrow} />
        </div>
      )}
    </span>
  );
}

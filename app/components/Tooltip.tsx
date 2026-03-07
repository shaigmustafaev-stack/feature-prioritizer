"use client";

import { useState } from "react";

interface Props {
  text: string;
}

export function Tooltip({ text }: Props) {
  const [show, setShow] = useState(false);

  return (
    <span
      style={{ position: "relative", display: "inline-flex", verticalAlign: "middle", marginLeft: 4 }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{ width: 14, height: 14, borderRadius: "50%", background: "#1e293b", border: "1px solid #475569", color: "#64748b", fontSize: 9, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "help", fontWeight: 700 }}>
        ?
      </span>
      {show && (
        <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "8px 10px", fontSize: 11, color: "#94a3b8", zIndex: 100, lineHeight: 1.6, width: 200, pointerEvents: "none", boxShadow: "0 4px 16px #00000060" }}>
          {text}
          <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #334155" }} />
        </div>
      )}
    </span>
  );
}

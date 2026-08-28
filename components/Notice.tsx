"use client";

import { useApp } from "@/lib/context";

export default function Notice() {
  const { notice, closeNotice } = useApp();
  return (
    <div className={`notice${notice ? " show" : ""}`}>
      <span dangerouslySetInnerHTML={{ __html: notice || "" }} />
      <button onClick={closeNotice}>Fechar</button>
    </div>
  );
}

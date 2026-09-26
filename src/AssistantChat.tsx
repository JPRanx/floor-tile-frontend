import { useState } from "react";
import type { AssistantReply, ChatMessage } from "./api";

export function AssistantChat({ onAsk: _onAsk }: {
  onAsk: (question: string, history: ChatMessage[]) => Promise<AssistantReply>;
}) {
  const [open, setOpen] = useState(false);

  if (!open) return <button className="assistant-launcher" type="button" onClick={() => setOpen(true)}>
    <span aria-hidden="true">✦</span> Consultar al asistente
  </button>;

  return <aside className="assistant-panel" aria-label="Asistente de planeación">
    <header>
      <div><span>Posibilidad futura</span><strong>Asistente con inteligencia artificial</strong></div>
      <button type="button" aria-label="Cerrar asistente" onClick={() => setOpen(false)}>×</button>
    </header>
    <p className="assistant-intro">
      Esta capacidad aún no está construida ni activa. Si el proyecto continúa evolucionando,
      puede incorporarse un asistente de IA para explicar recomendaciones, responder preguntas
      sobre el ciclo y detectar patrones en la operación.
    </p>
    <div className="assistant-messages">
      <div className="assistant-empty">No procesa preguntas ni modifica datos en esta versión.</div>
    </div>
  </aside>;
}

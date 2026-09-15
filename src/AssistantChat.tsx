import { useState } from "react";
import type { AssistantReply, ChatMessage } from "./api";

type DisplayMessage = ChatMessage & { grounding?: Omit<AssistantReply, "answer"> };

export function AssistantChat({ onAsk }: {
  onAsk: (question: string, history: ChatMessage[]) => Promise<AssistantReply>;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const nextQuestion = question.trim();
    if (!nextQuestion || busy) return;
    const history = messages.slice(-8);
    setBusy(true);
    setError(null);
    setQuestion("");
    setMessages((current) => [...current, { role: "user", content: nextQuestion }]);
    try {
      const reply = await onAsk(nextQuestion, history);
      setMessages((current) => [...current, {
        role: "assistant",
        content: reply.answer,
        grounding: {
          grounded_head_seq: reply.grounded_head_seq,
          grounding_as_of: reply.grounding_as_of,
        },
      }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  if (!open) return <button className="assistant-launcher" type="button" onClick={() => setOpen(true)}>
    <span aria-hidden="true">✦</span> Consultar al asistente
  </button>;

  return <aside className="assistant-panel" aria-label="Asistente de planeación">
    <header>
      <div><span>ASISTENTE DE ASHLEY</span><strong>Pregunta por el ciclo</strong></div>
      <button type="button" aria-label="Cerrar asistente" onClick={() => setOpen(false)}>×</button>
    </header>
    <p className="assistant-intro">Responde con la planeación actual: ventas, velocidad, inventario, SIESA, producción, barcos y buffers. No ejecuta órdenes.</p>
    <div className="assistant-messages" aria-live="polite">
      {messages.length === 0 && <div className="assistant-empty">Prueba: “¿Por qué recomienda esta cantidad?” o “¿Qué cubre el buffer de TOLÚ GRIS?”</div>}
      {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`assistant-message ${message.role}`}>
        <b>{message.role === "user" ? "Ashley" : "Asistente"}</b>
        <p>{message.content}</p>
        {message.grounding && <small>
          Base: {message.grounding.grounding_as_of ?? "fecha no disponible"} · revisión {message.grounding.grounded_head_seq}
        </small>}
      </div>)}
      {busy && <div className="assistant-thinking">Revisando el contexto actual…</div>}
    </div>
    {error && <p className="assistant-error" role="alert">{error}</p>}
    <div className="assistant-input">
      <label htmlFor="assistant-question">Pregunta para el asistente</label>
      <textarea id="assistant-question" maxLength={2000} value={question} onChange={(event) => setQuestion(event.currentTarget.value)} onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); }
      }} placeholder="Escribe tu pregunta…" />
      <button type="button" disabled={busy || !question.trim()} onClick={() => void submit()}>Enviar pregunta</button>
    </div>
  </aside>;
}

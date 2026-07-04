// Tres puntos animados que indican que la IA está escribiendo.
export default function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-1 px-0.5 py-1" aria-label="Escribiendo...">
      <span className="typing-dot" />
      <span className="typing-dot" style={{ animationDelay: '0.15s' }} />
      <span className="typing-dot" style={{ animationDelay: '0.3s' }} />
    </span>
  );
}

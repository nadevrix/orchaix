// Avatar circular con la inicial del agente, para las burbujas del chat.
export default function AgentAvatar({ name, size = 28 }: { name?: string; size?: number }) {
  const initial = (name || 'IA').trim().charAt(0).toUpperCase();
  return (
    <div
      className="rounded-full bg-gradient-to-br from-[#0F766E] to-[#115E59] text-white font-bold flex items-center justify-center shrink-0 shadow-sm select-none"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}

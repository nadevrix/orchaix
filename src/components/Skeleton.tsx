// Silueta de carga: se usa en lugar de spinners a pantalla completa
// para que la estructura de la página aparezca de inmediato.
export default function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
}

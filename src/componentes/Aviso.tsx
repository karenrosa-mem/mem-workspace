// Alert do kit (mem-brand/components/Alert.md): ícone de traço + título + próximo passo.
type Variante = "warn" | "danger" | "done";

const ICONES: Record<Variante, React.ReactNode> = {
  warn: (
    <>
      <path d="M10 2.5 18 17H2z" />
      <path d="M10 8v4.5M10 14.6v.1" />
    </>
  ),
  danger: (
    <>
      <circle cx="10" cy="10" r="8" />
      <path d="M7 7l6 6M13 7l-6 6" />
    </>
  ),
  done: (
    <>
      <circle cx="10" cy="10" r="8" />
      <path d="M6.5 10.2 9 12.7l4.6-5" />
    </>
  ),
};

export default function Aviso({
  variante,
  titulo,
  children,
}: {
  variante: Variante;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`mem-alert mem-alert--${variante}`} role={variante === "danger" ? "alert" : "status"}>
      <svg
        className="mem-alert__icon"
        viewBox="0 0 20 20"
        fill="none"
        stroke={`var(--status-${variante})`}
        strokeWidth="1.8"
        aria-hidden="true"
      >
        {ICONES[variante]}
      </svg>
      <div>
        <p className="mem-alert__title">{titulo}</p>
        <p className="mem-alert__body">{children}</p>
      </div>
    </div>
  );
}

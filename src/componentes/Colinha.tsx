// "Colinha" da mentora ao lado de um campo: para que serve e um exemplo.
export default function Colinha({ serve, exemplo }: { serve: string; exemplo?: string }) {
  return (
    <div className="ws-colinha mem-body-sm">
      <p className="mem-muted">{serve}</p>
      {exemplo && (
        <details>
          <summary>Ver exemplo</summary>
          <p className="ws-colinha__exemplo">{exemplo}</p>
        </details>
      )}
    </div>
  );
}

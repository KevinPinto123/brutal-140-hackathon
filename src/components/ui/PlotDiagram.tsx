/** Esquema tecnico acotado de la parcela fija 7.00 x 20.00 m. */
export function PlotDiagram() {
  const x0 = 70;
  const x1 = 190;
  const y0 = 28;
  const y1 = 208;
  const cols = 6;
  const rows = 9;

  return (
    <svg viewBox="0 0 200 224" className="w-full" role="img" aria-label="Parcela 7 x 20 metros">
      <g stroke="#4a4a54" strokeWidth="0.9" fill="none">
        {/* Cota superior */}
        <path d={`M${x0} 18h${x1 - x0}`} />
        <path d={`M${x0} 13v10M${x1} 13v10`} />
        <path d={`M${x0} 18v10M${x1} 18v10`} strokeWidth="0.5" stroke="#33333b" />
        {/* Cota izquierda */}
        <path d={`M56 ${y0}v${y1 - y0}`} />
        <path d={`M51 ${y0}h10M51 ${y1}h10`} />
        <path d={`M56 ${y0}h14M56 ${y1}h14`} strokeWidth="0.5" stroke="#33333b" />
      </g>

      {/* Retícula interior */}
      <g stroke="#26262c" strokeWidth="0.7">
        {Array.from({ length: cols - 1 }, (_, i) => {
          const x = x0 + ((x1 - x0) / cols) * (i + 1);
          return <line key={`v${i}`} x1={x} y1={y0} x2={x} y2={y1} />;
        })}
        {Array.from({ length: rows - 1 }, (_, i) => {
          const y = y0 + ((y1 - y0) / rows) * (i + 1);
          return <line key={`h${i}`} x1={x0} y1={y} x2={x1} y2={y} />;
        })}
      </g>

      <rect
        x={x0}
        y={y0}
        width={x1 - x0}
        height={y1 - y0}
        fill="none"
        stroke="#54545e"
        strokeWidth="1"
      />

      <text
        x={(x0 + x1) / 2}
        y="9"
        textAnchor="middle"
        fill="#9a9aa2"
        fontSize="9.5"
        fontFamily="var(--font-jetbrains), monospace"
      >
        7.00 m
      </text>
      <text
        x="48"
        y={(y0 + y1) / 2 + 3}
        textAnchor="end"
        fill="#9a9aa2"
        fontSize="9.5"
        fontFamily="var(--font-jetbrains), monospace"
      >
        20.00 m
      </text>
      <text
        x={(x0 + x1) / 2}
        y={(y0 + y1) / 2 + 4}
        textAnchor="middle"
        fill="#e9e9ec"
        fontSize="11.5"
        fontFamily="var(--font-jetbrains), monospace"
      >
        140.00 m²
      </text>
    </svg>
  );
}

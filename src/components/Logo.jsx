// Símbolo de Seshat: estrella de siete puntas, arco y cálamo (del manual de marca).
const RAYS = [
  [32, 28, 32, 19],
  [36.69, 30.26, 43.73, 24.65],
  [37.85, 35.34, 46.62, 37.34],
  [34.6, 39.41, 38.51, 47.51],
  [29.4, 39.41, 25.49, 47.51],
  [26.15, 35.34, 17.38, 37.34],
  [27.31, 30.26, 20.27, 24.65],
];

export function Symbol({ className, title = 'Seshat', size, ...rest }) {
  return (
    <svg className={className} viewBox="0 0 64 64" role="img" aria-label={title} width={size} height={size} {...rest}>
      <g className="lm-s" strokeWidth="4" strokeLinecap="round">
        {RAYS.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
        <path d="M32 53 L32 61" />
      </g>
      <circle className="lf-lapis" cx="32" cy="34" r="3" />
      <path className="lm-b" d="M17 19 Q32 5 47 19" fill="none" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function Wordmark({ compact }) {
  return (
    <span className="wordmark">
      <Symbol className="wordmark-sym" />
      <span className="wordmark-txt">
        <b>Seshat</b>
        {!compact && <small>Technologies</small>}
      </span>
    </span>
  );
}

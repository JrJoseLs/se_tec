import { STATUS } from '../lib/content.js';

export function StatusPill({ status }) {
  return (
    <span className={`pill pill-${status}`}>
      <i />
      {STATUS[status] || status}
    </span>
  );
}

export function Progress({ value, accent }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="progress" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} aria-label="Avance">
      <div className="progress-bar">
        <span className={`bg-${accent || 'lapis'}`} style={{ width: `${v}%` }} />
      </div>
      <span className="progress-num">{v}%</span>
    </div>
  );
}

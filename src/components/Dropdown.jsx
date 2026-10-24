import { useEffect, useId, useRef, useState } from 'react';
import Icon from './Icon.jsx';

// Menú desplegable accesible (botón + listbox) con teclado.
export default function Dropdown({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(0);
  const root = useRef();
  const id = useId();
  const current = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    if (!open) return;
    const close = (e) => !root.current?.contains(e.target) && setOpen(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const choose = (o) => {
    onChange(o.value);
    setOpen(false);
  };
  const onKey = (e) => {
    if (!open && ['ArrowDown', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      setOpen(true);
      setFocus(Math.max(0, options.indexOf(current)));
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'ArrowDown') (e.preventDefault(), setFocus((f) => (f + 1) % options.length));
    if (e.key === 'ArrowUp') (e.preventDefault(), setFocus((f) => (f - 1 + options.length) % options.length));
    if (e.key === 'Enter' || e.key === ' ') (e.preventDefault(), choose(options[focus]));
  };

  return (
    <div className={`dd${open ? ' open' : ''}`} ref={root}>
      <button
        type="button"
        className="dd-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKey}
      >
        <span className="dd-label">{label}</span>
        <b>{current.label}</b>
        {current.count != null && <span className="dd-count">{current.count}</span>}
        <Icon name="down" size={16} className="dd-chev" />
      </button>
      {open && (
        <ul className="dd-menu" role="listbox" id={id} aria-label={label}>
          {options.map((o, k) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`${k === focus ? 'focus' : ''}${o.value === value ? ' sel' : ''}`}
              onPointerEnter={() => setFocus(k)}
              onClick={() => choose(o)}
            >
              {o.dot && <i className={`bg-${o.dot}`} />}
              <span>{o.label}</span>
              {o.count != null && <span className="dd-count">{o.count}</span>}
              {o.value === value && <Icon name="check" size={14} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

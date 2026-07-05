'use client';

import { useEffect, useState } from 'react';

// Results as horizontal bars. Tapping a question opens a right-side drawer
// listing everyone who voted for it (votes are not anonymous).
export default function Bars({ results }) {
  const max = Math.max(1, ...results.map((r) => r.votes));
  const [active, setActive] = useState(null);

  // Close the drawer with the Escape key.
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setActive(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  return (
    <div>
      {results.map((r) => (
        <div className="result" key={r.id}>
          <div className="top">
            <span dir="auto">
              {r.text}
              {r.addedBy && (
                <span className="by">
                  {' '}
                  · by <bdi>{r.addedBy}</bdi>
                </span>
              )}
            </span>
            <strong>{r.votes}</strong>
          </div>
          <div className="bar">
            <span style={{ width: `${(r.votes / max) * 100}%` }} />
          </div>
          {r.votes > 0 && (
            <button
              className="ghost small mt"
              onClick={() => setActive(r)}
            >
              View voters ({r.votes}) →
            </button>
          )}
        </div>
      ))}

      <VotersDrawer result={active} onClose={() => setActive(null)} />
    </div>
  );
}

function VotersDrawer({ result, onClose }) {
  const open = !!result;
  return (
    <>
      <div
        className={`drawer-overlay ${open ? 'show' : ''}`}
        onClick={onClose}
      />
      <aside
        className={`drawer ${open ? 'open' : ''}`}
        aria-hidden={!open}
        role="dialog"
        aria-label="Voters"
      >
        {result && (
          <>
            <div className="drawer-head">
              <div style={{ minWidth: 0 }}>
                <div className="drawer-title" dir="auto">
                  {result.text}
                </div>
                <div className="muted small">
                  {result.votes} vote{result.votes === 1 ? '' : 's'}
                </div>
              </div>
              <button
                className="ghost small"
                onClick={onClose}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="drawer-body">
              {result.voters.map((name, i) => (
                <div className="voter-line" key={name} dir="auto">
                  <span className="voter-num">{i + 1}</span>
                  {name}
                </div>
              ))}
            </div>
          </>
        )}
      </aside>
    </>
  );
}

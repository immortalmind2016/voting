'use client';

import { useState } from 'react';

// Results as horizontal bars. Each question shows who wrote it, its tally, and
// an openable list of who voted for it (votes are not anonymous).
export default function Bars({ results }) {
  const max = Math.max(1, ...results.map((r) => r.votes));
  return (
    <div>
      {results.map((r) => (
        <ResultRow key={r.id} r={r} max={max} />
      ))}
    </div>
  );
}

function ResultRow({ r, max }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="result">
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
        <button className="ghost small mt" onClick={() => setOpen((o) => !o)}>
          {open ? 'Hide voters' : `View voters (${r.votes})`}
        </button>
      )}
      {open && (
        <div className="voters">
          {r.voters.map((name) => (
            <span className="chip" key={name} dir="auto">
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

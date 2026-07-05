'use client';

// Results as horizontal bars, showing who added each option and who voted
// for it (votes are not anonymous).
export default function Bars({ results }) {
  const max = Math.max(1, ...results.map((r) => r.votes));
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
          {r.voters && r.voters.length > 0 && (
            <div className="voters">
              {r.voters.map((name) => (
                <span className="chip" key={name} dir="auto">
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

// A mm:ss countdown to `endsAt` (ISO string). Purely visual — reaching zero
// shows "Time's up" but never changes anything on its own.
export default function Countdown({ endsAt }) {
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!endsAt || now === null) return null;

  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return <span className="timer up">⏱ Time&apos;s up</span>;

  const total = Math.floor(ms / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return (
    <span className="timer">
      ⏱ {mm}:{ss}
    </span>
  );
}

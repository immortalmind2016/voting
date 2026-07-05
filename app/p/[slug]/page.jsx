'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

export default function VotePage() {
  const { slug } = useParams();
  const [poll, setPoll] = useState(undefined); // undefined=loading, null=not found
  const [results, setResults] = useState(null);

  const loadPoll = useCallback(async () => {
    const res = await fetch(`/api/polls/${slug}`);
    if (res.status === 404) {
      setPoll(null);
      return;
    }
    setPoll(await res.json());
  }, [slug]);

  const loadResults = useCallback(async () => {
    const res = await fetch(`/api/polls/${slug}/results`);
    if (res.ok) setResults(await res.json());
  }, [slug]);

  useEffect(() => {
    loadPoll();
  }, [loadPoll]);

  // Once a voter is done (voted or poll closed), poll for revealed results.
  const waiting =
    poll && (poll.me?.hasVoted || poll.status === 'closed');
  useEffect(() => {
    if (!waiting) return;
    loadResults();
    const t = setInterval(() => {
      loadResults();
      loadPoll();
    }, 5000);
    return () => clearInterval(t);
  }, [waiting, loadResults, loadPoll]);

  if (poll === undefined) return <p className="muted">Loading…</p>;
  if (poll === null)
    return (
      <main>
        <h1>Poll not found</h1>
        <p className="muted">This link may be wrong or the poll was deleted.</p>
      </main>
    );

  return (
    <main>
      <h1>{poll.title}</h1>
      {poll.description && <p className="muted">{poll.description}</p>}
      <div className="mt mb">
        <span className={`badge ${poll.status}`}>{poll.status}</span>
      </div>

      {!poll.me ? (
        <Join slug={slug} onJoined={loadPoll} closed={poll.status === 'closed'} />
      ) : !poll.me.hasVoted && poll.status === 'open' ? (
        <Ballot slug={slug} poll={poll} onVoted={loadPoll} />
      ) : (
        <Done poll={poll} results={results} />
      )}
    </main>
  );
}

function Join({ slug, onJoined, closed }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await fetch(`/api/polls/${slug}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Could not join');
      return;
    }
    onJoined();
  }

  if (closed) {
    return (
      <div className="card">
        <p>This poll is closed — you can no longer join.</p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>Pick a username to join</h2>
      <div className="field">
        <input
          type="text"
          value={username}
          autoFocus
          maxLength={40}
          placeholder="Your name"
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <button disabled={busy}>{busy ? '…' : 'Join'}</button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}

function Ballot({ slug, poll, onVoted }) {
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const max = poll.votesPerPerson;
  const atLimit = selected.length >= max;

  function toggle(id) {
    setSelected((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= max) return s; // enforce the cap
      return [...s, id];
    });
  }

  async function submit() {
    setError('');
    setBusy(true);
    const res = await fetch(`/api/polls/${slug}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionIds: selected }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Could not submit vote');
      return;
    }
    onVoted();
  }

  return (
    <div className="card">
      <div className="row spread mb">
        <h2 style={{ margin: 0 }}>
          Hi {poll.me.username} — cast your vote
        </h2>
      </div>
      <p className="muted small mb">
        Pick up to <strong>{max}</strong> option{max > 1 ? 's' : ''} (one vote
        each). Selected {selected.length}/{max}.
      </p>

      {poll.options.map((o) => {
        const isSel = selected.includes(o.id);
        const disabled = !isSel && atLimit;
        return (
          <label
            key={o.id}
            className={`option ${isSel ? 'selected' : ''} ${
              disabled ? 'disabled' : ''
            }`}
          >
            <input
              type="checkbox"
              checked={isSel}
              disabled={disabled}
              onChange={() => toggle(o.id)}
            />
            <span>{o.text}</span>
          </label>
        );
      })}

      <button
        className="mt"
        disabled={busy || selected.length === 0}
        onClick={submit}
      >
        {busy ? 'Submitting…' : 'Submit vote'}
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}

function Done({ poll, results }) {
  return (
    <div className="card">
      {poll.me?.hasVoted ? (
        <p className="ok">✓ Thanks {poll.me.username}, your vote is in.</p>
      ) : (
        <p>This poll is closed.</p>
      )}

      {results?.revealed ? (
        <>
          <div className="divider" />
          <h2>Results</h2>
          <div className="muted small mb">
            {results.totalVoted} of {results.totalParticipants} joined have voted
          </div>
          <Bars results={results.results} />
        </>
      ) : (
        <p className="muted small mt">
          Results aren&apos;t published yet — this page updates automatically
          when the organizer reveals them.
        </p>
      )}
    </div>
  );
}

function Bars({ results }) {
  const max = Math.max(1, ...results.map((r) => r.votes));
  return (
    <div>
      {results.map((r) => (
        <div className="result" key={r.id}>
          <div className="top">
            <span>{r.text}</span>
            <strong>{r.votes}</strong>
          </div>
          <div className="bar">
            <span style={{ width: `${(r.votes / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

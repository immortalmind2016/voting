'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Bars from '@/app/components/Bars';

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
    if (res.ok) setPoll(await res.json());
  }, [slug]);

  const loadResults = useCallback(async () => {
    const res = await fetch(`/api/polls/${slug}/results`);
    if (res.ok) setResults(await res.json());
  }, [slug]);

  useEffect(() => {
    loadPoll();
  }, [loadPoll]);

  // Keep the page in sync as the organizer moves between phases and as other
  // people add options / cast votes.
  useEffect(() => {
    const t = setInterval(() => {
      loadPoll();
      loadResults();
    }, 4000);
    return () => clearInterval(t);
  }, [loadPoll, loadResults]);

  if (poll === undefined) return <p className="muted">Loading…</p>;
  if (poll === null)
    return (
      <main>
        <h1>Poll not found</h1>
        <p className="muted">This link may be wrong or the poll was deleted.</p>
      </main>
    );

  const phaseLabel = {
    collecting: 'collecting options',
    voting: 'voting open',
    closed: 'closed',
  }[poll.phase];

  return (
    <main>
      <h1 dir="auto">{poll.title}</h1>
      {poll.description && (
        <p className="muted" dir="auto">
          {poll.description}
        </p>
      )}
      <div className="mt mb">
        <span className={`badge ${poll.phase}`}>{phaseLabel}</span>
      </div>

      {!poll.me ? (
        <Join slug={slug} onJoined={loadPoll} phase={poll.phase} />
      ) : poll.phase === 'collecting' ? (
        <Collecting slug={slug} poll={poll} onChange={loadPoll} />
      ) : poll.phase === 'voting' && !poll.me.hasVoted ? (
        <Ballot slug={slug} poll={poll} onVoted={loadPoll} />
      ) : (
        <Done poll={poll} results={results} />
      )}
    </main>
  );
}

function Join({ slug, onJoined, phase }) {
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

  if (phase === 'closed') {
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
          dir="auto"
          placeholder="Your name"
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <button disabled={busy}>{busy ? '…' : 'Join'}</button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}

function Collecting({ slug, poll, onChange }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function add(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setError('');
    setBusy(true);
    const res = await fetch(`/api/polls/${slug}/options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Could not add option');
      return;
    }
    setText('');
    onChange();
  }

  async function remove(id) {
    await fetch(`/api/polls/${slug}/options?id=${id}`, { method: 'DELETE' });
    onChange();
  }

  return (
    <div className="card">
      <h2>
        You&apos;re in, <bdi>{poll.me.username}</bdi>
      </h2>
      <p className="muted small mb">
        Add your questions or options below. Voting hasn&apos;t started yet —
        this list updates live as others add theirs.
      </p>

      <form className="row" onSubmit={add} style={{ marginBottom: 14 }}>
        <input
          type="text"
          value={text}
          dir="auto"
          maxLength={200}
          placeholder="Add a question / option…"
          onChange={(e) => setText(e.target.value)}
          style={{ flex: 1 }}
        />
        <button disabled={busy || !text.trim()}>Add</button>
      </form>
      {error && <div className="error mb">{error}</div>}

      <div className="muted small mb">
        {poll.options.length} option{poll.options.length === 1 ? '' : 's'} so far
      </div>
      {poll.options.map((o) => (
        <div className="opt-item" key={o.id}>
          <span dir="auto" style={{ flex: 1 }}>
            {o.text}
          </span>
          {o.addedBy && (
            <span className="who">
              by <bdi>{o.addedBy}</bdi>
            </span>
          )}
          {o.addedBy === poll.me.username && (
            <button className="x" onClick={() => remove(o.id)}>
              remove
            </button>
          )}
        </div>
      ))}

      <div className="divider" />
      <p className="muted small">Waiting for the organizer to start voting…</p>
    </div>
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
          Hi <bdi>{poll.me.username}</bdi> — cast your vote
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
            <span dir="auto" style={{ flex: 1 }}>
              {o.text}
            </span>
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
        <p className="ok">
          ✓ Thanks <bdi>{poll.me.username}</bdi>, your vote is in.
        </p>
      ) : poll.phase === 'closed' ? (
        <p>This poll is closed.</p>
      ) : (
        <p>Voting is open — but you haven&apos;t voted yet.</p>
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

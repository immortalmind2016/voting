'use client';

import { useEffect, useState, useCallback } from 'react';

export default function AdminPage() {
  const [authed, setAuthed] = useState(null); // null = loading
  const [polls, setPolls] = useState([]);

  const load = useCallback(async () => {
    const res = await fetch('/api/polls');
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const data = await res.json();
    setPolls(data.polls || []);
    setAuthed(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (authed === null) return <p className="muted">Loading…</p>;
  if (!authed) return <Login onDone={load} />;

  return (
    <main>
      <div className="row spread">
        <h1>Admin</h1>
        <button
          className="ghost small"
          onClick={async () => {
            await fetch('/api/admin/logout', { method: 'POST' });
            setAuthed(false);
          }}
        >
          Log out
        </button>
      </div>

      <CreatePoll onCreated={load} />

      <h2 className="mt">Your polls</h2>
      {polls.length === 0 && (
        <p className="muted">No polls yet. Create one above.</p>
      )}
      {polls.map((p) => (
        <PollRow key={p.slug} poll={p} onChange={load} />
      ))}
    </main>
  );
}

function Login({ onDone }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) onDone();
    else setError('Wrong password');
  }

  return (
    <main>
      <h1>Admin login</h1>
      <form className="card mt" onSubmit={submit}>
        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            autoFocus
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button disabled={busy}>{busy ? '…' : 'Log in'}</button>
        {error && <div className="error">{error}</div>}
      </form>
    </main>
  );
}

function CreatePoll({ onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [votesPerPerson, setVotesPerPerson] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function setOption(i, v) {
    setOptions((o) => o.map((x, idx) => (idx === i ? v : x)));
  }
  function addOption() {
    setOptions((o) => [...o, '']);
  }
  function removeOption(i) {
    setOptions((o) => (o.length <= 2 ? o : o.filter((_, idx) => idx !== i)));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await fetch('/api/polls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, options, votesPerPerson }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Something went wrong');
      return;
    }
    setTitle('');
    setDescription('');
    setOptions(['', '']);
    setVotesPerPerson(1);
    onCreated();
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>New poll</h2>
      <div className="field">
        <label>Title / question</label>
        <input
          type="text"
          value={title}
          placeholder="e.g. Which features should we build next?"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="field">
        <label>Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="field">
        <label>Options / statements</label>
        {options.map((opt, i) => (
          <div className="row" key={i} style={{ marginBottom: 8 }}>
            <input
              type="text"
              value={opt}
              placeholder={`Option ${i + 1}`}
              onChange={(e) => setOption(i, e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="ghost small"
              onClick={() => removeOption(i)}
              disabled={options.length <= 2}
              title="Remove"
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="ghost small" onClick={addOption}>
          + Add option
        </button>
      </div>

      <div className="field" style={{ maxWidth: 220 }}>
        <label>Votes per person</label>
        <input
          type="number"
          min={1}
          max={50}
          value={votesPerPerson}
          onChange={(e) => setVotesPerPerson(e.target.value)}
        />
        <div className="muted small mt">
          Each person votes for up to this many different options (one vote per
          option).
        </div>
      </div>

      <button disabled={busy}>{busy ? 'Creating…' : 'Create poll'}</button>
      {error && <div className="error">{error}</div>}
    </form>
  );
}

function PollRow({ poll, onChange }) {
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    setShareUrl(`${window.location.origin}/p/${poll.slug}`);
  }, [poll.slug]);

  async function patch(update) {
    await fetch(`/api/polls/${poll.slug}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    onChange();
  }

  async function loadResults() {
    const res = await fetch(`/api/polls/${poll.slug}/results`);
    const data = await res.json();
    setResults(data);
    setShowResults(true);
  }

  async function remove() {
    if (!confirm(`Delete "${poll.title}" and all its votes?`)) return;
    await fetch(`/api/polls/${poll.slug}/status`, { method: 'DELETE' });
    onChange();
  }

  function copy() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="card">
      <div className="row spread">
        <div>
          <strong>{poll.title}</strong>{' '}
          <span className={`badge ${poll.status}`}>{poll.status}</span>{' '}
          {poll.resultsRevealed && (
            <span className="badge revealed">results shown</span>
          )}
        </div>
      </div>
      <div className="muted small mt">
        {poll.optionCount} options · {poll.votesPerPerson} vote
        {poll.votesPerPerson > 1 ? 's' : ''}/person · {poll.participants} joined
        · {poll.voted} voted
      </div>

      <div className="row mt">
        <span className="share" style={{ flex: 1 }}>
          {shareUrl}
        </span>
        <button className="ghost small" onClick={copy}>
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>

      <div className="row mt">
        {poll.status === 'open' ? (
          <button className="ghost small" onClick={() => patch({ status: 'closed' })}>
            Close poll
          </button>
        ) : (
          <button className="ghost small" onClick={() => patch({ status: 'open' })}>
            Reopen
          </button>
        )}
        <button
          className="ghost small"
          onClick={() => patch({ resultsRevealed: !poll.resultsRevealed })}
        >
          {poll.resultsRevealed ? 'Hide results from voters' : 'Reveal results'}
        </button>
        <button className="ghost small" onClick={loadResults}>
          View tally
        </button>
        <button className="danger small" onClick={remove}>
          Delete
        </button>
      </div>

      {showResults && results?.results && (
        <>
          <div className="divider" />
          <div className="muted small mb">
            {results.totalVoted} of {results.totalParticipants} joined have voted
          </div>
          <Bars results={results.results} />
          <button
            className="ghost small mt"
            onClick={() => setShowResults(false)}
          >
            Hide tally
          </button>
        </>
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

'use client';

import { useEffect, useState, useCallback } from 'react';
import Bars from '@/app/components/Bars';
import Countdown from '@/app/components/Countdown';
import { PHASE_LABEL } from '@/lib/poll';

export default function AdminPage() {
  const [authed, setAuthed] = useState(null); // null = loading
  const [boards, setBoards] = useState([]);

  const load = useCallback(async () => {
    const res = await fetch('/api/polls');
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const data = await res.json();
    setBoards(data.polls || []);
    setAuthed(true);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000); // keep counts/questions fresh
    return () => clearInterval(t);
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

      <CreateBoard onCreated={load} />

      <h2 className="mt">Your boards</h2>
      {boards.length === 0 && (
        <p className="muted">No boards yet. Create one above.</p>
      )}
      {boards.map((b) => (
        <BoardRow key={b.slug} board={b} onChange={load} />
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

function CreateBoard({ onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [votesPerPerson, setVotesPerPerson] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await fetch('/api/polls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, votesPerPerson }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Something went wrong');
      return;
    }
    setTitle('');
    setDescription('');
    setVotesPerPerson(1);
    onCreated();
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>New board</h2>
      <div className="field">
        <label>Board name</label>
        <input
          type="text"
          value={title}
          dir="auto"
          placeholder="e.g. Team retro — July"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="field">
        <label>Description (optional)</label>
        <textarea
          value={description}
          dir="auto"
          onChange={(e) => setDescription(e.target.value)}
        />
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
          Each person can vote for up to this many different questions.
        </div>
      </div>
      <button disabled={busy}>{busy ? 'Creating…' : 'Create board'}</button>
      {error && <div className="error">{error}</div>}
      <div className="muted small mt">
        Participants write the questions after they join — you control when each
        phase starts and ends.
      </div>
    </form>
  );
}

function BoardRow({ board, onChange }) {
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [minutes, setMinutes] = useState(5);
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    setShareUrl(`${window.location.origin}/p/${board.slug}`);
  }, [board.slug]);

  async function patch(update) {
    const res = await fetch(`/api/polls/${board.slug}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Could not update board');
    }
    onChange();
  }

  async function deleteQuestion(id) {
    await fetch(`/api/polls/${board.slug}/options?id=${id}`, {
      method: 'DELETE',
    });
    onChange();
  }

  async function loadResults() {
    const res = await fetch(`/api/polls/${board.slug}/results`);
    setResults(await res.json());
    setShowResults(true);
  }

  async function remove() {
    if (!confirm(`Delete "${board.title}" and all its data?`)) return;
    await fetch(`/api/polls/${board.slug}/status`, { method: 'DELETE' });
    onChange();
  }

  function copy() {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const mins = () => Math.max(0, parseInt(minutes, 10) || 0);
  const phase = board.phase;

  return (
    <div className="card">
      <div className="row spread">
        <div>
          <bdi>
            <strong>{board.title}</strong>
          </bdi>{' '}
          <span className={`badge ${phase}`}>{PHASE_LABEL[phase]}</span>
        </div>
        {board.timerEndsAt && <Countdown endsAt={board.timerEndsAt} />}
      </div>
      <div className="muted small mt">
        {board.questions.length} question
        {board.questions.length === 1 ? '' : 's'} · {board.votesPerPerson} vote
        {board.votesPerPerson > 1 ? 's' : ''}/person · {board.participants}{' '}
        joined · {board.voted} voted
      </div>

      <div className="row mt">
        <span className="share" style={{ flex: 1 }}>
          {shareUrl}
        </span>
        <button className="ghost small" onClick={copy}>
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>

      {/* Question list (while writing or reviewing) */}
      {(phase === 'questions' || phase === 'review') && (
        <div className="mt">
          <div className="muted small mb">
            Questions ({board.questions.length})
          </div>
          {board.questions.length === 0 && (
            <div className="muted small">No questions yet.</div>
          )}
          {board.questions.map((q) => (
            <div className="opt-item" key={q.id}>
              <span dir="auto" style={{ flex: 1 }}>
                {q.text}
              </span>
              {q.addedBy && (
                <span className="who">
                  by <bdi>{q.addedBy}</bdi>
                </span>
              )}
              <button className="x" onClick={() => deleteQuestion(q.id)}>
                remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Phase controls */}
      <div className="divider" />
      <TimerField
        minutes={minutes}
        setMinutes={setMinutes}
        show={phase === 'lobby' || phase === 'questions' || phase === 'review' || phase === 'voting'}
      />
      <div className="row">
        {phase === 'lobby' && (
          <button
            onClick={() => patch({ phase: 'questions', timerMinutes: mins() })}
          >
            ▶ Start question writing
          </button>
        )}
        {phase === 'questions' && (
          <>
            <button
              className="ghost"
              onClick={() => patch({ timerMinutes: mins() })}
            >
              Set timer
            </button>
            <button onClick={() => patch({ phase: 'review' })}>
              Close question writing
            </button>
          </>
        )}
        {phase === 'review' && (
          <>
            <button
              className="ghost"
              onClick={() => patch({ phase: 'questions' })}
            >
              Back to writing
            </button>
            <button
              onClick={() => patch({ phase: 'voting', timerMinutes: mins() })}
            >
              ▶ Start voting
            </button>
          </>
        )}
        {phase === 'voting' && (
          <>
            <button
              className="ghost"
              onClick={() => patch({ timerMinutes: mins() })}
            >
              Set timer
            </button>
            <button onClick={() => patch({ phase: 'closed' })}>
              Close voting
            </button>
          </>
        )}
        {phase === 'closed' && (
          <button
            className="ghost"
            onClick={() => patch({ phase: 'voting' })}
          >
            Reopen voting
          </button>
        )}
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
          {results.results.length === 0 ? (
            <p className="muted">No questions.</p>
          ) : (
            <Bars results={results.results} />
          )}
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

function TimerField({ minutes, setMinutes, show }) {
  if (!show) return null;
  return (
    <div className="row mb">
      <label style={{ margin: 0 }} className="muted small">
        Timer (min)
      </label>
      <input
        className="timer-input"
        type="number"
        min={0}
        max={600}
        value={minutes}
        onChange={(e) => setMinutes(e.target.value)}
      />
      <span className="muted small">0 = no timer</span>
    </div>
  );
}

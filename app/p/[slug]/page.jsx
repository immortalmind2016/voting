'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Bars from '@/app/components/Bars';
import Countdown from '@/app/components/Countdown';
import { PHASE_LABEL } from '@/lib/poll';

export default function VotePage() {
  const { slug } = useParams();
  const [board, setBoard] = useState(undefined); // undefined=loading, null=not found
  const [results, setResults] = useState(null);

  const loadBoard = useCallback(async () => {
    const res = await fetch(`/api/polls/${slug}`);
    if (res.status === 404) {
      setBoard(null);
      return;
    }
    if (res.ok) setBoard(await res.json());
  }, [slug]);

  const loadResults = useCallback(async () => {
    const res = await fetch(`/api/polls/${slug}/results`);
    if (res.ok) setResults(await res.json());
  }, [slug]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // Stay in sync as the organizer moves between phases and people write/vote.
  useEffect(() => {
    const t = setInterval(() => {
      loadBoard();
      loadResults();
    }, 4000);
    return () => clearInterval(t);
  }, [loadBoard, loadResults]);

  if (board === undefined) return <p className="muted">Loading…</p>;
  if (board === null)
    return (
      <main>
        <h1>Board not found</h1>
        <p className="muted">This link may be wrong or the board was deleted.</p>
      </main>
    );

  const { phase } = board;

  return (
    <main>
      <h1 dir="auto">{board.title}</h1>
      {board.description && (
        <p className="muted" dir="auto">
          {board.description}
        </p>
      )}
      <div className="row mt mb">
        <span className={`badge ${phase}`}>{PHASE_LABEL[phase]}</span>
        {board.timerEndsAt && <Countdown endsAt={board.timerEndsAt} />}
      </div>

      {!board.me ? (
        phase === 'closed' ? (
          <Results board={board} results={results} joined={false} />
        ) : (
          <Join slug={slug} onJoined={loadBoard} />
        )
      ) : phase === 'lobby' ? (
        <Waiting title={`You're in, ${board.me.username}`}>
          Waiting for the organizer to start question writing…
        </Waiting>
      ) : phase === 'questions' ? (
        <WriteQuestions slug={slug} board={board} onChange={loadBoard} />
      ) : phase === 'review' ? (
        <ReviewList board={board} />
      ) : phase === 'voting' && !board.me.hasVoted ? (
        <Ballot slug={slug} board={board} onVoted={loadBoard} />
      ) : (
        <Results board={board} results={results} joined />
      )}
    </main>
  );
}

function Waiting({ title, children }) {
  return (
    <div className="card">
      <h2>
        <bdi>{title}</bdi>
      </h2>
      <p className="muted">{children}</p>
    </div>
  );
}

function Join({ slug, onJoined }) {
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

function WriteQuestions({ slug, board, onChange }) {
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
      setError(data.error || 'Could not add question');
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
        Write your questions, <bdi>{board.me.username}</bdi>
      </h2>
      <p className="muted small mb">
        Add as many questions as you like. This list updates live as others add
        theirs. Voting hasn&apos;t started yet.
      </p>

      <form className="row" onSubmit={add} style={{ marginBottom: 14 }}>
        <input
          type="text"
          value={text}
          dir="auto"
          maxLength={200}
          placeholder="Type a question…"
          onChange={(e) => setText(e.target.value)}
          style={{ flex: 1 }}
        />
        <button disabled={busy || !text.trim()}>Add</button>
      </form>
      {error && <div className="error mb">{error}</div>}

      <div className="muted small mb">
        {board.questions.length} question
        {board.questions.length === 1 ? '' : 's'} so far
      </div>
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
          {q.addedBy === board.me.username && (
            <button className="x" onClick={() => remove(q.id)}>
              remove
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function ReviewList({ board }) {
  return (
    <div className="card">
      <h2>Questions are in</h2>
      <p className="muted small mb">
        Writing is closed. Waiting for the organizer to start voting…
      </p>
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
        </div>
      ))}
    </div>
  );
}

function Ballot({ slug, board, onVoted }) {
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const max = board.votesPerPerson;
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
          Vote, <bdi>{board.me.username}</bdi>
        </h2>
      </div>
      <p className="muted small mb">
        Pick up to <strong>{max}</strong> question{max > 1 ? 's' : ''} (one vote
        each). Selected {selected.length}/{max}.
      </p>

      {board.questions.map((q) => {
        const isSel = selected.includes(q.id);
        const disabled = !isSel && atLimit;
        return (
          <label
            key={q.id}
            className={`option ${isSel ? 'selected' : ''} ${
              disabled ? 'disabled' : ''
            }`}
          >
            <input
              type="checkbox"
              checked={isSel}
              disabled={disabled}
              onChange={() => toggle(q.id)}
            />
            <span dir="auto" style={{ flex: 1 }}>
              {q.text}
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

function Results({ board, results, joined }) {
  const closed = board.phase === 'closed';
  return (
    <div className="card">
      {joined && board.me?.hasVoted ? (
        <p className="ok">
          ✓ Thanks <bdi>{board.me.username}</bdi>, your vote is in.
        </p>
      ) : closed ? (
        <p>Voting is closed.</p>
      ) : (
        <p>Voting is open — but you haven&apos;t voted yet.</p>
      )}

      {results?.revealed ? (
        <>
          <div className="divider" />
          <h2>Results</h2>
          <div className="muted small mb">
            {results.totalVoted} of {results.totalParticipants} joined have voted
            · open any question to see who voted for it
          </div>
          {results.results.length === 0 ? (
            <p className="muted">No questions were added.</p>
          ) : (
            <Bars results={results.results} />
          )}
        </>
      ) : (
        <p className="muted small mt">
          Results appear here once the organizer closes voting. This page
          updates automatically.
        </p>
      )}
    </div>
  );
}

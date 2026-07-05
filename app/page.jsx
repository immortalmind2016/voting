import Link from 'next/link';

export default function Home() {
  return (
    <main>
      <h1>Votes</h1>
      <p className="muted">
        Create a board, let people join with a username, collect their
        questions, then run a timed vote and see who voted for what.
      </p>

      <div className="card mt">
        <h2>Run a board</h2>
        <p className="muted small">
          Log in as the organizer to create a board and control each phase:
          writing questions, voting, and results.
        </p>
        <Link href="/admin">
          <button>Go to admin</button>
        </Link>
      </div>

      <div className="card">
        <h2>Joining a session?</h2>
        <p className="muted small">
          Open the link the organizer shared with you. No account needed — just
          pick a username.
        </p>
      </div>
    </main>
  );
}

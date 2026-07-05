import Link from 'next/link';

export default function Home() {
  return (
    <main>
      <h1>Votes</h1>
      <p className="muted">
        Create a list of questions or statements, share a link, and let people
        join with a username and cast their votes.
      </p>

      <div className="card mt">
        <h2>Run a poll</h2>
        <p className="muted small">
          Log in as the organizer to create polls, set how many votes each
          person gets, and reveal the results when you&apos;re ready.
        </p>
        <Link href="/admin">
          <button>Go to admin</button>
        </Link>
      </div>

      <div className="card">
        <h2>Voting in a poll?</h2>
        <p className="muted small">
          Open the link the organizer shared with you. No account needed — just
          pick a username and vote.
        </p>
      </div>
    </main>
  );
}

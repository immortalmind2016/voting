import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { isAdmin } from '@/lib/auth';
import { pollPhase } from '@/lib/poll';

// Tallies, including who voted for each question (votes are not anonymous).
// Everyone can see them once voting is closed; the admin can always see them.
export async function GET(request, { params }) {
  const { slug } = params;
  const db = await getDb();
  const poll = await db.collection('polls').findOne({ slug });
  if (!poll) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  const phase = pollPhase(poll);
  const admin = isAdmin();
  if (phase !== 'closed' && !admin) {
    return NextResponse.json({ revealed: false, phase });
  }

  const voters = await db
    .collection('participants')
    .find(
      { pollId: poll._id, hasVoted: true },
      { projection: { username: 1, votes: 1 } }
    )
    .toArray();

  const byOption = {};
  for (const v of voters) {
    for (const optId of v.votes || []) {
      (byOption[optId] ||= []).push(v.username);
    }
  }

  const results = poll.options
    .map((o) => ({
      id: o.id,
      text: o.text,
      addedBy: o.addedBy || null,
      votes: (byOption[o.id] || []).length,
      voters: (byOption[o.id] || []).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => b.votes - a.votes);

  const totalParticipants = await db
    .collection('participants')
    .countDocuments({ pollId: poll._id });

  return NextResponse.json({
    revealed: true,
    title: poll.title,
    phase,
    votesPerPerson: poll.votesPerPerson,
    results,
    totalParticipants,
    totalVoted: voters.length,
  });
}

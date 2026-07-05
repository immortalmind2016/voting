import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { isAdmin } from '@/lib/auth';

// Tallies. Admins can always see them; voters only once results are revealed.
export async function GET(request, { params }) {
  const { slug } = params;
  const db = await getDb();
  const poll = await db.collection('polls').findOne({ slug });
  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
  }

  const admin = isAdmin();
  if (!poll.resultsRevealed && !admin) {
    return NextResponse.json({ revealed: false, status: poll.status });
  }

  const agg = await db
    .collection('participants')
    .aggregate([
      { $match: { pollId: poll._id } },
      { $unwind: '$votes' },
      { $group: { _id: '$votes', count: { $sum: 1 } } },
    ])
    .toArray();
  const counts = Object.fromEntries(agg.map((a) => [a._id, a.count]));

  const results = poll.options
    .map((o) => ({ id: o.id, text: o.text, votes: counts[o.id] || 0 }))
    .sort((a, b) => b.votes - a.votes);

  const totalParticipants = await db
    .collection('participants')
    .countDocuments({ pollId: poll._id });
  const totalVoted = await db
    .collection('participants')
    .countDocuments({ pollId: poll._id, hasVoted: true });

  return NextResponse.json({
    revealed: true,
    title: poll.title,
    status: poll.status,
    votesPerPerson: poll.votesPerPerson,
    results,
    totalParticipants,
    totalVoted,
  });
}

import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/mongodb';
import { isAdmin } from '@/lib/auth';

// Public poll info for the voter page (never includes tallies).
// Also returns the current voter's own state if they've joined.
export async function GET(request, { params }) {
  const { slug } = params;
  const db = await getDb();
  const poll = await db.collection('polls').findOne({ slug });
  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
  }

  let me = null;
  const voterId = cookies().get(`voter_${slug}`)?.value;
  if (voterId && ObjectId.isValid(voterId)) {
    const p = await db.collection('participants').findOne({
      _id: new ObjectId(voterId),
      pollId: poll._id,
    });
    if (p) {
      me = { username: p.username, hasVoted: p.hasVoted, votes: p.votes };
    }
  }

  return NextResponse.json({
    slug: poll.slug,
    title: poll.title,
    description: poll.description || '',
    options: poll.options.map((o) => ({ id: o.id, text: o.text })),
    votesPerPerson: poll.votesPerPerson,
    status: poll.status,
    resultsRevealed: poll.resultsRevealed,
    isAdmin: isAdmin(),
    me,
  });
}

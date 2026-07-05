import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { pollPhase } from '@/lib/poll';

// A voter picks a username and joins the poll. We identify them afterwards
// with an httpOnly cookie so they can't be impersonated from the client.
export async function POST(request, { params }) {
  const { slug } = params;
  const { username } = await request.json().catch(() => ({}));
  const name = String(username || '').trim();

  if (name.length < 1 || name.length > 40) {
    return NextResponse.json(
      { error: 'Username must be 1-40 characters' },
      { status: 400 }
    );
  }

  const db = await getDb();
  const poll = await db.collection('polls').findOne({ slug });
  if (!poll) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }
  if (pollPhase(poll) === 'closed') {
    return NextResponse.json({ error: 'This board is closed' }, { status: 403 });
  }

  const filter = { pollId: poll._id, usernameLower: name.toLowerCase() };
  await db.collection('participants').updateOne(
    filter,
    {
      $setOnInsert: {
        pollId: poll._id,
        username: name,
        usernameLower: name.toLowerCase(),
        votes: [],
        hasVoted: false,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
  const participant = await db.collection('participants').findOne(filter);

  const res = NextResponse.json({
    ok: true,
    username: participant.username,
    hasVoted: participant.hasVoted,
    votes: participant.votes,
  });
  res.cookies.set(`voter_${slug}`, participant._id.toString(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { isAdmin } from '@/lib/auth';
import { pollPhase } from '@/lib/poll';

// List all boards with participation counts (admin only).
export async function GET() {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const db = await getDb();
  const polls = await db
    .collection('polls')
    .find({}, { sort: { createdAt: -1 } })
    .toArray();

  const counts = await db
    .collection('participants')
    .aggregate([
      {
        $group: {
          _id: '$pollId',
          participants: { $sum: 1 },
          voted: { $sum: { $cond: ['$hasVoted', 1, 0] } },
        },
      },
    ])
    .toArray();
  const byPoll = Object.fromEntries(counts.map((c) => [String(c._id), c]));

  const out = polls.map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description || '',
    votesPerPerson: p.votesPerPerson,
    questions: (p.options || []).map((o) => ({
      id: o.id,
      text: o.text,
      addedBy: o.addedBy || null,
    })),
    phase: pollPhase(p),
    timerEndsAt: p.timerEndsAt || null,
    createdAt: p.createdAt,
    participants: byPoll[String(p._id)]?.participants || 0,
    voted: byPoll[String(p._id)]?.voted || 0,
  }));
  return NextResponse.json({ polls: out });
}

// Create a new board (admin only). Questions are added later by participants.
export async function POST(request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();
  const votesPerPerson = Math.max(
    1,
    Math.min(50, parseInt(body.votesPerPerson, 10) || 1)
  );

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const db = await getDb();
  const doc = {
    slug: crypto.randomBytes(5).toString('hex'),
    title,
    description,
    options: [], // questions, added by participants during the questions phase
    votesPerPerson,
    phase: 'lobby',
    timerEndsAt: null,
    createdAt: new Date(),
  };
  await db.collection('polls').insertOne(doc);
  return NextResponse.json({ slug: doc.slug });
}

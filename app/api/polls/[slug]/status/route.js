import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { isAdmin } from '@/lib/auth';
import { PHASES } from '@/lib/poll';

// Admin controls: move the poll between phases and reveal/hide results.
export async function PATCH(request, { params }) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { slug } = params;
  const body = await request.json().catch(() => ({}));

  const db = await getDb();
  const poll = await db.collection('polls').findOne({ slug });
  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
  }

  const update = {};
  if (typeof body.resultsRevealed === 'boolean') {
    update.resultsRevealed = body.resultsRevealed;
  }
  if (body.phase !== undefined) {
    if (!PHASES.includes(body.phase)) {
      return NextResponse.json({ error: 'Invalid phase' }, { status: 400 });
    }
    if (body.phase === 'voting' && poll.options.length < 2) {
      return NextResponse.json(
        { error: 'Add at least two options before starting the vote' },
        { status: 400 }
      );
    }
    update.phase = body.phase;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  await db.collection('polls').updateOne({ _id: poll._id }, { $set: update });
  return NextResponse.json({ ok: true });
}

// Delete a poll and all its ballots (admin only).
export async function DELETE(request, { params }) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { slug } = params;
  const db = await getDb();
  const poll = await db.collection('polls').findOne({ slug });
  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
  }
  await db.collection('participants').deleteMany({ pollId: poll._id });
  await db.collection('polls').deleteOne({ _id: poll._id });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { isAdmin } from '@/lib/auth';
import { PHASES } from '@/lib/poll';

// Admin controls: move the board between phases and set the phase timer.
// The timer is only a countdown shown to everyone — it never advances a phase.
export async function PATCH(request, { params }) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { slug } = params;
  const body = await request.json().catch(() => ({}));

  const db = await getDb();
  const poll = await db.collection('polls').findOne({ slug });
  if (!poll) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  const update = {};

  if (body.phase !== undefined) {
    if (!PHASES.includes(body.phase)) {
      return NextResponse.json({ error: 'Invalid phase' }, { status: 400 });
    }
    if (body.phase === 'voting' && poll.options.length < 1) {
      return NextResponse.json(
        { error: 'There are no questions to vote on yet' },
        { status: 400 }
      );
    }
    update.phase = body.phase;
    // Each phase starts its own timer; clear any leftover from the last one
    // unless a new duration is provided below.
    update.timerEndsAt = null;
  }

  if (body.timerMinutes !== undefined) {
    const m = Number(body.timerMinutes);
    update.timerEndsAt =
      !m || m <= 0 ? null : new Date(Date.now() + Math.min(m, 600) * 60000);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  await db.collection('polls').updateOne({ _id: poll._id }, { $set: update });
  return NextResponse.json({ ok: true });
}

// Delete a board and all its ballots (admin only).
export async function DELETE(request, { params }) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { slug } = params;
  const db = await getDb();
  const poll = await db.collection('polls').findOne({ slug });
  if (!poll) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }
  await db.collection('participants').deleteMany({ pollId: poll._id });
  await db.collection('polls').deleteOne({ _id: poll._id });
  return NextResponse.json({ ok: true });
}

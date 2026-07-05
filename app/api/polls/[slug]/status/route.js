import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { isAdmin } from '@/lib/auth';

// Admin toggles: open/close the poll and reveal/hide results.
export async function PATCH(request, { params }) {
  if (!isAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { slug } = params;
  const body = await request.json().catch(() => ({}));

  const update = {};
  if (typeof body.resultsRevealed === 'boolean') {
    update.resultsRevealed = body.resultsRevealed;
  }
  if (body.status === 'open' || body.status === 'closed') {
    update.status = body.status;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const db = await getDb();
  const res = await db.collection('polls').updateOne({ slug }, { $set: update });
  if (res.matchedCount === 0) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
  }
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

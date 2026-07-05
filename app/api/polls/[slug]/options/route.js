import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/mongodb';
import { isAdmin } from '@/lib/auth';
import { pollPhase } from '@/lib/poll';

const MAX_OPTIONS = 200;

async function currentParticipant(db, poll, slug) {
  const voterId = cookies().get(`voter_${slug}`)?.value;
  if (!voterId || !ObjectId.isValid(voterId)) return null;
  return db.collection('participants').findOne({
    _id: new ObjectId(voterId),
    pollId: poll._id,
  });
}

// A joined participant proposes a new option (only while collecting).
export async function POST(request, { params }) {
  const { slug } = params;
  const { text } = await request.json().catch(() => ({}));
  const value = String(text || '').trim();

  if (value.length < 1 || value.length > 200) {
    return NextResponse.json(
      { error: 'Option must be 1-200 characters' },
      { status: 400 }
    );
  }

  const db = await getDb();
  const poll = await db.collection('polls').findOne({ slug });
  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
  }
  if (pollPhase(poll) !== 'collecting') {
    return NextResponse.json(
      { error: 'Adding options is closed for this poll' },
      { status: 403 }
    );
  }

  const participant = await currentParticipant(db, poll, slug);
  if (!participant) {
    return NextResponse.json({ error: 'Pick a username first' }, { status: 401 });
  }
  if (poll.options.length >= MAX_OPTIONS) {
    return NextResponse.json(
      { error: 'This poll already has the maximum number of options' },
      { status: 409 }
    );
  }
  if (
    poll.options.some((o) => o.text.toLowerCase() === value.toLowerCase())
  ) {
    return NextResponse.json(
      { error: 'That option already exists' },
      { status: 409 }
    );
  }

  const option = {
    id: crypto.randomBytes(4).toString('hex'),
    text: value,
    addedBy: participant.username,
  };
  await db
    .collection('polls')
    .updateOne(
      { _id: poll._id, phase: 'collecting' },
      { $push: { options: option } }
    );
  return NextResponse.json({ ok: true, option });
}

// Remove an option. Admin can remove any; a participant can remove their own
// while the poll is still collecting.
export async function DELETE(request, { params }) {
  const { slug } = params;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing option id' }, { status: 400 });
  }

  const db = await getDb();
  const poll = await db.collection('polls').findOne({ slug });
  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
  }
  const option = poll.options.find((o) => o.id === id);
  if (!option) {
    return NextResponse.json({ error: 'Option not found' }, { status: 404 });
  }

  if (!isAdmin()) {
    if (pollPhase(poll) !== 'collecting') {
      return NextResponse.json(
        { error: 'Options can no longer be changed' },
        { status: 403 }
      );
    }
    const participant = await currentParticipant(db, poll, slug);
    if (!participant || option.addedBy !== participant.username) {
      return NextResponse.json(
        { error: 'You can only remove options you added' },
        { status: 403 }
      );
    }
  }

  await db
    .collection('polls')
    .updateOne({ _id: poll._id }, { $pull: { options: { id } } });
  // Drop any votes that referenced the removed option.
  await db
    .collection('participants')
    .updateMany({ pollId: poll._id }, { $pull: { votes: id } });
  return NextResponse.json({ ok: true });
}

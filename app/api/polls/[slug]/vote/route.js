import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/mongodb';
import { pollPhase } from '@/lib/poll';

// Cast a ballot: up to votesPerPerson DISTINCT options, one vote each.
export async function POST(request, { params }) {
  const { slug } = params;
  const { optionIds } = await request.json().catch(() => ({}));

  const db = await getDb();
  const poll = await db.collection('polls').findOne({ slug });
  if (!poll) {
    return NextResponse.json({ error: 'Poll not found' }, { status: 404 });
  }
  if (pollPhase(poll) !== 'voting') {
    return NextResponse.json(
      { error: 'Voting is not open right now' },
      { status: 403 }
    );
  }

  const voterId = cookies().get(`voter_${slug}`)?.value;
  if (!voterId || !ObjectId.isValid(voterId)) {
    return NextResponse.json(
      { error: 'Pick a username first' },
      { status: 401 }
    );
  }
  const participant = await db.collection('participants').findOne({
    _id: new ObjectId(voterId),
    pollId: poll._id,
  });
  if (!participant) {
    return NextResponse.json(
      { error: 'Pick a username first' },
      { status: 401 }
    );
  }
  if (participant.hasVoted) {
    return NextResponse.json(
      { error: 'You have already voted' },
      { status: 409 }
    );
  }

  const validIds = new Set(poll.options.map((o) => o.id));
  const chosen = [
    ...new Set((Array.isArray(optionIds) ? optionIds : []).filter((id) => validIds.has(id))),
  ];
  if (chosen.length < 1) {
    return NextResponse.json(
      { error: 'Select at least one option' },
      { status: 400 }
    );
  }
  if (chosen.length > poll.votesPerPerson) {
    return NextResponse.json(
      { error: `You can pick at most ${poll.votesPerPerson}` },
      { status: 400 }
    );
  }

  // The hasVoted:false guard makes a double-submit race a no-op.
  const result = await db.collection('participants').updateOne(
    { _id: participant._id, hasVoted: false },
    { $set: { votes: chosen, hasVoted: true, votedAt: new Date() } }
  );
  if (result.modifiedCount === 0) {
    return NextResponse.json(
      { error: 'You have already voted' },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true, votes: chosen });
}

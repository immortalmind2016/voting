// Poll lifecycle: 'collecting' -> 'voting' -> 'closed'.
//   collecting: participants join and add their own options; no voting yet.
//   voting:     options are locked; participants cast ballots.
//   closed:     voting is over.
export const PHASES = ['collecting', 'voting', 'closed'];

// Read a poll's phase, falling back for any docs created before phases existed.
export function pollPhase(poll) {
  if (poll.phase && PHASES.includes(poll.phase)) return poll.phase;
  return poll.status === 'closed' ? 'closed' : 'voting';
}

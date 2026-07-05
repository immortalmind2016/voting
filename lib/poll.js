// Board lifecycle. Every transition is a manual admin action — timers are
// only a visible countdown and never advance the phase automatically.
//   lobby     : people join with a username; nothing else yet.
//   questions : participants write questions (the votable items).
//   review    : question-writing closed; questions locked, voting not started.
//   voting    : participants vote on the questions.
//   closed    : voting over; results and voter lists are visible to everyone.
export const PHASES = ['lobby', 'questions', 'review', 'voting', 'closed'];

export const PHASE_LABEL = {
  lobby: 'lobby',
  questions: 'writing questions',
  review: 'questions closed',
  voting: 'voting open',
  closed: 'closed',
};

// Read a board's phase, normalizing any docs from earlier versions.
export function pollPhase(poll) {
  const p = poll.phase;
  if (PHASES.includes(p)) return p;
  if (p === 'collecting') return 'questions';
  if (p === 'open' || poll.status === 'open') return 'voting';
  if (poll.status === 'closed') return 'closed';
  return 'lobby';
}

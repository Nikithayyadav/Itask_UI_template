export type ReviewDecision = 'Approve' | 'Request changes' | 'Reject';
export type ReviewState = 'In review' | 'Approved' | 'Changes requested' | 'Rejected';

export function reviewState(decision: ReviewDecision): ReviewState {
  if (decision === 'Approve') return 'Approved';
  if (decision === 'Reject') return 'Rejected';
  return 'Changes requested';
}

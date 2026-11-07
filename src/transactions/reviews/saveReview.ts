import type { Profile } from '../../app/types';
import type { ReviewRecord } from '../../features/reviews/types';

export function reviewFromForm(data:FormData,profile:Profile):ReviewRecord {
  return { id:`REV-${Date.now()}`,decision:String(data.get('decision')) as ReviewRecord['decision'],notes:String(data.get('note')).trim(),reviewer:profile.fullName,reviewedAt:new Date().toISOString() };
}

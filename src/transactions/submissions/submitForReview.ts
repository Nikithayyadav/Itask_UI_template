import type { Profile } from '../../app/types';
import type { Submission } from '../../features/submissions/types';

export function submissionFromForm(data:FormData,profile:Profile):Submission {
  return { id:`SUB-${Date.now()}`,taskTitle:String(data.get('task')),note:String(data.get('note')).trim(),submittedBy:profile.fullName,submittedAt:new Date().toISOString() };
}

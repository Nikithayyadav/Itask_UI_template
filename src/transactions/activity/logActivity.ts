import type { Profile } from '../../app/types';
import type { ActivityEntry } from '../../features/activity/types';

export function activityFromForm(data:FormData,profile:Profile):ActivityEntry {
  return { id:`ACT-${Date.now()}`,summary:String(data.get('name')).trim(),details:String(data.get('details')).trim(),createdBy:profile.fullName,createdAt:new Date().toISOString() };
}

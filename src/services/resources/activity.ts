import { api } from '../api';
import type { ActivityEntry } from '../../features/activity/types';

export const activityService={list:()=>api.list<ActivityEntry>('activity'),create:(entry:ActivityEntry)=>api.save('activity',entry)};

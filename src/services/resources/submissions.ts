import { api } from '../api';
import type { Submission } from '../../features/submissions/types';

export const submissionService={list:()=>api.list<Submission>('submissions'),create:(submission:Submission)=>api.save('submissions',submission)};

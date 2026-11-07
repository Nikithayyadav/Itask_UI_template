import { api } from '../api';
import type { ReviewRecord } from '../../features/reviews/types';

export const reviewService={list:()=>api.list<ReviewRecord>('reviews'),create:(review:ReviewRecord)=>api.save('reviews',review)};

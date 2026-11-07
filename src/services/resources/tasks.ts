import { api } from '../api';
import type { Task } from '../../features/tasks/types';

export const taskService={
  list:()=>api.list<Task>('tasks'),
  create:(task:Task)=>api.save('tasks',task),
  update:(task:Task)=>api.save('tasks',task),
};

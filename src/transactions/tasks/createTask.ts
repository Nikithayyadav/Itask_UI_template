import type { Task } from '../../features/tasks/types';

function displayDate(value:string) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '';
}

export function createTaskFromForm(data:FormData,nextId:string,ownerName:string):Task {
  return {
    id:nextId,
    title:String(data.get('name')).trim(),
    project:String(data.get('project')),
    due:displayDate(String(data.get('due'))),
    status:'To do',
    priority:String(data.get('priority')) as Task['priority'],
    progress:0,
    initials:ownerName.split(' ').map(part=>part[0]).slice(0,2).join(''),
  };
}

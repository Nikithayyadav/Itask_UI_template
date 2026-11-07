import type { Project } from '../../features/projects/types';

function displayDate(value:string) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '';
}

export function createProjectFromForm(data:FormData,nextCode:string):Project {
  return {
    code:String(data.get('code')||nextCode).trim(),
    name:String(data.get('name')).trim(),
    client:String(data.get('team') ?? data.get('client') ?? '').trim(),
    start:displayDate(String(data.get('start'))),
    end:displayDate(String(data.get('end'))),
    status:(String(data.get('status') || 'On track')) as Project['status'],
    progress:0,
    tasks:0,
    color:'#5678e8',
    owner:String(data.get('owner')),
    priority:String(data.get('priority')),
    description:String(data.get('description')),
  };
}

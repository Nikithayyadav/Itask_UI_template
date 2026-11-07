import type { FormEvent } from 'react';
import type { Task } from './types';
import type { Project } from '../projects/types';
import { ConfiguredFields } from '../../components/ui/ConfiguredFields';
import { ConfiguredTable } from '../../components/ui/ConfiguredTable';
import { getFilterDefinition, getFormDefinition, getStatusConfiguration, getTableDefinition } from '../../engine/ConfigLoader';
import type { TransactionFormOptions } from '../../types/config.types';

export function TaskPanel({
  rows,
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  pageNo,
  setPageNo,
  updateTask,
  canUpdateProgress,
}: {
  rows: Task[];
  query: string;
  setQuery: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  priorityFilter: string;
  setPriorityFilter: (value: string) => void;
  pageNo: number;
  setPageNo: (page: number) => void;
  updateTask: (id: string, change: Partial<Task>) => void;
  canUpdateProgress: boolean;
}) {
  const table = getTableDefinition('tasks');
  const filters = getFilterDefinition('tasks');
  if (!table || !filters) throw new Error('Task table configuration is missing.');
  const statusDefinition = filters.filters.find(filter => filter.field === 'status');
  const priorityDefinition = filters.filters.find(filter => filter.field === 'priority');
  if (!statusDefinition || !priorityDefinition) throw new Error('Task filter configuration is missing.');

  return <section className="panel table-panel task-panel">
    <div className="table-toolbar">
      <label className="table-search"><span>⌕</span><input placeholder={filters.search_placeholder} value={query} onChange={event => setQuery(event.target.value)}/><kbd>⌘ F</kbd></label>
      <label className="table-filter-control"><span>{statusFilter === statusDefinition.all_label ? statusDefinition.label : statusFilter}</span><select aria-label={statusDefinition.label} value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
        <option value={statusDefinition.all_label}>{statusDefinition.all_label}</option>
        {statusDefinition.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select></label>
      <label className="table-filter-control"><span>{priorityFilter === priorityDefinition.all_label ? priorityDefinition.label : priorityFilter}</span><select aria-label={priorityDefinition.label} value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)}>
        <option value={priorityDefinition.all_label}>{priorityDefinition.all_label}</option>
        {priorityDefinition.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select></label>
    </div>
    <ConfiguredTable
      definition={table}
      rows={rows}
      pageNo={pageNo}
      setPageNo={setPageNo}
      itemLabel="tasks"
      rowKey={task => task.id}
      renderHeader={column => column.key === 'selection'
        ? <input type="checkbox" aria-label="Select all tasks"/>
        : column.label}
      renderCell={(task, column) => {
        switch (column.key) {
          case 'selection':
            return <input type="checkbox" aria-label={`Select ${task.title}`}/>;
          case 'title':
            return <div className="task-title-cell"><b>{task.title}</b><small>{task.id}</small></div>;
          case 'project': return task.project;
          case 'due': return task.due;
          case 'priority': {
            const priority = getStatusConfiguration('priorities').find(item => item.value === task.priority);
            return <span className={`priority ${task.priority.toLowerCase()}`} style={priority ? { color: priority.color } : undefined}><i/>{priority?.label ?? task.priority}</span>;
          }
          case 'progress':
            return <><div className="table-progress"><span><i style={{ width: `${task.progress}%` }}/></span><small>{task.progress}%</small></div>{canUpdateProgress && <input className="progress-range" aria-label={`Update progress for ${task.title}`} type="range" min="0" max="100" step="5" value={task.progress} onChange={event => updateTask(task.id, { progress: Number(event.target.value) })}/>}</>;
          case 'status': {
            const statuses = getStatusConfiguration('tasks');
            const currentStatus = statuses.find(item => item.value === task.status);
            return <select aria-label={`Update status for ${task.title}`} className={`status-select ${task.status.toLowerCase().replace(' ', '-')}`} style={currentStatus ? { color: currentStatus.color, backgroundColor: currentStatus.background } : undefined} value={task.status} onChange={event => {
              const nextStatus = statuses.find(status => status.value === event.target.value);
              updateTask(task.id, { status: event.target.value as Task['status'], progress: nextStatus?.completes_progress ? 100 : task.progress });
            }}>
              {statuses.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>;
          }
          default: return null;
        }
      }}
    />
  </section>;
}

export function CreateTaskPage({
  projects,
  formData,
  onCancel,
  onSubmit,
}: {
  projects: Project[];
  formData?: TransactionFormOptions;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const definition = getFormDefinition('taskCreate');
  if (!definition || !formData?.priorities?.length) throw new Error('Task creation form configuration is missing.');

  return <form className="create-project-page" onSubmit={onSubmit}>
    <section className="panel create-project-section">
      <div className="create-section-heading"><div><span className="section-step">TASK SETUP</span><h2>Task details</h2><p>Add the work item, connect it to a project, and set its due date and priority.</p></div></div>
      <div className="create-project-fields"><ConfiguredFields
        fields={definition.fields}
        values={{ project: projects[0]?.name ?? '', defaultPriority: formData.defaultPriority }}
        optionsByKey={{ projects: projects.map(project => project.name), priorities: formData.priorities }}
      /></div>
      <div className="create-project-actions"><span><i/> Required fields</span><div><button type="button" className="secondary-btn" onClick={onCancel}>Cancel</button><button type="submit" className="primary-btn">＋ Create task <span>→</span></button></div></div>
    </section>
  </form>;
}

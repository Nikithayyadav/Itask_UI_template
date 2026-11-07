import type { Task } from '../tasks/types';
import { ConfiguredFields } from '../../components/ui/ConfiguredFields';
import { getFormDefinition } from '../../engine/ConfigLoader';

export function SubmissionFields({tasks}:{tasks:Task[]}) {
  const definition = getFormDefinition('submission');
  if (!definition) throw new Error('Submission form configuration is missing.');
  return <ConfiguredFields fields={definition.fields} optionsByKey={{ tasks: tasks.map(task => task.title) }} values={{ task: tasks[0]?.title ?? '' }}/>;
}

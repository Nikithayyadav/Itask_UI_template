import type { Project } from '../projects/types';
import { ConfiguredFields } from '../../components/ui/ConfiguredFields';
import { getFormDefinition, getStatusConfiguration } from '../../engine/ConfigLoader';

export function QuickTaskFields({projects}:{projects:Project[]}) {
  const definition = getFormDefinition('quickTask');
  if (!definition) throw new Error('Quick task form configuration is missing.');
  const priorities = getStatusConfiguration('priorities').map(item => ({ value: item.value, label: item.label }));
  return <ConfiguredFields fields={definition.fields} optionsByKey={{ projects: projects.map(project => project.name), priorities }} values={{ project: projects[0]?.name ?? '' }}/>;
}

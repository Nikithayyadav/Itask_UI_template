import { ConfiguredFields } from '../../components/ui/ConfiguredFields';
import { getFormDefinition } from '../../engine/ConfigLoader';

export function DailyActivityFields() {
  const definition = getFormDefinition('activity');
  if (!definition) throw new Error('Activity form configuration is missing.');
  return <ConfiguredFields fields={definition.fields}/>;
}

import { ConfiguredFields } from '../../components/ui/ConfiguredFields';
import { getFormDefinition } from '../../engine/ConfigLoader';

export function ReviewFields() {
  const definition = getFormDefinition('review');
  if (!definition) throw new Error('Review form configuration is missing.');
  return <ConfiguredFields fields={definition.fields}/>;
}

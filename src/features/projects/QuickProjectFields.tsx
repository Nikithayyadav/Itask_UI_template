import { ConfiguredFields } from '../../components/ui/ConfiguredFields';
import { getFormDefinition } from '../../engine/ConfigLoader';

export function QuickProjectFields() {
  const definition = getFormDefinition('quickProject');
  if (!definition) throw new Error('Quick project form configuration is missing.');
  return <ConfiguredFields fields={definition.fields}/>;
}

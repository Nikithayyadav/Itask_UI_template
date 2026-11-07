import type { Profile } from '../../app/types';
import { initials } from '../../app/helpers';
import { ConfiguredFields } from '../../components/ui/ConfiguredFields';
import { getFormDefinition } from '../../engine/ConfigLoader';

export function ProfileSettingsFields({profile}:{profile:Profile}) {
  const definition = getFormDefinition('profile');
  if (!definition) throw new Error('Profile form configuration is missing.');
  return <><div className="profile-edit-header"><span className="avatar avatar-user">{initials(profile.fullName)}</span><div><b>Personal information</b><small>Update the details shown in your workspace</small></div></div><div className="profile-fields-grid"><ConfiguredFields fields={definition.fields} values={profile}/></div></>;
}

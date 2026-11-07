import type { Profile } from '../../app/types';

export function profileFromForm(data:FormData):Profile {
  return {
    fullName:String(data.get('fullName')).trim(),
    email:String(data.get('email')).trim(),
    jobTitle:String(data.get('jobTitle')).trim(),
    phone:String(data.get('phone')).trim(),
    location:String(data.get('location')).trim(),
    timezone:String(data.get('timezone')),
    about:String(data.get('about')).trim(),
  };
}

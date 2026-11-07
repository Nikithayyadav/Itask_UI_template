import { Field } from './Field';
import type { FormFieldDefinition, SelectOption } from '../../types/config.types';

type FieldValue = string | number | undefined;
type ConfiguredFieldsProps = {
  fields: FormFieldDefinition[];
  values?: object;
  optionsByKey?: Record<string, Array<string | SelectOption>>;
};

function optionValue(option: string | SelectOption): SelectOption {
  return typeof option === 'string' ? { value: option, label: option } : option;
}

export function ConfiguredFields({ fields, values = {}, optionsByKey = {} }: ConfiguredFieldsProps) {
  return <>{fields.map(field => {
    const namedValue = Reflect.get(values, field.name) as FieldValue;
    const defaultValue = field.default_value_key
      ? Reflect.get(values, field.default_value_key) as FieldValue
      : field.default_value ?? namedValue;

    if (field.type === 'select') {
      const options = field.options ?? optionsByKey[field.options_key ?? ''] ?? [];
      return <label className={`field-label ${field.class_name ?? ''}`} key={field.name}>
        {field.label}
        <select name={field.name} required={field.required} disabled={field.read_only} defaultValue={defaultValue ?? ''}>
          {field.placeholder && <option value="" disabled>{field.placeholder}</option>}
          {options.map(option => {
            const resolved = optionValue(option);
            return <option key={resolved.value} value={resolved.value}>{resolved.label}</option>;
          })}
        </select>
      </label>;
    }

    if (field.type === 'textarea') {
      return <label className={`field-label ${field.class_name ?? ''}`} key={field.name}>
        {field.label}
        <textarea
          name={field.name}
          placeholder={field.placeholder}
          required={field.required}
          readOnly={field.read_only}
          rows={field.rows ?? 3}
          defaultValue={defaultValue}
        />
      </label>;
    }

    if (field.type === 'file') {
      return <label className={`upload-field ${field.class_name ?? ''}`} key={field.name}>
        ▧<b>{field.label}</b><small>{field.description}</small>
        <input name={field.name} type="file" required={field.required}/>
      </label>;
    }

    return <Field
      key={field.name}
      label={field.label}
      name={field.name}
      placeholder={field.placeholder}
      type={field.type}
      required={field.required}
      readOnly={field.read_only}
      defaultValue={defaultValue === undefined ? undefined : String(defaultValue)}
      className={field.class_name}
    />;
  })}</>;
}

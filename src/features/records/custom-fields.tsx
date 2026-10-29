import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';

import { ChoiceChips } from '@/components/choice-chips';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  fieldLabel,
  type ListMetadata,
  type ListField,
} from '@/features/records/list';
import { shownValue } from '@/features/records/revisions';

/** The tenant's custom fields of a record type (`custom.<key>` in the list metadata). */
export function customFields(metadata: ListMetadata | undefined): ListField[] {
  return (metadata?.fields ?? []).filter((field) => field.custom);
}

const keyOf = (field: ListField) => field.name.replace(/^custom\./, '');

/** A record's custom values, labelled; nothing when it has none. */
export function CustomFieldsView({
  metadata,
  values,
}: {
  metadata: ListMetadata | undefined;
  values: Record<string, unknown> | undefined;
}) {
  const fields = customFields(metadata).filter(
    (field) =>
      values?.[keyOf(field)] !== undefined && values[keyOf(field)] !== null,
  );
  if (!fields.length) {
    return null;
  }
  return (
    <View style={styles.list}>
      {fields.map((field) => (
        <ThemedText key={field.name} type="small">
          <ThemedText type="smallBold">{fieldLabel(field)}: </ThemedText>
          {shownValue(values?.[keyOf(field)])}
        </ThemedText>
      ))}
    </View>
  );
}

/**
 * Text as typed into a custom field, as the API takes it: a number, a
 * boolean, or the text (dates as YYYY-MM-DD); empty is null (removes it).
 */
export function toCustomValue(
  field: Pick<ListField, 'type'>,
  text: string,
): unknown {
  if (text.trim() === '') {
    return null;
  }
  if (field.type === 'number') {
    const number = Number(text.replace(',', '.'));
    return Number.isFinite(number) ? number : text;
  }
  return text.trim();
}

/** Inputs for a record type's custom fields, typed by the metadata. */
export function CustomFieldsInputs({
  metadata,
  values,
  onChange,
}: {
  metadata: ListMetadata | undefined;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
}) {
  const { t } = useTranslation();
  const fields = customFields(metadata);
  if (!fields.length) {
    return null;
  }
  const set = (field: ListField, value: unknown) =>
    onChange({ ...values, [keyOf(field)]: value });

  return (
    <View style={styles.list}>
      {fields.map((field) => {
        const value = values[keyOf(field)];
        const label = fieldLabel(field);
        if (field.type === 'boolean') {
          return (
            <View key={field.name} style={styles.switch}>
              <ThemedText>{label}</ThemedText>
              <Switch
                accessibilityLabel={label}
                value={value === true}
                onValueChange={(on) => set(field, on)}
              />
            </View>
          );
        }
        if (field.type === 'enum' && field.options?.length) {
          return (
            <View key={field.name} style={styles.list}>
              <ThemedText type="smallBold">{label}</ThemedText>
              <ChoiceChips
                accessibilityLabel={label}
                value={typeof value === 'string' ? value : ''}
                onChange={(choice) => set(field, choice || null)}
                choices={[
                  { value: '', label: t('filters.none') },
                  ...field.options.map((option) => ({
                    value: option,
                    label: option,
                  })),
                ]}
              />
            </View>
          );
        }
        return (
          <TextField
            key={field.name}
            label={label}
            value={value === null || value === undefined ? '' : String(value)}
            onChangeText={(text) => set(field, toCustomValue(field, text))}
            placeholder={
              field.type === 'date'
                ? 'YYYY-MM-DD'
                : field.type === 'datetime'
                  ? 'YYYY-MM-DDTHH:MM:SSZ'
                  : undefined
            }
            keyboardType={field.type === 'number' ? 'decimal-pad' : 'default'}
            autoCapitalize={field.type === 'string' ? 'sentences' : 'none'}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  switch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

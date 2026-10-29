import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { apiErrorMessage } from '@/features/auth/errors';
import {
  chipFields,
  fieldLabel,
  useApplyView,
  useDeleteView,
  useSaveView,
  useViews,
  type ListMetadata,
  type ListQuery,
} from '@/features/records/list';

/**
 * A tap filter per enum or yes/no field the list offers (custom ones
 * included), built from the list's metadata: nothing hard-coded per feature.
 */
export function ListFilters({
  metadata,
  query,
  onChange,
}: {
  metadata: ListMetadata | undefined;
  query: ListQuery;
  onChange: (query: ListQuery) => void;
}) {
  const { t } = useTranslation();
  const set = (name: string, value: string) => {
    const next = { ...query };
    if (value) {
      next[name] = value;
    } else {
      delete next[name];
    }
    onChange(next);
  };
  return (
    <>
      {chipFields(metadata).map((field) => {
        const options =
          field.type === 'boolean'
            ? [
                { value: 'true', label: t('filters.yes') },
                { value: 'false', label: t('filters.no') },
              ]
            : (field.options ?? []).map((option) => ({
                value: option,
                label: field.custom
                  ? option
                  : t(`filters.values.${option}`, { defaultValue: option }),
              }));
        return (
          <View key={field.name} style={styles.field}>
            <ThemedText type="small" themeColor="textSecondary">
              {field.custom
                ? fieldLabel(field)
                : t(`filters.fields.${field.name}`, {
                    defaultValue: fieldLabel(field),
                  })}
            </ThemedText>
            <ChoiceChips
              accessibilityLabel={fieldLabel(field)}
              value={query[field.name] ?? ''}
              onChange={(value) => set(field.name, value)}
              choices={[{ value: '', label: t('filters.all') }, ...options]}
            />
          </View>
        );
      })}
    </>
  );
}

/**
 * Saved views of the list (yours, your units', the tenant's): tap one to
 * apply it, or save the current filters as a new one.
 */
export function ViewsBar({
  subject,
  query,
  activeId,
  onApply,
}: {
  subject: string;
  query: ListQuery;
  activeId: string | null;
  onApply: (id: string | null, query: ListQuery) => void;
}) {
  const { t } = useTranslation();
  const views = useViews(subject);
  const apply = useApplyView();
  const save = useSaveView(subject);
  const remove = useDeleteView(subject);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const items = views.data?.items ?? [];
  const error = apply.error ?? save.error ?? remove.error;

  return (
    <View style={styles.field}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ChoiceChips
          accessibilityLabel={t('views.title')}
          value={activeId ?? ''}
          disabled={apply.isPending}
          choices={[
            { value: '', label: t('views.none') },
            ...items.map((view) => ({ value: view.id, label: view.name })),
          ]}
          onChange={(id) => {
            if (!id) {
              onApply(null, {});
              return;
            }
            apply.mutate(id, {
              // `fields=` picks columns: a phone row shows its own.
              onSuccess: ({ params: { fields: _fields, ...params } }) =>
                onApply(id, params),
            });
          }}
        />
      </ScrollView>
      {naming ? (
        <View style={styles.save}>
          <TextField
            label={t('views.name')}
            value={name}
            onChangeText={setName}
            autoFocus
          />
          <View style={styles.row}>
            <Button
              title={t('sessions.cancel')}
              variant="secondary"
              onPress={() => setNaming(false)}
            />
            <Button
              title={t('views.save')}
              loading={save.isPending}
              disabled={!name.trim()}
              onPress={() =>
                save.mutate(
                  { name: name.trim(), query },
                  {
                    onSuccess: (view) => {
                      setNaming(false);
                      setName('');
                      onApply(view.id, query);
                    },
                  },
                )
              }
            />
          </View>
        </View>
      ) : (
        <View style={styles.row}>
          <Button
            title={t('views.saveCurrent')}
            variant="secondary"
            disabled={Object.keys(query).length === 0}
            onPress={() => setNaming(true)}
          />
          {activeId && items.find((view) => view.id === activeId)?.editable && (
            <Button
              title={t('views.delete')}
              variant="secondary"
              loading={remove.isPending}
              onPress={() =>
                Alert.alert(t('views.deleteTitle'), undefined, [
                  { text: t('sessions.cancel'), style: 'cancel' },
                  {
                    text: t('views.delete'),
                    style: 'destructive',
                    onPress: () =>
                      remove.mutate(activeId, {
                        onSuccess: () => onApply(null, {}),
                      }),
                  },
                ])
              }
            />
          )}
        </View>
      )}
      {error && (
        <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
          {apiErrorMessage(error, t)}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.one,
  },
  save: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});

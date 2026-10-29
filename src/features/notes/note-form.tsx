import { useForm, useStore } from '@tanstack/react-form';
import { useNavigation, usePreventRemove } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { Button } from '@/components/button';
import { feedback } from '@/components/feedback';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import {
  apiErrorMessage,
  fieldError,
  firstError,
} from '@/features/auth/errors';
import { isConflict, type NoteInput } from '@/features/notes/hooks';
import { CustomFieldsInputs } from '@/features/records/custom-fields';
import { useListMetadata } from '@/features/records/list';

/** Title and body, for a new note and an edit; the API's field errors under their fields. */
export function NoteForm({
  initial,
  submitTitle,
  pending,
  error,
  onSubmit,
}: {
  initial: NoteInput;
  submitTitle: string;
  pending: boolean;
  error: unknown;
  onSubmit: (input: NoteInput) => Promise<unknown>;
}) {
  const { t } = useTranslation();
  const metadata = useListMetadata('Note');
  // Custom fields come from the metadata at runtime: kept beside the form.
  const [custom, setCustom] = useState<Record<string, unknown>>(
    initial.custom ?? {},
  );
  const form = useForm({
    defaultValues: { title: initial.title, body: initial.body },
    validators: {
      onSubmit: z.object({
        title: z
          .string()
          .trim()
          .min(1, { error: t('validation.required') }),
        body: z.string(),
      }),
    },
    onSubmit: async ({ value }) => {
      // Saving navigates away: let that through the unsaved-changes guard.
      saved.current = true;
      await onSubmit({
        title: value.title.trim(),
        body: value.body,
        ...(Object.keys(custom).length > 0 && { custom }),
      })
        .then(() => feedback.success())
        .catch(() => {
          saved.current = false;
        });
    },
  });

  // Leaving with unsaved changes (back, a swipe, a tab) asks first.
  const navigation = useNavigation();
  const saved = useRef(false);
  const formDirty = useStore(form.store, (state) => state.isDirty);
  const dirty =
    formDirty ||
    JSON.stringify(custom) !== JSON.stringify(initial.custom ?? {});
  usePreventRemove(dirty, ({ data }) => {
    if (saved.current) {
      navigation.dispatch(data.action);
      return;
    }
    feedback.warning();
    Alert.alert(t('unsaved.title'), t('unsaved.body'), [
      { text: t('unsaved.keep'), style: 'cancel' },
      {
        text: t('unsaved.discard'),
        style: 'destructive',
        onPress: () => navigation.dispatch(data.action),
      },
    ]);
  });

  return (
    <>
      <form.Field name="title">
        {(field) => (
          <TextField
            label={t('notes.title')}
            value={field.state.value}
            onChangeText={field.handleChange}
            onBlur={field.handleBlur}
            error={
              firstError(field.state.meta.errors) ?? fieldError(error, 'title')
            }
            returnKeyType="next"
          />
        )}
      </form.Field>
      <form.Field name="body">
        {(field) => (
          <TextField
            label={t('notes.body')}
            value={field.state.value}
            onChangeText={field.handleChange}
            onBlur={field.handleBlur}
            error={fieldError(error, 'body')}
            multiline
            style={{ minHeight: 160, textAlignVertical: 'top' }}
          />
        )}
      </form.Field>
      <CustomFieldsInputs
        metadata={metadata.data}
        values={custom}
        onChange={setCustom}
      />
      {Boolean(error) &&
        !isConflict(error) &&
        !fieldError(error, 'title') &&
        !fieldError(error, 'body') && (
          <ThemedText themeColor="danger" accessibilityRole="alert">
            {apiErrorMessage(error, t)}
          </ThemedText>
        )}
      <Button
        title={submitTitle}
        loading={pending}
        onPress={() => form.handleSubmit()}
      />
    </>
  );
}

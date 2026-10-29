import { useForm } from '@tanstack/react-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { Button } from '@/components/button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import {
  apiErrorMessage,
  fieldError,
  firstError,
} from '@/features/auth/errors';
import { isConflict, type NoteInput } from '@/features/notes/hooks';

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
  const form = useForm({
    defaultValues: initial,
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
      await onSubmit({ title: value.title.trim(), body: value.body }).catch(
        () => null,
      );
    },
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

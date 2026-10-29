import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import type { Present } from '@/features/work/presence';

/** "Also here: Maya" / "Maya editing": who else is on the record now. */
export function PresenceLine({ others }: { others: Present[] }) {
  const { t } = useTranslation();
  if (others.length === 0) {
    return null;
  }
  const editing = others.filter((person) => person.mode === 'editing');
  const viewing = others.filter((person) => person.mode !== 'editing');
  const names = (people: Present[]) =>
    people.map((person) => person.name).join(', ');
  return (
    <ThemedText
      type="small"
      themeColor="textSecondary"
      accessibilityLiveRegion="polite"
    >
      {[
        editing.length
          ? t('presence.editing', { names: names(editing) })
          : null,
        viewing.length
          ? t('presence.viewing', { names: names(viewing) })
          : null,
      ]
        .filter(Boolean)
        .join(' · ')}
    </ThemedText>
  );
}

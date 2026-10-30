import { useTranslation } from 'react-i18next';

import { ListRow } from '@/components/list-row';
import { Screen } from '@/components/screen';
import {
  APPEARANCES,
  saveAppearance,
  useAppearance,
} from '@/features/account/appearance';

/** Light, dark, or as the phone is: on this device. */
export default function AppearanceScreen() {
  const { t } = useTranslation();
  const mode = useAppearance();
  return (
    <Screen>
      {APPEARANCES.map((choice) => (
        <ListRow
          key={choice}
          title={t(`appearance.${choice}`)}
          selected={mode === choice}
          onPress={() => saveAppearance(choice)}
        />
      ))}
    </Screen>
  );
}

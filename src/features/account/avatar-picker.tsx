import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useRemoveAvatar, useUploadAvatar } from '@/features/account/lifecycle';
import { apiErrorMessage } from '@/features/auth/errors';
import { useTheme } from '@/hooks/use-theme';

const SIZE = 72;

/** The account's picture: tap to choose one from the photo library, or remove it. */
export function AvatarPicker({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const upload = useUploadAvatar();
  const remove = useRemoveAvatar();
  const busy = upload.isPending || remove.isPending;

  async function choose() {
    // The system photo picker: no permission prompt needed to pick one photo.
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    const asset = picked.canceled ? undefined : picked.assets[0];
    if (asset) {
      upload.mutate(asset.uri);
    }
  }

  const error = upload.error ?? remove.error;
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('avatar.change')}
        onPress={choose}
        disabled={busy}
        style={[styles.circle, { backgroundColor: theme.backgroundElement }]}
      >
        {busy ? (
          <ActivityIndicator />
        ) : avatarUrl ? (
          <Image source={avatarUrl} style={styles.image} contentFit="cover" />
        ) : (
          <ThemedText type="subtitle">
            {name.trim().charAt(0).toUpperCase()}
          </ThemedText>
        )}
      </Pressable>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={choose} disabled={busy}>
          <ThemedText type="linkPrimary">{t('avatar.change')}</ThemedText>
        </Pressable>
        {avatarUrl && (
          <Pressable
            accessibilityRole="button"
            onPress={() => remove.mutate()}
            disabled={busy}
          >
            <ThemedText type="linkPrimary">{t('avatar.remove')}</ThemedText>
          </Pressable>
        )}
        {error && (
          <ThemedText type="small" themeColor="danger">
            {apiErrorMessage(error, t)}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: SIZE,
    height: SIZE,
  },
  actions: {
    flex: 1,
    gap: Spacing.one,
  },
});

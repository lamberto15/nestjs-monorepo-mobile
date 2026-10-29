import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export type ListRowProps = {
  title: string;
  subtitle?: string;
  /** Shown at the row's end (a value, a badge). */
  detail?: ReactNode;
  /** A leading mark, such as an unread dot. */
  leading?: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
};

/** A tappable row of a list or a settings screen. */
export function ListRow({
  title,
  subtitle,
  detail,
  leading,
  onPress,
  disabled,
}: ListRowProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={disabled || !onPress}
    >
      {({ pressed }) => (
        <ThemedView
          type={pressed ? 'backgroundSelected' : 'backgroundElement'}
          style={styles.row}
        >
          {leading}
          <View style={styles.text}>
            <ThemedText>{title}</ThemedText>
            {subtitle ? (
              <ThemedText type="small" themeColor="textSecondary">
                {subtitle}
              </ThemedText>
            ) : null}
          </View>
          {typeof detail === 'string' ? (
            <ThemedText type="small" themeColor="textSecondary">
              {detail}
            </ThemedText>
          ) : (
            detail
          )}
        </ThemedView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

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
  /** The chosen one of a list (a check mark, announced as selected). */
  selected?: boolean;
  /** What a screen reader says, when the visible text isn't enough (e.g. "Unread"). */
  accessibilityLabel?: string;
};

/** A tappable row of a list or a settings screen. */
export function ListRow({
  title,
  subtitle,
  detail,
  leading,
  onPress,
  disabled,
  selected,
  accessibilityLabel,
}: ListRowProps) {
  // At the largest text sizes a row stacks: the title gets the full width
  // instead of breaking mid-word beside its detail.
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale >= STACK_AT;
  const content = (
    <>
      {leading}
      <View style={styles.text}>
        <ThemedText>{title}</ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {selected && <ThemedText themeColor="link">✓</ThemedText>}
    </>
  );
  const pressable = {
    accessibilityRole: onPress ? ('button' as const) : undefined,
    accessibilityLabel,
    accessibilityState: selected === undefined ? undefined : { selected },
    onPress,
    disabled: disabled || !onPress,
  };

  // A control at the end (a button) sits beside the pressable part, not in
  // it: a screen reader reaches each on its own.
  if (detail !== undefined && typeof detail !== 'string') {
    return (
      <ThemedView
        type="backgroundElement"
        style={[styles.row, stacked && styles.stacked]}
      >
        <Pressable
          {...pressable}
          style={({ pressed }) => [
            styles.main,
            stacked && styles.stacked,
            pressed && styles.pressed,
          ]}
        >
          {content}
        </Pressable>
        {detail}
      </ThemedView>
    );
  }
  return (
    <Pressable {...pressable}>
      {({ pressed }) => (
        <ThemedView
          type={pressed ? 'backgroundSelected' : 'backgroundElement'}
          style={[styles.row, stacked && styles.stacked]}
        >
          {content}
          {detail ? (
            <ThemedText type="small" themeColor="textSecondary">
              {detail}
            </ThemedText>
          ) : null}
        </ThemedView>
      )}
    </Pressable>
  );
}

/** The system text size from which rows stack. */
const STACK_AT = 1.6;

const styles = StyleSheet.create({
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.6,
  },
  stacked: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
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

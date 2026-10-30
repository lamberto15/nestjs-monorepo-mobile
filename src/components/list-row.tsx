import {
  createContext,
  Children,
  Fragment,
  useContext,
  type ReactNode,
} from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FadeIn } from '@/components/fade-in';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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

/** Inside a `ListGroup` the rows share its surface and its dividers. */
const InGroup = createContext(false);

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
  const theme = useTheme();
  const grouped = useContext(InGroup);
  // At the largest text sizes a row stacks: the title gets the full width
  // instead of breaking mid-word beside its detail.
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale >= STACK_AT;
  // A row that opens something says so with a chevron, as on the system's
  // own lists. Choices (`selected`) and rows with a detail don't.
  const navigates = Boolean(onPress) && selected === undefined && !detail;
  const content = (
    <>
      {leading}
      <View style={styles.text}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {selected && <ThemedText themeColor="link">✓</ThemedText>}
      {navigates && !stacked && (
        <ThemedText
          style={styles.chevron}
          themeColor="textSecondary"
          accessible={false}
        >
          ›
        </ThemedText>
      )}
    </>
  );
  const pressable = {
    accessibilityRole: onPress ? ('button' as const) : undefined,
    accessibilityLabel,
    accessibilityState: selected === undefined ? undefined : { selected },
    onPress,
    disabled: disabled || !onPress,
  };
  const surface = grouped ? undefined : theme.backgroundElement;

  // A control at the end (a button) sits beside the pressable part, not in
  // it: a screen reader reaches each on its own.
  if (detail !== undefined && typeof detail !== 'string') {
    return (
      <View
        style={[
          styles.row,
          stacked && styles.stacked,
          surface && { backgroundColor: surface, borderRadius: Radius.card },
        ]}
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
      </View>
    );
  }
  return (
    <Pressable {...pressable}>
      {({ pressed }) => (
        <ThemedView
          style={[
            styles.row,
            stacked && styles.stacked,
            {
              backgroundColor: pressed
                ? theme.backgroundSelected
                : (surface ?? 'transparent'),
            },
            surface && { borderRadius: Radius.card },
          ]}
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

/**
 * Rows that belong together: one rounded surface, hairline dividers between
 * the rows (settings, account, lists of records).
 */
export function ListGroup({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const items = Children.toArray(children);
  return (
    <InGroup value>
      <FadeIn>
        <View
          style={[styles.group, { backgroundColor: theme.backgroundElement }]}
        >
          {items.map((child, index) => (
            <Fragment key={index}>
              {index > 0 && (
                <View
                  style={[styles.divider, { backgroundColor: theme.border }]}
                />
              )}
              {child}
            </Fragment>
          ))}
        </View>
      </FadeIn>
    </InGroup>
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
    minHeight: 52,
    paddingVertical: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: 500,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  chevron: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: 400,
  },
  group: {
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginStart: Spacing.three,
  },
});

import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Choice<T> = { value: T; label: string; disabled?: boolean };

/** One of a few options, as a row of chips (a segmented control). */
export function ChoiceChips<T>({
  choices,
  value,
  onChange,
  disabled,
  accessibilityLabel,
}: {
  choices: Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={styles.row}
    >
      {choices.map((choice) => {
        const selected = choice.value === value;
        const inactive = disabled || choice.disabled;
        return (
          <Pressable
            key={String(choice.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled: inactive }}
            disabled={inactive}
            onPress={() => onChange(choice.value)}
            style={[
              styles.chip,
              {
                borderColor: selected ? theme.primary : theme.control,
                backgroundColor: selected ? theme.primary : 'transparent',
              },
              inactive && !selected && styles.dimmed,
            ]}
          >
            <ThemedText
              type="small"
              style={{ color: selected ? theme.onPrimary : theme.text }}
            >
              {choice.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
  },
  dimmed: {
    opacity: 0.4,
  },
});

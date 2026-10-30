import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ControlHeight, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

/**
 * A labelled text input with its error below. Its edge turns the brand
 * colour while typing, so the field in focus is the one that's obvious.
 */
export function TextField({
  label,
  error,
  style,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const edge = error ? theme.danger : focused ? theme.primary : theme.control;
  return (
    <View style={styles.field}>
      {/* The input carries the label: screen readers say it once. */}
      <ThemedText
        style={styles.label}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {label}
      </ThemedText>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.textSecondary}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: theme.backgroundElement,
            borderColor: edge,
            borderWidth: focused || error ? 2 : 1,
          },
          style,
        ]}
        {...rest}
      />
      {error && (
        <ThemedText
          style={styles.error}
          themeColor="danger"
          accessibilityRole="alert"
        >
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 600,
  },
  input: {
    minHeight: ControlHeight,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
    fontSize: 16,
    textAlign: 'auto', // follows the layout direction (right to left in Arabic)
  },
  error: {
    fontSize: 14,
    lineHeight: 20,
  },
});

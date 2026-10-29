import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
};

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const primary = variant === 'primary';
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      style={(state) => [
        styles.button,
        primary
          ? { backgroundColor: theme.primary }
          : { borderColor: theme.border, borderWidth: 1 },
        (state.pressed || inactive) && styles.dimmed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={primary ? theme.onPrimary : theme.text} />
      ) : (
        <ThemedText
          type="smallBold"
          style={{ color: primary ? theme.onPrimary : theme.text }}
        >
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  dimmed: {
    opacity: 0.6,
  },
});

import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ControlHeight, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  /** primary: the action; secondary: a quieter one beside it; danger: destructive. */
  variant?: 'primary' | 'secondary' | 'danger';
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
  const filled = variant !== 'secondary';
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      style={(state) => [
        styles.button,
        variant === 'secondary'
          ? { backgroundColor: theme.backgroundElement }
          : {
              backgroundColor:
                variant === 'danger' ? theme.dangerFill : theme.primary,
            },
        state.pressed && styles.pressed,
        inactive && styles.dimmed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={filled ? theme.onPrimary : theme.text} />
      ) : (
        <ThemedText
          style={[
            styles.label,
            { color: filled ? theme.onPrimary : theme.text },
          ]}
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
    minHeight: ControlHeight,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
  },
  label: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: 600,
  },
  // A press sinks a little, so the control answers the finger.
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },
  dimmed: {
    opacity: 0.5,
  },
});

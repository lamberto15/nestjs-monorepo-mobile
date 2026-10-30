import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { ListGroup } from '@/components/list-row';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Placeholder rows while a list loads: the shape of the answer, pulsing
 * gently, so the screen doesn't jump when the data lands.
 */
export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <ListGroup>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonRow key={index} />
      ))}
    </ListGroup>
  );
}

function SkeletonRow() {
  const theme = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <View style={styles.row}>
      <Animated.View
        style={[
          styles.line,
          styles.title,
          { backgroundColor: theme.border, opacity },
        ]}
      />
      <Animated.View
        style={[
          styles.line,
          styles.subtitle,
          { backgroundColor: theme.border, opacity },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two,
    minHeight: 64,
    justifyContent: 'center',
    paddingVertical: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  line: {
    height: 12,
    borderRadius: Radius.pill,
  },
  title: {
    width: '60%',
  },
  subtitle: {
    width: '35%',
    height: 10,
  },
});

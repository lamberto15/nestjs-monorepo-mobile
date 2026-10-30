import { useEffect, useState, type ReactNode } from 'react';
import { Animated } from 'react-native';

/**
 * Content that arrives fades in once, briefly: a list that just loaded
 * settles into place instead of popping. Nothing loops, nothing bounces.
 */
export function FadeIn({ children }: { children: ReactNode }) {
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [opacity]);
  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

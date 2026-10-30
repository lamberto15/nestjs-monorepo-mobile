import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

/** Wide enough for a list beside what it opens: an iPad, a large window. */
export function useWide() {
  return useWindowDimensions().width >= 768;
}

/** A list column at the start, what it opens beside it. */
export function SplitView({
  list,
  children,
}: {
  list: ReactNode;
  children: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.row}>
      {/* Clear of the tabs floating at the top, level with the other
          column's navigation bar. */}
      <View
        style={[
          styles.list,
          { borderColor: theme.border, paddingTop: insets.top + BAR_HEIGHT },
        ]}
      >
        {list}
      </View>
      <View style={styles.fill}>{children}</View>
    </View>
  );
}

/** iOS's navigation bar, which the other column has. */
const BAR_HEIGHT = 50;

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row', // the list at the start: right in Arabic
  },
  list: {
    width: 360,
    borderEndWidth: StyleSheet.hairlineWidth,
  },
  fill: {
    flex: 1,
  },
});

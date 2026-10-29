import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ChoiceChips } from '@/components/choice-chips';
import { ErrorState } from '@/components/error-state';
import { ListRow } from '@/components/list-row';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Development only: every shared component in its states, to check them in
 * light and dark, right to left and at large text sizes in one place
 * (docs/development.md, "QA pass"). Not reachable in a release build.
 */
export default function CatalogueScreen() {
  const theme = useTheme();
  const [choice, setChoice] = useState('one');
  if (!__DEV__) {
    return <Redirect href="/" />;
  }
  return (
    <Screen>
      <Section title="Text">
        <ThemedText type="title">Title</ThemedText>
        <ThemedText type="subtitle">Subtitle</ThemedText>
        <ThemedText>
          Default text, long enough to wrap onto a second line.
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Small secondary
        </ThemedText>
        <ThemedText type="smallBold">Small bold</ThemedText>
        <ThemedText type="linkPrimary">Link</ThemedText>
        <ThemedText themeColor="danger">Danger</ThemedText>
      </Section>
      <Section title="Buttons">
        <Button title="Primary" onPress={() => undefined} />
        <Button
          title="Secondary"
          variant="secondary"
          onPress={() => undefined}
        />
        <Button title="Danger" variant="danger" onPress={() => undefined} />
        <Button title="Loading" loading onPress={() => undefined} />
        <Button title="Disabled" disabled onPress={() => undefined} />
      </Section>
      <Section title="Fields">
        <TextField label="Label" placeholder="Placeholder" />
        <TextField
          label="With an error"
          value="Wrong"
          error="Enter a valid value."
        />
        <ChoiceChips
          accessibilityLabel="Choices"
          value={choice}
          onChange={setChoice}
          choices={[
            { value: 'one', label: 'One' },
            { value: 'two', label: 'Two' },
            { value: 'three', label: 'Disabled', disabled: true },
          ]}
        />
      </Section>
      <Section title="Rows">
        <ListRow title="Plain" onPress={() => undefined} />
        <ListRow
          title="With a subtitle"
          subtitle="Secondary line"
          detail="Detail"
        />
        <ListRow title="Selected" selected onPress={() => undefined} />
        <ListRow
          title="Leading mark"
          leading={
            <View style={[styles.dot, { backgroundColor: theme.primary }]} />
          }
        />
      </Section>
      <Section title="States">
        <ErrorState
          error={new TypeError('Network request failed')}
          onRetry={() => undefined}
        />
      </Section>
    </Screen>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" accessibilityRole="header">
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  dot: {
    width: Spacing.two,
    height: Spacing.two,
    borderRadius: Spacing.one,
  },
});

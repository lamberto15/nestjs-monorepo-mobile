import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * A tap felt in the hand: success after a save or a decision, warning
 * before something destructive. Nothing on web.
 */
export const feedback = {
  success() {
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  },
  warning() {
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  },
};

import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { ListRow } from '@/components/list-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { apiErrorMessage } from '@/features/auth/errors';
import {
  formatSize,
  openLink,
  tooLarge,
  useAttachments,
  useDeleteAttachment,
  useThumbnail,
  useUploadAttachment,
  type Attachment,
  type PickedFile,
} from '@/features/records/attachments';
import type { RecordRef } from '@/features/records/hooks';

/**
 * A record's files: open, delete (whoever may change the record, or the
 * uploader), add from the camera, the photo library or the files app. The
 * type's limits (`attachmentLimits`) are checked before sending.
 */
export function Attachments({
  record,
  maxBytes,
  canChange,
  userId,
}: {
  record: RecordRef;
  maxBytes: number | undefined;
  canChange: boolean;
  userId: string;
}) {
  const { t } = useTranslation();
  const list = useAttachments(record);
  const upload = useUploadAttachment(record);
  const remove = useDeleteAttachment(record);
  const [problem, setProblem] = useState<string | null>(null);
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];

  function send(file: PickedFile | undefined) {
    setProblem(null);
    if (!file) {
      return;
    }
    if (tooLarge(file, maxBytes)) {
      setProblem(t('attachments.tooLarge', { max: formatSize(maxBytes!) }));
      return;
    }
    upload.mutate(file);
  }

  async function fromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setProblem(t('attachments.noCamera'));
      return;
    }
    const shot = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    const asset = shot.canceled ? undefined : shot.assets[0];
    send(
      asset && {
        uri: asset.uri,
        name: asset.fileName ?? 'photo.jpg',
        size: asset.fileSize,
      },
    );
  }

  async function fromPhotos() {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    const asset = picked.canceled ? undefined : picked.assets[0];
    send(
      asset && {
        uri: asset.uri,
        name: asset.fileName ?? 'photo.jpg',
        size: asset.fileSize,
      },
    );
  }

  async function fromFiles() {
    const picked = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
    });
    const asset = picked.canceled ? undefined : picked.assets[0];
    send(asset && { uri: asset.uri, name: asset.name, size: asset.size });
  }

  async function open(attachment: Attachment) {
    try {
      await WebBrowser.openBrowserAsync(await openLink(attachment));
    } catch (error) {
      setProblem(apiErrorMessage(error, t));
    }
  }

  const error = upload.error ?? remove.error;
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" accessibilityRole="header">
        {t('attachments.title')}
      </ThemedText>
      {list.isPending && <ActivityIndicator />}
      {list.isError && (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      )}
      {list.isSuccess && items.length === 0 && (
        <ThemedText themeColor="textSecondary">
          {t('attachments.empty')}
        </ThemedText>
      )}
      {items.map((attachment) => {
        const checking = attachment.scanStatus === 'pending';
        const mine = attachment.uploadedBy === `user:${userId}`;
        return (
          <ListRow
            key={attachment.id}
            leading={<Thumbnail attachment={attachment} />}
            title={attachment.name}
            subtitle={
              checking ? t('attachments.checking') : formatSize(attachment.size)
            }
            onPress={checking ? undefined : () => open(attachment)}
            detail={
              (canChange || mine) && !attachment.locked ? (
                <Button
                  title={t('attachments.delete')}
                  variant="secondary"
                  loading={
                    remove.isPending && remove.variables === attachment.id
                  }
                  onPress={() =>
                    Alert.alert(
                      t('attachments.deleteTitle', { name: attachment.name }),
                      undefined,
                      [
                        { text: t('sessions.cancel'), style: 'cancel' },
                        {
                          text: t('attachments.delete'),
                          style: 'destructive',
                          onPress: () => remove.mutate(attachment.id),
                        },
                      ],
                    )
                  }
                />
              ) : undefined
            }
          />
        );
      })}
      {canChange && (
        <View style={styles.add}>
          <Button
            title={t('attachments.camera')}
            variant="secondary"
            onPress={fromCamera}
          />
          <Button
            title={t('attachments.photo')}
            variant="secondary"
            onPress={fromPhotos}
          />
          <Button
            title={t('attachments.file')}
            variant="secondary"
            onPress={fromFiles}
          />
        </View>
      )}
      {upload.isPending && (
        <ThemedText themeColor="textSecondary">
          {t('attachments.uploading')}
        </ThemedText>
      )}
      {(problem || error) && (
        <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
          {problem ?? apiErrorMessage(error, t)}
        </ThemedText>
      )}
    </View>
  );
}

function Thumbnail({ attachment }: { attachment: Attachment }) {
  const thumb = useThumbnail(attachment);
  if (!thumb.data) {
    return null;
  }
  return (
    <Image
      source={thumb.data}
      style={styles.thumb}
      contentFit="cover"
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  add: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: Spacing.one,
  },
});

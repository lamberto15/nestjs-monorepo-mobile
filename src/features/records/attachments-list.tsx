import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { isApiError } from '@/api/client';
import { Button } from '@/components/button';
import { ErrorState } from '@/components/error-state';
import { ListRow } from '@/components/list-row';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { apiErrorMessage } from '@/features/auth/errors';
import {
  formatSize,
  isCancelled,
  openLink,
  tooLarge,
  useAttachments,
  useDeleteAttachment,
  useNewVersion,
  useRestoreVersion,
  useThumbnail,
  useUploadAttachment,
  useVersions,
  versionLink,
  type Attachment,
  type PickedFile,
} from '@/features/records/attachments';
import type { RecordRef } from '@/features/records/hooks';
import { formatDateTime } from '@/i18n/format';

async function pickPhoto(): Promise<PickedFile | undefined> {
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    quality: 0.8,
  });
  const asset = picked.canceled ? undefined : picked.assets[0];
  return (
    asset && {
      uri: asset.uri,
      name: asset.fileName ?? 'photo.jpg',
      size: asset.fileSize,
      mimeType: asset.mimeType,
    }
  );
}

async function pickFile(): Promise<PickedFile | undefined> {
  const picked = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
  });
  const asset = picked.canceled ? undefined : picked.assets[0];
  return (
    asset && {
      uri: asset.uri,
      name: asset.name,
      size: asset.size,
      mimeType: asset.mimeType,
    }
  );
}

/**
 * A record's files: open, add from the camera, the photo library or the
 * files app (in chunks, with progress, resumed after a dropped
 * connection), and per file a new version, its versions, delete. The
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
  const newVersion = useNewVersion(record);
  const restore = useRestoreVersion(record);
  const [problem, setProblem] = useState<string | null>(null);
  const [opened, setOpened] = useState<string | null>(null);
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];

  /** Within the type's limit, or says why not. */
  function fits(file: PickedFile | undefined): file is PickedFile {
    setProblem(null);
    if (!file) {
      return false;
    }
    if (tooLarge(file, maxBytes)) {
      setProblem(t('attachments.tooLarge', { max: formatSize(maxBytes!) }));
      return false;
    }
    return true;
  }

  async function fromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setProblem(t('attachments.noCamera'));
      return;
    }
    const shot = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    const asset = shot.canceled ? undefined : shot.assets[0];
    const file = asset && {
      uri: asset.uri,
      name: asset.fileName ?? 'photo.jpg',
      size: asset.fileSize,
      mimeType: asset.mimeType,
    };
    if (fits(file)) {
      upload.mutate(file);
    }
  }

  async function add(pick: () => Promise<PickedFile | undefined>) {
    const file = await pick();
    if (fits(file)) {
      upload.mutate(file);
    }
  }

  async function replace(
    attachment: Attachment,
    pick: () => Promise<PickedFile | undefined>,
  ) {
    const file = await pick();
    if (fits(file)) {
      newVersion.mutate({ attachment, picked: file });
    }
  }

  async function open(link: Promise<string>) {
    try {
      await WebBrowser.openBrowserAsync(await link);
    } catch (error) {
      setProblem(apiErrorMessage(error, t));
    }
  }

  function more(attachment: Attachment, mayDelete: boolean) {
    const changeable = canChange && !attachment.locked;
    Alert.alert(attachment.name, undefined, [
      ...(changeable
        ? [
            {
              text: t('attachments.newVersion'),
              onPress: () =>
                Alert.alert(t('attachments.newVersion'), undefined, [
                  {
                    text: t('attachments.photo'),
                    onPress: () => void replace(attachment, pickPhoto),
                  },
                  {
                    text: t('attachments.file'),
                    onPress: () => void replace(attachment, pickFile),
                  },
                  { text: t('sessions.cancel'), style: 'cancel' as const },
                ]),
            },
          ]
        : []),
      {
        text: t('attachments.versions'),
        onPress: () =>
          setOpened((id) => (id === attachment.id ? null : attachment.id)),
      },
      ...(mayDelete && !attachment.locked
        ? [
            {
              text: t('attachments.delete'),
              style: 'destructive' as const,
              onPress: () =>
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
                ),
            },
          ]
        : []),
      { text: t('sessions.cancel'), style: 'cancel' as const },
    ]);
  }

  const error = [upload.error, newVersion.error, restore.error, remove.error]
    .filter((e) => e && !isCancelled(e))
    .at(0);
  const working = remove.isPending || newVersion.isPending || restore.isPending;
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
          <View key={attachment.id} style={styles.item}>
            <ListRow
              leading={<Thumbnail attachment={attachment} />}
              title={attachment.name}
              subtitle={
                checking
                  ? t('attachments.checking')
                  : formatSize(attachment.size)
              }
              onPress={checking ? undefined : () => open(openLink(attachment))}
              detail={
                <Button
                  title={t('attachments.more')}
                  variant="secondary"
                  onPress={() => more(attachment, canChange || mine)}
                />
              }
            />
            {opened === attachment.id && (
              <Versions
                attachment={attachment}
                canRestore={canChange && !attachment.locked}
                onOpen={(version) => open(versionLink(attachment, version))}
                onRestore={(version) => restore.mutate({ attachment, version })}
              />
            )}
          </View>
        );
      })}
      {canChange && upload.progress === null && !upload.isPending && (
        <View style={styles.add}>
          <Button
            title={t('attachments.camera')}
            variant="secondary"
            onPress={fromCamera}
          />
          <Button
            title={t('attachments.photo')}
            variant="secondary"
            onPress={() => add(pickPhoto)}
          />
          <Button
            title={t('attachments.file')}
            variant="secondary"
            onPress={() => add(pickFile)}
          />
        </View>
      )}
      {upload.isPending && (
        <View style={styles.add}>
          <ThemedText
            themeColor="textSecondary"
            accessibilityLiveRegion="polite"
          >
            {t('attachments.progress', {
              percent: Math.round((upload.progress ?? 0) * 100),
            })}
          </ThemedText>
          <Button
            title={t('attachments.cancelUpload')}
            variant="secondary"
            onPress={upload.cancel}
          />
        </View>
      )}
      {working && <ActivityIndicator />}
      {(problem || error) && (
        <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
          {problem ??
            (isApiError(error) && error.status === 412
              ? t('attachments.changed')
              : apiErrorMessage(error, t))}
        </ThemedText>
      )}
    </View>
  );
}

/** An attachment's files, newest first: open any, restore an earlier one. */
function Versions({
  attachment,
  canRestore,
  onOpen,
  onRestore,
}: {
  attachment: Attachment;
  canRestore: boolean;
  onOpen: (version: number) => void;
  onRestore: (version: number) => void;
}) {
  const { t } = useTranslation();
  const versions = useVersions(attachment, true);
  if (versions.isPending) {
    return <ActivityIndicator />;
  }
  if (versions.isError) {
    return (
      <ErrorState error={versions.error} onRetry={() => versions.refetch()} />
    );
  }
  return (
    <View style={styles.versions}>
      {versions.data.items.map((version) => (
        <ListRow
          key={version.version}
          title={t('attachments.version', { n: version.version })}
          subtitle={[
            version.current ? t('attachments.current') : null,
            formatSize(version.size),
            formatDateTime(version.uploadedAt),
            version.note,
          ]
            .filter(Boolean)
            .join(' · ')}
          onPress={() => onOpen(version.version)}
          detail={
            canRestore && !version.current ? (
              <Button
                title={t('attachments.restore')}
                variant="secondary"
                onPress={() => onRestore(version.version)}
              />
            ) : undefined
          }
        />
      ))}
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
  item: {
    gap: Spacing.one,
  },
  versions: {
    gap: Spacing.one,
    paddingStart: Spacing.four,
  },
  add: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: Spacing.one,
  },
});

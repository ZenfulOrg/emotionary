import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DELETE_PHRASE, matchesDeletePhrase } from '@/account/deletePhrase';
import { Body, Button, Dialog, Eyebrow, Headline, Mono, TextField } from '@/components/brand';
import { space } from '@/theme/tokens';

/**
 * The last step before deleting an account: say what happens, then make
 * the person type the phrase, so a stray tap can't delete it.
 */
export function DeleteAccountDialog({
  visible,
  busy,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [text, setText] = useState('');
  const ready = matchesDeletePhrase(text);
  const close = () => {
    if (busy) return;
    setText('');
    onCancel();
  };

  return (
    <Dialog visible={visible} onClose={close} closeLabel="Keep my account">
      <Eyebrow>Delete account</Eyebrow>
      <Headline size={34} style={styles.title}>
        This can’t be undone.
      </Headline>
      <Body tone="muted">
        Your Emotionary account is deleted for good. Favorites and progress on this device stay. Deleting your account
        does not cancel a subscription: cancel it first in your App Store or Google Play subscriptions.
      </Body>

      <View style={styles.field}>
        <Mono size={11}>TYPE “{DELETE_PHRASE.toUpperCase()}” TO CONFIRM</Mono>
        <TextField
          value={text}
          onChangeText={setText}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          editable={!busy}
          returnKeyType="done"
          accessibilityLabel={`Type ${DELETE_PHRASE} to confirm`}
          onSubmitEditing={() => ready && !busy && onConfirm()}
        />
      </View>

      <View style={styles.actions}>
        <Button label="Delete my account" onPress={onConfirm} disabled={!ready} busy={busy} />
        <Button label="Keep my account" variant="link" onPress={close} disabled={busy} />
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: space.s, marginBottom: space.m },
  field: { gap: space.s, marginTop: space.l },
  actions: { gap: space.m, marginTop: space.l, alignItems: 'stretch' },
});

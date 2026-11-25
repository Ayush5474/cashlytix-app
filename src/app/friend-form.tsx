import { useState } from 'react';

import { useStore } from '@/store/useStore';
import { Button, Field, Sheet, T, closeSheet } from '@/ui/components';
import { useTheme } from '@/ui/theme';

export default function FriendForm() {
  const t = useTheme();
  const addFriend = useStore((s) => s.addFriend);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    if (!name.trim()) return setError("Enter your friend's name.");
    addFriend(name);
    closeSheet();
  };

  return (
    <Sheet title="Add friend" onClose={closeSheet} footer={<Button testID="save-friend" label="Add friend" onPress={save} />}>
      <Field testID="friend-name" label="Name" value={name} onChangeText={setName} placeholder="e.g. Asha" onSubmitEditing={save} autoFocus />
      <T size={13} color={t.muted}>
        Friends do not need the app. You track the amounts here and can share a summary on WhatsApp.
      </T>
      {error && <T color={t.expense} weight="600">{error}</T>}
    </Sheet>
  );
}

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useStore } from '@/store/useStore';
import { Button, Chip, Field, Label, Sheet, T, Wrap, closeSheet } from '@/ui/components';
import { useTheme } from '@/ui/theme';

export default function GroupForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const t = useTheme();
  const friends = useStore((s) => s.friends);
  const groups = useStore((s) => s.groups);
  const addGroup = useStore((s) => s.addGroup);
  const updateGroup = useStore((s) => s.updateGroup);
  const deleteGroup = useStore((s) => s.deleteGroup);

  const editing = groups.find((g) => g.id === id);
  const [name, setName] = useState(editing?.name ?? '');
  const [members, setMembers] = useState<string[]>(editing?.memberIds ?? []);
  const [error, setError] = useState<string | null>(null);

  const toggle = (fid: string) => setMembers((cur) => (cur.includes(fid) ? cur.filter((x) => x !== fid) : [...cur, fid]));

  const save = () => {
    if (!name.trim()) return setError('Give the group a name.');
    if (members.length === 0) return setError('Pick at least one friend.');
    if (editing) updateGroup(editing.id, { name: name.trim(), memberIds: members });
    else addGroup(name, members);
    closeSheet();
  };

  return (
    <Sheet title={editing ? 'Edit group' : 'New group'} onClose={closeSheet} footer={<Button testID="save-group" label={editing ? 'Save changes' : 'Create group'} onPress={save} />}>
      <Field testID="group-name" label="Group name" value={name} onChangeText={setName} placeholder="e.g. Goa trip" />
      <View style={{ gap: 8 }}>
        <Label>Members</Label>
        {friends.length === 0 ? (
          <View style={{ gap: 10 }}>
            <T color={t.muted}>Add some friends first.</T>
            <Button variant="soft" label="Add a friend" onPress={() => router.push('/friend-form')} />
          </View>
        ) : (
          <Wrap>
            {friends.map((f) => (
              <Chip key={f.id} testID={`member-${f.name}`} label={f.name} selected={members.includes(f.id)} onPress={() => toggle(f.id)} />
            ))}
          </Wrap>
        )}
      </View>
      {error && <T color={t.expense} weight="600">{error}</T>}
      {editing && (
        <Button
          label="Delete group"
          variant="danger"
          onPress={() => {
            deleteGroup(editing.id);
            closeSheet();
            router.replace('/split');
          }}
        />
      )}
    </Sheet>
  );
}

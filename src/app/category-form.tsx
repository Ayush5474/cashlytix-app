import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import type { CategoryGroup } from '@/domain/types';
import { useStore } from '@/store/useStore';
import { Button, Chip, Field, Label, Sheet, T, Wrap, closeSheet } from '@/ui/components';
import { groupColor, useTheme } from '@/ui/theme';

const GROUPS: { id: CategoryGroup; label: string }[] = [
  { id: 'need', label: 'Need' },
  { id: 'want', label: 'Want' },
  { id: 'saved', label: 'Saved' },
];

export default function CategoryForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const t = useTheme();
  const categories = useStore((s) => s.categories);
  const addCategory = useStore((s) => s.addCategory);
  const updateCategory = useStore((s) => s.updateCategory);
  const deleteCategory = useStore((s) => s.deleteCategory);

  const editing = categories.find((c) => c.id === id);
  const [name, setName] = useState(editing?.name ?? '');
  const [group, setGroup] = useState<CategoryGroup>(editing?.group ?? 'want');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return setError('Give the category a name.');
    if (categories.some((c) => c.id !== editing?.id && c.name.toLowerCase() === trimmed.toLowerCase())) {
      return setError('You already have a category with this name.');
    }
    if (editing) updateCategory(editing.id, { name: trimmed, group });
    else addCategory(trimmed, group);
    closeSheet();
  };

  return (
    <Sheet title={editing ? 'Edit category' : 'New category'} onClose={closeSheet} footer={<Button testID="save-category" label={editing ? 'Save changes' : 'Add category'} onPress={save} />}>
      <Field testID="category-name" label="Name" value={name} onChangeText={setName} placeholder="e.g. Pets" />
      <View style={{ gap: 8 }}>
        <Label>Counts as</Label>
        <Wrap>
          {GROUPS.map((g) => (
            <Chip key={g.id} label={g.label} selected={group === g.id} color={groupColor(t, g.id)} onPress={() => setGroup(g.id)} />
          ))}
        </Wrap>
        <T size={13} color={t.muted}>
          This decides which Need · Want · Saved bar the spending goes into.
        </T>
      </View>
      {error && <T color={t.expense} weight="600">{error}</T>}
      {editing && !editing.isDefault && (
        <Button
          label="Delete category"
          variant="danger"
          onPress={() => {
            deleteCategory(editing.id);
            closeSheet();
          }}
        />
      )}
      {editing?.isDefault && (
        <T size={13} color={t.muted}>
          Built-in categories can be renamed but not deleted.
        </T>
      )}
    </Sheet>
  );
}

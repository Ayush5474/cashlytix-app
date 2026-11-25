import { router } from 'expo-router';
import { View } from 'react-native';

import { useStore } from '@/store/useStore';
import { Button, Divider, Header, NavRow, Screen, T } from '@/ui/components';
import { groupColor, useTheme } from '@/ui/theme';

const GROUP_LABEL = { need: 'Need', want: 'Want', saved: 'Saved' } as const;

export default function Categories() {
  const t = useTheme();
  const categories = useStore((s) => s.categories);
  return (
    <Screen header={<Header title="Categories" back />}>
      <View>
        {categories.map((c, i) => (
          <View key={c.id}>
            {i > 0 && <Divider />}
            <NavRow
              testID={`cat-row-${c.name}`}
              title={c.name}
              subtitle={c.isDefault ? 'Built-in' : 'Custom'}
              onPress={() => router.push({ pathname: '/category-form', params: { id: c.id } })}
              right={
                <T size={13} weight="700" color={groupColor(t, c.group)}>
                  {GROUP_LABEL[c.group]}
                </T>
              }
            />
          </View>
        ))}
      </View>
      <Button testID="add-category" label="Add category" onPress={() => router.push('/category-form')} />
    </Screen>
  );
}

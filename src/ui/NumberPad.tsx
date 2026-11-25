import { Pressable, View } from 'react-native';

import type { PadKey } from '@/domain/money';

import { T } from './components';
import { Icon } from './Icon';
import { colors, radius } from './theme';

const ROWS: PadKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'del'],
];

export function NumberPad({ onKey }: { onKey: (k: PadKey) => void }) {
  return (
    <View style={{ gap: 8 }}>
      {ROWS.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
          {row.map((k) => (
            <Pressable
              key={k}
              testID={`key-${k}`}
              accessibilityRole="button"
              accessibilityLabel={k === 'del' ? 'Delete' : k}
              onPress={() => onKey(k)}
              style={({ pressed }) => ({
                flex: 1,
                height: 54,
                borderRadius: radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? '#E2E8F0' : colors.card,
                borderWidth: 1,
                borderColor: colors.border,
              })}>
              {k === 'del' ? <Icon name="backspace" /> : <T size={22} weight="600">{k}</T>}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

import { View } from 'react-native';

import type { PadKey } from '@/domain/money';

import { Pressy, T } from './components';
import { Icon } from './Icon';
import { radius, useTheme } from './theme';

const ROWS: PadKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'del'],
];

export function NumberPad({ onKey }: { onKey: (k: PadKey) => void }) {
  const t = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {ROWS.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
          {row.map((k) => (
            <Pressy
              key={k}
              testID={`key-${k}`}
              accessibilityLabel={k === 'del' ? 'Delete' : k}
              onPress={() => onKey(k)}
              scaleTo={0.93}
              style={{
                flex: 1,
                height: 54,
                borderRadius: radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.surface,
              }}>
              {k === 'del' ? <Icon name="backspace" color={t.text} /> : <T size={22} weight="600">{k}</T>}
            </Pressy>
          ))}
        </View>
      ))}
    </View>
  );
}

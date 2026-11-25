import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

import { formatINR } from '@/domain/money';
import type { CategorySpend } from '@/domain/selectors';

import { T } from './components';
import { SLICE_COLORS, colors } from './theme';

const SIZE = 200;
const STROKE = 30;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

export const sliceColor = (index: number) => SLICE_COLORS[index % SLICE_COLORS.length];

/**
 * Donut of spend by category. No legend: tapping a slice (or a row in the
 * list below) shows that category's name, amount and percentage in the centre.
 */
export function Donut({
  data,
  selected,
  onSelect,
}: {
  data: CategorySpend[];
  selected: string | null;
  onSelect: (categoryId: string | null) => void;
}) {
  const total = data.reduce((s, d) => s + d.amount, 0);
  const active = data.find((d) => d.categoryId === selected);
  let offset = 0;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: SIZE, height: SIZE }}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <G rotation={-90} origin={`${SIZE / 2}, ${SIZE / 2}`}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={colors.border} strokeWidth={STROKE} fill="none" />
            {data.map((d, i) => {
              const len = total > 0 ? (d.amount / total) * C : 0;
              const gap = data.length > 1 ? Math.min(2, len / 2) : 0;
              const el = (
                <Circle
                  key={d.categoryId}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={R}
                  stroke={sliceColor(i)}
                  strokeWidth={selected === d.categoryId ? STROKE + 6 : STROKE}
                  strokeOpacity={selected && selected !== d.categoryId ? 0.35 : 1}
                  strokeDasharray={`${Math.max(len - gap, 0)} ${C}`}
                  strokeDashoffset={-offset}
                  fill="none"
                  onPress={() => onSelect(selected === d.categoryId ? null : d.categoryId)}
                />
              );
              offset += len;
              return el;
            })}
          </G>
        </Svg>
        <Pressable
          onPress={() => onSelect(null)}
          style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', padding: STROKE + 8 }}>
          {active ? (
            <>
              <T size={13} weight="600" color={colors.muted} numberOfLines={1}>
                {active.name}
              </T>
              <T size={20} weight="800">
                {formatINR(active.amount)}
              </T>
              <T size={13} weight="700" color={colors.primary}>
                {Math.round(active.share * 100)}%
              </T>
            </>
          ) : (
            <>
              <T size={12} weight="600" color={colors.muted}>
                Spent
              </T>
              <T size={20} weight="800">
                {formatINR(total)}
              </T>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { dayTotals, monthGrid, monthSummary, shiftMonth, yearMonthOf } from '@/domain/calendar';
import { WEEKDAY_LETTERS, formatDayLong, monthLabel, todayISO } from '@/domain/dates';
import { formatCompactINR, formatINR } from '@/domain/money';
import { sortNewestFirst } from '@/domain/selectors';
import { useStore } from '@/store/useStore';

import { Button, Card, Pressy, Row, SectionTitle, T } from './components';
import { Icon } from './Icon';
import { TransactionRow } from './TransactionRow';
import { radius, useTheme } from './theme';

/** Month calendar: each day shows what you spent and how many entries there were. Tap a day for its list. */
export function CalendarView() {
  const t = useTheme();
  const transactions = useStore((s) => s.transactions);

  const today = todayISO();
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month0, setMonth0] = useState(() => Number(today.slice(5, 7)) - 1);
  const [selected, setSelected] = useState<string>(today);

  const ym = yearMonthOf(year, month0);
  const totals = useMemo(() => dayTotals(transactions, ym), [transactions, ym]);
  const summary = useMemo(() => monthSummary(totals), [totals]);
  const weeks = useMemo(() => monthGrid(year, month0, 0), [year, month0]);
  const dayRows = useMemo(() => sortNewestFirst(transactions.filter((x) => x.date === selected)), [transactions, selected]);
  const dayTotal = totals[selected];

  const go = (delta: number) => {
    const next = shiftMonth(year, month0, delta);
    setYear(next.year);
    setMonth0(next.month0);
    const nextYm = yearMonthOf(next.year, next.month0);
    // Keep a sensible selection: today when visiting this month, otherwise the 1st.
    setSelected(today.startsWith(nextYm) ? today : `${nextYm}-01`);
  };

  const goToday = () => {
    setYear(Number(today.slice(0, 4)));
    setMonth0(Number(today.slice(5, 7)) - 1);
    setSelected(today);
  };

  return (
    <View style={{ gap: 16 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row style={{ gap: 4 }}>
          <Pressy testID="cal-prev" accessibilityLabel="Previous month" onPress={() => go(-1)} style={{ padding: 8 }}>
            <Icon name="back" color={t.text} />
          </Pressy>
          <T size={18} weight="800" testID="cal-month">
            {monthLabel(year, month0)}
          </T>
          <Pressy testID="cal-next" accessibilityLabel="Next month" onPress={() => go(1)} style={{ padding: 8 }}>
            <Icon name="chevron" color={t.text} />
          </Pressy>
        </Row>
        <Pressy testID="cal-today" onPress={goToday} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: t.primarySoft }}>
          <T size={13} weight="700" color={t.primary}>
            Today
          </T>
        </Pressy>
      </Row>

      <Row style={{ alignItems: 'stretch' }}>
        <Card style={{ flex: 1, padding: 12, gap: 2 }}>
          <T size={12} weight="600" color={t.muted}>
            Entries
          </T>
          <T size={17} weight="800" testID="cal-month-count">
            {summary.count}
          </T>
        </Card>
        <Card style={{ flex: 1.4, padding: 12, gap: 2 }}>
          <T size={12} weight="600" color={t.muted}>
            Spent
          </T>
          <T size={17} weight="800" numberOfLines={1} testID="cal-month-spent">
            {formatINR(summary.spent)}
          </T>
        </Card>
        <Card style={{ flex: 1.4, padding: 12, gap: 2 }}>
          <T size={12} weight="600" color={t.muted}>
            Income
          </T>
          <T size={17} weight="800" color={t.income} numberOfLines={1}>
            {formatINR(summary.income)}
          </T>
        </Card>
      </Row>

      <View>
        <Row style={{ gap: 0, marginBottom: 6 }}>
          {WEEKDAY_LETTERS.map((l, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              <T size={12} weight="700" color={t.faint}>
                {l}
              </T>
            </View>
          ))}
        </Row>
        <Animated.View key={ym} entering={FadeIn.duration(260)} style={{ gap: 4 }}>
          {weeks.map((week, wi) => (
            <Row key={wi} style={{ gap: 4 }}>
              {week.map((iso, di) => {
                if (!iso) return <View key={di} style={{ flex: 1 }} />;
                const d = totals[iso];
                const isSel = iso === selected;
                const isToday = iso === today;
                return (
                  <Pressable
                    key={iso}
                    testID={`day-${iso}`}
                    accessibilityLabel={`${formatDayLong(iso)}${d ? `, ${d.count} entries, spent ${formatINR(d.spent)}` : ''}`}
                    onPress={() => setSelected(iso)}
                    style={{
                      flex: 1,
                      height: 62,
                      borderRadius: radius.sm,
                      alignItems: 'center',
                      paddingTop: 6,
                      gap: 2,
                      backgroundColor: isSel ? t.primary : d ? t.surface : 'transparent',
                      borderWidth: isToday && !isSel ? 1.5 : 0,
                      borderColor: t.primary,
                    }}>
                    <T size={14} weight={isToday || isSel ? '800' : '600'} color={isSel ? t.onPrimary : t.text}>
                      {Number(iso.slice(8))}
                    </T>
                    {d && d.spent > 0 ? (
                      <T size={10} weight="700" color={isSel ? t.onPrimary : t.expense} numberOfLines={1}>
                        {formatCompactINR(d.spent)}
                      </T>
                    ) : d && d.income > 0 ? (
                      <T size={10} weight="700" color={isSel ? t.onPrimary : t.income} numberOfLines={1}>
                        +{formatCompactINR(d.income)}
                      </T>
                    ) : (
                      <View style={{ height: 12 }} />
                    )}
                    {d && (
                      <Row style={{ gap: 2 }}>
                        {Array.from({ length: Math.min(d.count, 3) }).map((_, k) => (
                          <View key={k} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: isSel ? t.onPrimary : t.primary }} />
                        ))}
                        {d.count > 3 && (
                          <T size={9} weight="800" color={isSel ? t.onPrimary : t.primary}>
                            +
                          </T>
                        )}
                      </Row>
                    )}
                  </Pressable>
                );
              })}
            </Row>
          ))}
        </Animated.View>
      </View>

      <View>
        <SectionTitle>{formatDayLong(selected)}</SectionTitle>
        <T size={14} color={t.muted} testID="cal-day-summary" style={{ marginTop: 4, marginBottom: 8 }}>
          {dayTotal
            ? `${dayTotal.count} ${dayTotal.count === 1 ? 'transaction' : 'transactions'} · Spent ${formatINR(dayTotal.spent)}${dayTotal.income > 0 ? ` · Income ${formatINR(dayTotal.income)}` : ''}`
            : 'No transactions on this day'}
        </T>
        {dayRows.map((tx) => (
          <TransactionRow key={tx.id} txn={tx} />
        ))}
        <View style={{ marginTop: 12 }}>
          <Button
            testID="cal-add"
            variant="soft"
            label={`Add on ${formatDayLong(selected)}`}
            onPress={() => router.push({ pathname: '/add', params: { date: selected } })}
          />
        </View>
      </View>
    </View>
  );
}

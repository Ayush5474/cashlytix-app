import { useState } from 'react';
import { Platform, TextInput } from 'react-native';

import { buildBackup, parseBackup, toCSV } from '@/domain/exporting';
import { useStore } from '@/store/useStore';
import { Button, Card, Header, Screen, SectionTitle, T } from '@/ui/components';
import { pickTextFile, saveTextFile } from '@/ui/files';
import { showToast } from '@/ui/toast';
import { radius, useTheme } from '@/ui/theme';

export default function Backup() {
  const t = useTheme();
  const [pasted, setPasted] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const snapshot = () => {
    const s = useStore.getState();
    return {
      accounts: s.accounts, categories: s.categories, transactions: s.transactions,
      friends: s.friends, groups: s.groups, recurring: s.recurring, monthlyBudget: s.monthlyBudget,
    };
  };

  const stamp = () => new Date().toISOString().slice(0, 10);

  const exportCsv = async () => {
    const d = snapshot();
    await saveTextFile(`cashlytix-transactions-${stamp()}.csv`, toCSV(d.transactions, d.accounts, d.categories, d.friends), 'text/csv');
  };
  const exportBackup = async () => {
    await saveTextFile(`cashlytix-backup-${stamp()}.json`, buildBackup(snapshot()), 'application/json');
  };

  const stage = (text: string) => {
    const r = parseBackup(text);
    if (!r.ok) {
      setPending(null);
      return setError(r.error);
    }
    setError(null);
    setPending(text);
  };

  const confirmRestore = () => {
    if (!pending) return;
    const r = parseBackup(pending);
    if (!r.ok) return setError(r.error);
    useStore.getState().importData(r.data);
    setPending(null);
    setPasted('');
    showToast('Backup restored');
  };

  return (
    <Screen header={<Header title="Backup & export" back />}>
      <Card>
        <SectionTitle>Export</SectionTitle>
        <T color={t.muted}>
          Your data lives on this device only. Save a backup now and then, especially before clearing browser data or changing phones.
        </T>
        <Button testID="export-csv" variant="soft" label="Export transactions (CSV)" onPress={exportCsv} />
        <Button testID="export-backup" label="Save full backup (JSON)" onPress={exportBackup} />
      </Card>

      <Card>
        <SectionTitle>Restore</SectionTitle>
        <T color={t.muted}>Restoring replaces everything currently in the app.</T>
        {Platform.OS === 'web' && (
          <Button
            variant="soft"
            label="Choose backup file"
            onPress={async () => {
              const text = await pickTextFile();
              if (text) stage(text);
            }}
          />
        )}
        <TextInput
          testID="restore-input"
          value={pasted}
          onChangeText={(v) => {
            setPasted(v);
            if (v.trim()) stage(v);
            else setPending(null);
          }}
          multiline
          placeholder="…or paste the backup text here"
          placeholderTextColor={t.faint}
          style={{ minHeight: 100, backgroundColor: t.bg, borderRadius: radius.md, padding: 12, color: t.text, textAlignVertical: 'top' }}
        />
        {error && <T color={t.expense} weight="600">{error}</T>}
        {pending && <T color={t.income} weight="600">Backup looks good.</T>}
        <Button testID="restore-confirm" label="Replace my data with this backup" variant="danger" disabled={!pending} onPress={confirmRestore} />
      </Card>
    </Screen>
  );
}

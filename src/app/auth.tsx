import { useState } from 'react';

import { signIn, signUp } from '@/sync/useSync';
import { Button, Field, Segmented, Sheet, T, closeSheet } from '@/ui/components';
import { useTheme } from '@/ui/theme';

type Mode = 'in' | 'up';

export default function Auth() {
  const t = useTheme();
  const [mode, setMode] = useState<Mode>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setNotice(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address.');
    if (password.length < 6) return setError('Use a password with at least 6 characters.');
    setBusy(true);
    if (mode === 'in') {
      const err = await signIn(email, password);
      setBusy(false);
      if (err) setError(err);
      else closeSheet();
    } else {
      const r = await signUp(email, password);
      setBusy(false);
      if (r.error) setError(r.error);
      else if (r.needsConfirm) {
        setMode('in');
        setNotice('Account created. Check your email, confirm it, then sign in here.');
      } else closeSheet();
    }
  };

  return (
    <Sheet
      title="Cloud sync"
      onClose={closeSheet}
      footer={<Button testID="auth-submit" label={busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'} onPress={submit} disabled={busy} />}>
      <T color={t.muted}>Sign in to keep your data safe in the cloud and the same on your phone and the website.</T>
      <Segmented
        options={[
          { id: 'in' as Mode, label: 'Sign in' },
          { id: 'up' as Mode, label: 'Create account' },
        ]}
        value={mode}
        onChange={setMode}
      />
      <Field testID="auth-email" label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
      <Field testID="auth-password" label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 6 characters" onSubmitEditing={submit} />
      {notice && <T color={t.income} weight="600">{notice}</T>}
      {error && <T color={t.expense} weight="600" testID="auth-error">{error}</T>}
    </Sheet>
  );
}

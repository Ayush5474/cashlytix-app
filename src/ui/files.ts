import { Platform, Share } from 'react-native';

/** Saves text as a download on the web, or opens the share sheet on a phone. */
export async function saveTextFile(filename: string, text: string, mime = 'text/plain') {
  if (Platform.OS === 'web') {
    const g = globalThis as any;
    const url = g.URL.createObjectURL(new g.Blob([text], { type: mime }));
    const a = g.document.createElement('a');
    a.href = url;
    a.download = filename;
    g.document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => g.URL.revokeObjectURL(url), 1000);
    return;
  }
  await Share.share({ title: filename, message: text });
}

/** Web only: lets the user choose a file and returns its text, or null if cancelled. */
export function pickTextFile(): Promise<string | null> {
  if (Platform.OS !== 'web') return Promise.resolve(null);
  const g = globalThis as any;
  return new Promise((resolve) => {
    const input = g.document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new g.FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}

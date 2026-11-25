/** Group digits the Indian way: 1,23,45,678. */
function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  let rest = digits.slice(0, -3);
  const parts: string[] = [];
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) parts.unshift(rest);
  return `${parts.join(',')},${last3}`;
}

/** Format paise as rupees, e.g. 12345600 -> "₹1,23,456". Decimals only when needed. */
export function formatINR(paise: number, opts: { sign?: boolean } = {}): string {
  const negative = paise < 0;
  const abs = Math.abs(Math.round(paise));
  const rupees = Math.floor(abs / 100);
  const fraction = abs % 100;
  let body = groupIndian(String(rupees));
  if (fraction !== 0) body += `.${String(fraction).padStart(2, '0')}`;
  const prefix = negative ? '-' : opts.sign && abs !== 0 ? '+' : '';
  return `${prefix}₹${body}`;
}

/** Turn typed text like "250", "250.5" or "1,250.50" into paise. Invalid input gives 0. */
export function parseAmountToPaise(text: string): number {
  const clean = text.replace(/[,\s₹]/g, '');
  if (!/^\d*\.?\d{0,2}$/.test(clean) || clean === '' || clean === '.') return 0;
  const [whole, frac = ''] = clean.split('.');
  return Number(whole || '0') * 100 + Number(frac.padEnd(2, '0'));
}

/** Show the digits typed on the number pad with Indian grouping, keeping a trailing dot. */
export function formatTypedAmount(text: string): string {
  if (text === '') return '0';
  const [whole, frac] = text.split('.');
  const grouped = groupIndian(whole === '' ? '0' : whole);
  return frac === undefined ? grouped : `${grouped}.${frac}`;
}

export type PadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'del';

const MAX_WHOLE_DIGITS = 9;

/** Pure number-pad reducer: returns the new typed text after a key press. */
export function pressKey(current: string, key: PadKey): string {
  if (key === 'del') return current.slice(0, -1);
  if (key === '.') {
    if (current.includes('.')) return current;
    return current === '' ? '0.' : `${current}.`;
  }
  const [whole, frac] = current.split('.');
  if (frac !== undefined) {
    return frac.length >= 2 ? current : current + key;
  }
  if (whole.length >= MAX_WHOLE_DIGITS) return current;
  if (current === '0') return key === '0' ? current : key;
  return current + key;
}

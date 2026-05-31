// Simple no-key natural language parser.
// Goal: accept inputs like:
// - "Convert 50 miles to kilometers"
// - "Convert 100F to C"
// - "25 c to f"
// - "Convert 10 kg to lb"
// - "Convert 100 USD to EUR"

const numRe = /(-?\d+(?:\.\d+)?)/i;

function normalizeUnitToken(t) {
  const s = String(t || '').trim().toLowerCase();
  const map = {
    c: 'C',
    f: 'F',
    k: 'K',
    celsius: 'C',
    fahrenheit: 'F',
    kelvin: 'K',

    m: 'm',
    meter: 'm',
    meters: 'm',
    km: 'km',
    kilometer: 'km',
    kilometers: 'km',
    ft: 'ft',
    foot: 'ft',
    feet: 'ft',
    mi: 'mi',
    mile: 'mi',
    miles: 'mi',

    kg: 'kg',
    kilogram: 'kg',
    kilograms: 'kg',
    lb: 'lb',
    lbs: 'lb',
    pound: 'lb',
    pounds: 'lb',

    usd: 'USD',
    eur: 'EUR',
    gbp: 'GBP',
    jpy: 'JPY',
  };

  return map[s] || null;
}

function parseTemp(text) {
  // Patterns: "100F to C", "Convert 25 c to f", "25 C -> F"
  const t = text;
  const n = numRe.exec(t);
  if (!n) return null;
  const value = Number(n[1]);

  // Find first unit token among C/F/K
  const fromMatch = t.match(/\b(c|f|k)\b\s*\b(to|->)\b|\b(c|f|k)\b\s*(?:to|->)\s*(c|f|k)\b/i);
  // More robust: capture "VALUE <fromUnit> ... to <toUnit>"
  const m = t.match(new RegExp(`${n[1]}\s*([cC]|[fF]|[kK])[^a-z0-9]*?(?:to|->)\s*([cC]|[fF]|[kK])`, 'i'));
  if (m) {
    const from = normalizeUnitToken(m[1]);
    const to = normalizeUnitToken(m[2]);
    if (from && to) return { kind: 'temperature', value, from, to };
  }

  // Alternative: "Convert <value> to <unit>" where from appears as initial letter after number.
  // Example: "Convert 100 F to C" works via above.

  // Another: "<value><fromUnit>" then "to <toUnit>".
  const m2 = t.match(new RegExp(`([cCfFkK])[^a-z0-9]*?(?:to|->)\s*([cCfFkK])`));
  if (m2) {
    const from = normalizeUnitToken(m2[1]);
    const to = normalizeUnitToken(m2[2]);
    if (from && to) return { kind: 'temperature', value, from, to };
  }

  return null;
}

function parseUnits(text) {
  const t = text;
  const n = numRe.exec(t);
  if (!n) return null;
  const value = Number(n[1]);

  // Try capture: "<number> <from> to <to>" with unit words/symbols.
  const m = t.match(
    new RegExp(
      `${n[1]}\s*([a-zA-Z]+|km|ft|mi|kg|lb|m)\s*(?:to|->)\s*([a-zA-Z]+|km|ft|mi|kg|lb|m)`,
      'i'
    )
  );

  if (m) {
    const from = normalizeUnitToken(m[1]);
    const to = normalizeUnitToken(m[2]);
    if (from && to && !['C', 'F', 'K', 'USD', 'EUR', 'GBP', 'JPY'].includes(from) && !['C', 'F', 'K', 'USD', 'EUR', 'GBP', 'JPY'].includes(to)) {
      return { kind: 'units', value, from, to };
    }
  }

  // Alternative: "Convert <number> <from>" "<to>" separated.
  const unitsOnly = t.match(/(m|km|ft|mi|kg|lb)\b/i);
  if (!unitsOnly) return null;
  return null;
}

function parseCurrency(text) {
  const t = text;
  const n = numRe.exec(t);
  if (!n) return null;
  const value = Number(n[1]);

  // Patterns: "100 USD to EUR" / "USD 100 to EUR"
  const m1 = t.match(new RegExp(`${n[1]}\s*([a-zA-Z]{3})\s*(?:to|->)\s*([a-zA-Z]{3})`, 'i'));
  if (m1) {
    const from = normalizeUnitToken(m1[1]);
    const to = normalizeUnitToken(m1[2]);
    if (from && to) return { kind: 'currency', value, from, to };
  }

  const m2 = t.match(new RegExp(`([a-zA-Z]{3})\s*${n[1]}\s*(?:to|->)\s*([a-zA-Z]{3})`, 'i'));
  if (m2) {
    const from = normalizeUnitToken(m2[1]);
    const to = normalizeUnitToken(m2[2]);
    if (from && to) return { kind: 'currency', value, from, to };
  }

  return null;
}

export function parseNaturalLanguage(input) {
  const text = String(input || '').trim();
  if (!text) throw new Error('Please enter something to convert.');

  // If user includes explicit keywords, try those first.
  const lower = text.toLowerCase();
  const isConvert = lower.includes('convert');

  // Try temperature, units, currency.
  const temp = parseTemp(text);
  if (temp) return { ...temp, source: 'nlp' };

  const units = parseUnits(text);
  if (units) return { ...units, source: 'nlp' };

  const cur = parseCurrency(text);
  if (cur) return { ...cur, source: 'nlp' };

  // If nothing matched, attempt a very small fallback:
  // look for "<num> <unit>" and "to <unit>" with known tokens
  const fallback = parseCurrency(text) || parseTemp(text) || parseUnits(text);
  if (fallback) return { ...fallback, source: isConvert ? 'nlp' : 'nlp' };

  throw new Error('Could not understand the input. Examples: "Convert 50 miles to kilometers", "Convert 100F to C", "Convert 100 USD to EUR"');
}


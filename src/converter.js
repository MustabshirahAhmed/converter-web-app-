export function roundTo(value, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

const temperature = {
  C: {
    toC: (x) => x,
    fromC: (x) => x,
    toF: (x) => (x * 9) / 5 + 32,
    fromF: (x) => (x - 32) * 5 / 9,
    toK: (x) => x + 273.15,
    fromK: (x) => x - 273.15,
  },
  F: {
    toC: (x) => (x - 32) * 5 / 9,
    fromC: (x) => (x * 9) / 5 + 32,
    toF: (x) => x,
    fromF: (x) => x,
    toK: (x) => (x - 32) * 5 / 9 + 273.15,
    fromK: (x) => (x - 273.15) * 9 / 5 + 32,
  },
  K: {
    toC: (x) => x - 273.15,
    fromC: (x) => x + 273.15,
    toF: (x) => (x - 273.15) * 9 / 5 + 32,
    fromF: (x) => (x - 32) * 5 / 9 + 273.15,
    toK: (x) => x,
    fromK: (x) => x,
  },
};

export function convertTemperature(value, from, to) {
  const v = Number(value);
  if (!Number.isFinite(v)) throw new Error('Temperature value must be a valid number.');
  const valid = ['C', 'F', 'K'];
  if (!valid.includes(from) || !valid.includes(to)) throw new Error('Unsupported temperature units.');

  // Convert from -> C -> target
  let c;
  if (from === 'C') c = v;
  if (from === 'F') c = temperature.F.toC(v);
  if (from === 'K') c = temperature.K.toC(v);

  if (to === 'C') return c;
  if (to === 'F') return temperature.C.toF(c);
  if (to === 'K') return temperature.C.toK(c);
}

const unitFactors = {
  // length: meters based
  m: { kind: 'length', toBase: (x) => x, fromBase: (x) => x },
  km: { kind: 'length', toBase: (x) => x * 1000, fromBase: (x) => x / 1000 },
  ft: { kind: 'length', toBase: (x) => x * 0.3048, fromBase: (x) => x / 0.3048 },
  mi: { kind: 'length', toBase: (x) => x * 1609.344, fromBase: (x) => x / 1609.344 },

  // mass: kilograms based
  kg: { kind: 'mass', toBase: (x) => x, fromBase: (x) => x },
  lb: { kind: 'mass', toBase: (x) => x * 0.45359237, fromBase: (x) => x / 0.45359237 },
};

export function convertUnits(value, from, to) {
  const v = Number(value);
  if (!Number.isFinite(v)) throw new Error('Units value must be a valid number.');
  const fromKey = from;
  const toKey = to;
  if (!unitFactors[fromKey] || !unitFactors[toKey]) throw new Error('Unsupported unit.');
  const a = unitFactors[fromKey];
  const b = unitFactors[toKey];
  if (a.kind !== b.kind) throw new Error(`Incompatible unit kinds: ${fromKey} (${a.kind}) -> ${toKey} (${b.kind}).`);

  const base = a.toBase(v);
  return b.fromBase(base);
}

// Currency conversion (UI will call this and it will fetch rates)
let _cache = { at: 0, rates: null };

export async function convertCurrency(value, from, to, fetchFn = fetch) {
  const v = Number(value);
  if (!Number.isFinite(v)) throw new Error('Currency value must be a valid number.');
  const fromCode = String(from || '').toUpperCase();
  const toCode = String(to || '').toUpperCase();

  if (!fromCode || !toCode) throw new Error('Currency codes are required.');

  // Cache rates for 12 hours
  const now = Date.now();
  if (!_cache.rates || now - _cache.at > 12 * 60 * 60 * 1000) {
    // Try multiple APIs for better reliability
    const apis = [
      { url: `https://api.exchangerate-api.com/v4/latest/${encodeURIComponent(fromCode)}`, parseRate: (data) => data.rates },
      { url: `https://api.exchangerate.host/latest?base=${encodeURIComponent(fromCode)}`, parseRate: (data) => data.rates },
    ];

    let rates = null;
    let lastError = null;

    for (const api of apis) {
      try {
        console.log('Fetching currency rates from:', api.url);
        const res = await fetchFn(api.url);
        console.log('Currency API response status:', res.status);
        if (!res.ok) {
          lastError = `API request failed: ${res.status} ${res.statusText}`;
          continue;
        }
        const data = await res.json();
        console.log('Currency API data:', data);
        rates = api.parseRate(data);
        if (rates) {
          console.log('Successfully fetched rates');
          break;
        }
      } catch (err) {
        console.warn('API failed, trying next one:', err.message);
        lastError = err.message;
        continue;
      }
    }

    if (!rates) {
      throw new Error(`Currency API failed: ${lastError || 'No rates available'}`);
    }

    _cache = { at: now, rates };
  }

  const rate = _cache.rates[toCode];
  if (!Number.isFinite(rate)) throw new Error(`No exchange rate found for ${fromCode} -> ${toCode}.`);

  const out = v * rate;
  return { out, rate };
}


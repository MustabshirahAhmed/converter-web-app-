import { convertCurrency, convertTemperature, convertUnits, roundTo } from './converter.js';
import { parseNaturalLanguage } from './nlp.js';
import { getConversionExplanation } from './ai.js';

const $ = (id) => document.getElementById(id);

// Get element references (will be populated when DOM is ready)
let els = {};

function initializeElements() {
  els = {
    nl: $('nl'),
    mode: $('mode'),
    round: $('round'),
    convertBtn: $('convertBtn'),
    results: $('results'),
    resInput: $('resInput'),
    resOutput: $('resOutput'),
    resDetails: $('resDetails'),
    error: $('error'),
    statusPill: $('statusPill'),

    // AI UI
    aiEnabled: $('aiEnabled'),

    // Quick controls
    tempValue: $('tempValue'),
    tempFrom: $('tempFrom'),
    tempTo: $('tempTo'),
    tempBtn: $('tempBtn'),
    tempResults: $('tempResults'),
    tempResOutput: $('tempResOutput'),

    unitsValue: $('unitsValue'),
    unitFrom: $('unitFrom'),
    unitTo: $('unitTo'),
    unitsBtn: $('unitsBtn'),
    unitsResults: $('unitsResults'),
    unitsResOutput: $('unitsResOutput'),

    curValue: $('curValue'),
    curFrom: $('curFrom'),
    curTo: $('curTo'),
    curBtn: $('curBtn'),
    curResults: $('curResults'),
    curResOutput: $('curResOutput'),
  };
}

function setStatus(msg) {
  els.statusPill.textContent = msg;
}

function showError(msg) {
  els.error.hidden = false;
  els.error.textContent = msg;
  console.error('Error:', msg);
}

function clearError() {
  els.error.hidden = true;
  els.error.textContent = '';
}

function showResults(input, output, details) {
  els.results.hidden = false;
  els.resInput.textContent = input;
  els.resOutput.textContent = output;
  els.resDetails.textContent = details;
}

function getRounding() {
  return Number(els.round.value);
}

async function maybeAppendAIExplanation({ kind, value, from, to, baseDetails }) {
  if (!els.aiEnabled || !els.aiEnabled.checked) return baseDetails;

  const { explanation } = await getConversionExplanation({ kind, value, from, to });
  return `${baseDetails}\n\nAI explanation:\n${explanation}`;
}

async function handleConversion({ kind, value, from, to }) {
  const decimals = getRounding();
  const inputLabel = `${value} ${from} -> ${to}`;

  if (kind === 'temperature') {
    const out = convertTemperature(value, from, to);
    const rounded = roundTo(out, decimals);
    const baseDetails = `Formula: ${from} → °C → ${to}`;
    const finalDetails = await maybeAppendAIExplanation({ kind, value, from, to, baseDetails });
    showResults(inputLabel, `${rounded}`, finalDetails);
    return;
  }

  if (kind === 'units') {
    const out = convertUnits(value, from, to);
    const rounded = roundTo(out, decimals);
    const baseDetails = 'Converted using unit factors (base units).';
    const finalDetails = await maybeAppendAIExplanation({ kind, value, from, to, baseDetails });
    showResults(inputLabel, `${rounded}`, finalDetails);
    return;
  }

  if (kind === 'currency') {
    setStatus('Fetching exchange rate...');
    const { out, rate } = await convertCurrency(value, from, to);
    const rounded = roundTo(out, decimals);
    const roundedRate = roundTo(rate, 6);
    const baseDetails = `Rate: 1 ${from} = ${roundedRate} ${to}`;
    const finalDetails = await maybeAppendAIExplanation({ kind, value, from, to, baseDetails });
    showResults(inputLabel, `${rounded}`, finalDetails);
    setStatus('Ready');
    return;
  }

  throw new Error('Unsupported conversion kind.');
}

async function onNaturalLanguage() {
  clearError();
  els.results.hidden = true;
  setStatus('Parsing...');

  try {
    const input = els.nl.value;
    const mode = els.mode.value;

    const parsed = parseNaturalLanguage(input);

    if (mode !== 'auto' && mode !== parsed.kind) {
      throw new Error(`Mode is set to ${mode}, but the input looks like ${parsed.kind}.`);
    }

    setStatus('Converting...');
    await handleConversion(parsed);
    setStatus('Ready');
  } catch (e) {
    setStatus('Ready');
    showError(e?.message || String(e));
  }
}

function onTempQuick() {
  clearError();
  els.results.hidden = true;

  try {
    const value = Number(els.tempValue.value);
    const from = els.tempFrom.value;
    const to = els.tempTo.value;

    const out = convertTemperature(value, from, to);
    const rounded = roundTo(out, getRounding());
    els.tempResults.hidden = false;
    els.tempResOutput.textContent = `${rounded} ${to}`;
  } catch (e) {
    showError(e?.message || String(e));
  }
}

function onUnitsQuick() {
  clearError();
  els.results.hidden = true;

  try {
    const value = Number(els.unitsValue.value);
    const from = els.unitFrom.value;
    const to = els.unitTo.value;

    const out = convertUnits(value, from, to);
    const rounded = roundTo(out, getRounding());
    els.unitsResults.hidden = false;
    els.unitsResOutput.textContent = `${rounded} ${to}`;
  } catch (e) {
    showError(e?.message || String(e));
  }
}

async function onCurrencyQuick() {
  clearError();
  els.results.hidden = true;

  try {
    const value = Number(els.curValue.value);
    const from = els.curFrom.value;
    const to = els.curTo.value;

    setStatus('Fetching exchange rate...');
    const { out, rate } = await convertCurrency(value, from, to);
    const rounded = roundTo(out, getRounding());

    els.curResults.hidden = false;
    els.curResOutput.textContent = `${rounded} ${to}`;

    setStatus('Ready');
  } catch (e) {
    setStatus('Ready');
    showError(e?.message || String(e));
  }
}

// Safely attach event listeners with null checks
function attachEventListeners() {
  initializeElements();
  
  if (els.convertBtn) {
    els.convertBtn.addEventListener('click', onNaturalLanguage);
  }

  if (els.nl) {
    els.nl.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') onNaturalLanguage();
    });
  }

  if (els.tempBtn) {
    els.tempBtn.addEventListener('click', onTempQuick);
  }

  if (els.unitsBtn) {
    els.unitsBtn.addEventListener('click', onUnitsQuick);
  }

  if (els.curBtn) {
    els.curBtn.addEventListener('click', onCurrencyQuick);
  }
}

// Attach listeners when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', attachEventListeners);
} else {
  attachEventListeners();
}


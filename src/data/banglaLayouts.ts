import {
  FingerZone,
  KeystrokeInstruction,
  LayoutDefinition,
  LayoutId,
  PhysicalKeyDef,
} from '../types/typing';

export const FINGER_LABELS: Record<FingerZone, string> = {
  'pinky-l': 'Left Pinky',
  'ring-l': 'Left Ring',
  'middle-l': 'Left Middle',
  'index-l': 'Left Index',
  thumb: 'Thumb',
  'index-r': 'Right Index',
  'middle-r': 'Right Middle',
  'ring-r': 'Right Ring',
  'pinky-r': 'Right Pinky',
};

export const KEYBOARD_ROWS: PhysicalKeyDef[][] = [
  [
    { code: 'Backquote', key: '`', shiftKey: '~', label: '`', finger: 'pinky-l' },
    { code: 'Digit1', key: '1', shiftKey: '!', label: '1', finger: 'pinky-l' },
    { code: 'Digit2', key: '2', shiftKey: '@', label: '2', finger: 'ring-l' },
    { code: 'Digit3', key: '3', shiftKey: '#', label: '3', finger: 'middle-l' },
    { code: 'Digit4', key: '4', shiftKey: '$', label: '4', finger: 'index-l' },
    { code: 'Digit5', key: '5', shiftKey: '%', label: '5', finger: 'index-l' },
    { code: 'Digit6', key: '6', shiftKey: '^', label: '6', finger: 'index-r' },
    { code: 'Digit7', key: '7', shiftKey: '&', label: '7', finger: 'index-r' },
    { code: 'Digit8', key: '8', shiftKey: '*', label: '8', finger: 'middle-r' },
    { code: 'Digit9', key: '9', shiftKey: '(', label: '9', finger: 'ring-r' },
    { code: 'Digit0', key: '0', shiftKey: ')', label: '0', finger: 'pinky-r' },
    { code: 'Minus', key: '-', shiftKey: '_', label: '-', finger: 'pinky-r' },
    { code: 'Equal', key: '=', shiftKey: '+', label: '=', finger: 'pinky-r' },
    { code: 'Backspace', key: 'Backspace', shiftKey: 'Backspace', label: 'Backspace', width: 2, finger: 'pinky-r', isModifier: true },
  ],
  [
    { code: 'Tab', key: 'Tab', shiftKey: 'Tab', label: 'Tab', width: 1.5, finger: 'pinky-l', isModifier: true },
    { code: 'KeyQ', key: 'q', shiftKey: 'Q', label: 'Q', finger: 'pinky-l' },
    { code: 'KeyW', key: 'w', shiftKey: 'W', label: 'W', finger: 'ring-l' },
    { code: 'KeyE', key: 'e', shiftKey: 'E', label: 'E', finger: 'middle-l' },
    { code: 'KeyR', key: 'r', shiftKey: 'R', label: 'R', finger: 'index-l' },
    { code: 'KeyT', key: 't', shiftKey: 'T', label: 'T', finger: 'index-l' },
    { code: 'KeyY', key: 'y', shiftKey: 'Y', label: 'Y', finger: 'index-r' },
    { code: 'KeyU', key: 'u', shiftKey: 'U', label: 'U', finger: 'index-r' },
    { code: 'KeyI', key: 'i', shiftKey: 'I', label: 'I', finger: 'middle-r' },
    { code: 'KeyO', key: 'o', shiftKey: 'O', label: 'O', finger: 'ring-r' },
    { code: 'KeyP', key: 'p', shiftKey: 'P', label: 'P', finger: 'pinky-r' },
    { code: 'BracketLeft', key: '[', shiftKey: '{', label: '[', finger: 'pinky-r' },
    { code: 'BracketRight', key: ']', shiftKey: '}', label: ']', finger: 'pinky-r' },
    { code: 'Backslash', key: '\\', shiftKey: '|', label: '\\', width: 1.5, finger: 'pinky-r' },
  ],
  [
    { code: 'CapsLock', key: 'CapsLock', shiftKey: 'CapsLock', label: 'Caps', width: 1.75, finger: 'pinky-l', isModifier: true },
    { code: 'KeyA', key: 'a', shiftKey: 'A', label: 'A', finger: 'pinky-l' },
    { code: 'KeyS', key: 's', shiftKey: 'S', label: 'S', finger: 'ring-l' },
    { code: 'KeyD', key: 'd', shiftKey: 'D', label: 'D', finger: 'middle-l' },
    { code: 'KeyF', key: 'f', shiftKey: 'F', label: 'F', finger: 'index-l' },
    { code: 'KeyG', key: 'g', shiftKey: 'G', label: 'G', finger: 'index-l' },
    { code: 'KeyH', key: 'h', shiftKey: 'H', label: 'H', finger: 'index-r' },
    { code: 'KeyJ', key: 'j', shiftKey: 'J', label: 'J', finger: 'index-r' },
    { code: 'KeyK', key: 'k', shiftKey: 'K', label: 'K', finger: 'middle-r' },
    { code: 'KeyL', key: 'l', shiftKey: 'L', label: 'L', finger: 'ring-r' },
    { code: 'Semicolon', key: ';', shiftKey: ':', label: ';', finger: 'pinky-r' },
    { code: 'Quote', key: "'", shiftKey: '"', label: "'", finger: 'pinky-r' },
    { code: 'Enter', key: 'Enter', shiftKey: 'Enter', label: 'Enter', width: 2.25, finger: 'pinky-r', isModifier: true },
  ],
  [
    { code: 'ShiftLeft', key: 'Shift', shiftKey: 'Shift', label: 'Shift', width: 2.25, finger: 'pinky-l', isModifier: true },
    { code: 'KeyZ', key: 'z', shiftKey: 'Z', label: 'Z', finger: 'pinky-l' },
    { code: 'KeyX', key: 'x', shiftKey: 'X', label: 'X', finger: 'ring-l' },
    { code: 'KeyC', key: 'c', shiftKey: 'C', label: 'C', finger: 'middle-l' },
    { code: 'KeyV', key: 'v', shiftKey: 'V', label: 'V', finger: 'index-l' },
    { code: 'KeyB', key: 'b', shiftKey: 'B', label: 'B', finger: 'index-l' },
    { code: 'KeyN', key: 'n', shiftKey: 'N', label: 'N', finger: 'index-r' },
    { code: 'KeyM', key: 'm', shiftKey: 'M', label: 'M', finger: 'index-r' },
    { code: 'Comma', key: ',', shiftKey: '<', label: ',', finger: 'middle-r' },
    { code: 'Period', key: '.', shiftKey: '>', label: '.', finger: 'ring-r' },
    { code: 'Slash', key: '/', shiftKey: '?', label: '/', finger: 'pinky-r' },
    { code: 'ShiftRight', key: 'Shift', shiftKey: 'Shift', label: 'Shift', width: 2.75, finger: 'pinky-r', isModifier: true },
  ],
  [
    { code: 'Space', key: ' ', shiftKey: ' ', label: 'Space', width: 6.5, finger: 'thumb' },
  ],
];

export const PHYSICAL_KEY_BY_CODE: Record<string, PhysicalKeyDef> = Object.fromEntries(
  KEYBOARD_ROWS.flat().map((k) => [k.code, k])
);

const PROBHAT_KEYMAP: Record<string, { normal: string; shift: string }> = {
  Backquote: { normal: '`', shift: '~' },
  Digit1: { normal: '১', shift: '!' },
  Digit2: { normal: '২', shift: '@' },
  Digit3: { normal: '৩', shift: '#' },
  Digit4: { normal: '৪', shift: '৳' },
  Digit5: { normal: '৫', shift: '%' },
  Digit6: { normal: '৬', shift: '^' },
  Digit7: { normal: '৭', shift: 'ঞ' },
  Digit8: { normal: '৮', shift: 'ং' },
  Digit9: { normal: '৯', shift: '(' },
  Digit0: { normal: '০', shift: ')' },
  Minus: { normal: '-', shift: '_' },
  Equal: { normal: '=', shift: '+' },

  KeyQ: { normal: 'দ', shift: 'ধ' },
  KeyW: { normal: 'ূ', shift: 'ঊ' },
  KeyE: { normal: 'ী', shift: 'ঈ' },
  KeyR: { normal: 'র', shift: 'ড়' },
  KeyT: { normal: 'ট', shift: 'ঠ' },
  KeyY: { normal: 'এ', shift: 'ঐ' },
  KeyU: { normal: 'ু', shift: 'উ' },
  KeyI: { normal: 'ি', shift: 'ই' },
  KeyO: { normal: 'ও', shift: 'ঔ' },
  KeyP: { normal: 'প', shift: 'ফ' },
  BracketLeft: { normal: 'ে', shift: 'ৈ' },
  BracketRight: { normal: 'ো', shift: 'ৌ' },
  Backslash: { normal: 'ৎ', shift: 'ঃ' },

  KeyA: { normal: 'া', shift: 'অ' },
  KeyS: { normal: 'স', shift: 'শ' },
  KeyD: { normal: 'ড', shift: 'ঢ' },
  KeyF: { normal: 'ত', shift: 'থ' },
  KeyG: { normal: 'গ', shift: 'ঘ' },
  KeyH: { normal: 'হ', shift: 'ঃ' },
  KeyJ: { normal: 'জ', shift: 'ঝ' },
  KeyK: { normal: 'ক', shift: 'খ' },
  KeyL: { normal: 'ল', shift: 'ং' },
  Semicolon: { normal: ';', shift: ':' },
  Quote: { normal: "'", shift: '"' },

  KeyZ: { normal: 'য়', shift: 'য' },
  KeyX: { normal: 'ষ', shift: 'ঢ়' },
  KeyC: { normal: 'চ', shift: 'ছ' },
  KeyV: { normal: 'আ', shift: 'ঋ' },
  KeyB: { normal: 'ব', shift: 'ভ' },
  KeyN: { normal: 'ন', shift: 'ণ' },
  KeyM: { normal: 'ম', shift: 'ঙ' },
  Comma: { normal: ',', shift: 'ৃ' },
  Period: { normal: '।', shift: 'ঁ' },
  Slash: { normal: '্', shift: '?' },
  Space: { normal: ' ', shift: ' ' },
};

const UNIJOY_KEYMAP: Record<string, { normal: string; shift: string }> = {
  Backquote: { normal: '`', shift: '~' },
  Digit1: { normal: '১', shift: '!' },
  Digit2: { normal: '২', shift: '@' },
  Digit3: { normal: '৩', shift: '#' },
  Digit4: { normal: '৪', shift: '৳' },
  Digit5: { normal: '৫', shift: '%' },
  Digit6: { normal: '৬', shift: '^' },
  Digit7: { normal: '৭', shift: 'ঁ' },
  Digit8: { normal: '৮', shift: '*' },
  Digit9: { normal: '৯', shift: '(' },
  Digit0: { normal: '০', shift: ')' },
  Minus: { normal: '-', shift: '_' },
  Equal: { normal: '=', shift: '+' },

  KeyQ: { normal: 'ঙ', shift: 'ং' },
  KeyW: { normal: 'য', shift: 'য়' },
  KeyE: { normal: 'ড', shift: 'ঢ' },
  KeyR: { normal: 'প', shift: 'ফ' },
  KeyT: { normal: 'ট', shift: 'ঠ' },
  KeyY: { normal: 'চ', shift: 'ছ' },
  KeyU: { normal: 'জ', shift: 'ঝ' },
  KeyI: { normal: 'হ', shift: 'ঞ' },
  KeyO: { normal: 'গ', shift: 'ঘ' },
  KeyP: { normal: 'ড়', shift: 'ঢ়' },
  BracketLeft: { normal: '[', shift: '{' },
  BracketRight: { normal: ']', shift: '}' },
  Backslash: { normal: 'ৎ', shift: 'ঃ' },

  KeyA: { normal: 'ৃ', shift: 'র্' },
  KeyS: { normal: 'ু', shift: 'ূ' },
  KeyD: { normal: 'ি', shift: 'ী' },
  KeyF: { normal: 'া', shift: 'অ' },
  KeyG: { normal: '্', shift: '।' },
  KeyH: { normal: 'ব', shift: 'ভ' },
  KeyJ: { normal: 'ক', shift: 'খ' },
  KeyK: { normal: 'ত', shift: 'থ' },
  KeyL: { normal: 'দ', shift: 'ধ' },
  Semicolon: { normal: ';', shift: ':' },
  Quote: { normal: "'", shift: '"' },

  KeyZ: { normal: 'ঁ', shift: 'ঃ' },
  KeyX: { normal: 'ো', shift: 'ৌ' },
  KeyC: { normal: 'ে', shift: 'ৈ' },
  KeyV: { normal: 'র', shift: 'ল' },
  KeyB: { normal: 'ন', shift: 'ণ' },
  KeyN: { normal: 'স', shift: 'ষ' },
  KeyM: { normal: 'ম', shift: 'শ' },
  Comma: { normal: ',', shift: '<' },
  Period: { normal: '.', shift: '>' },
  Slash: { normal: '/', shift: '?' },
  Space: { normal: ' ', shift: ' ' },
};

const JATIYA_KEYMAP: Record<string, { normal: string; shift: string }> = {
  Backquote: { normal: 'ঁ', shift: 'ং' },
  Digit1: { normal: '১', shift: '!' },
  Digit2: { normal: '২', shift: '@' },
  Digit3: { normal: '৩', shift: '#' },
  Digit4: { normal: '৪', shift: '৳' },
  Digit5: { normal: '৫', shift: '%' },
  Digit6: { normal: '৬', shift: '^' },
  Digit7: { normal: '৭', shift: '&' },
  Digit8: { normal: '৮', shift: '*' },
  Digit9: { normal: '৯', shift: '(' },
  Digit0: { normal: '০', shift: ')' },
  Minus: { normal: '-', shift: '_' },
  Equal: { normal: '=', shift: '+' },

  KeyQ: { normal: 'ঙ', shift: 'ং' },
  KeyW: { normal: 'য', shift: 'য়' },
  KeyE: { normal: 'ড', shift: 'ঢ' },
  KeyR: { normal: 'প', shift: 'ফ' },
  KeyT: { normal: 'ট', shift: 'ঠ' },
  KeyY: { normal: 'চ', shift: 'ছ' },
  KeyU: { normal: 'জ', shift: 'ঝ' },
  KeyI: { normal: 'হ', shift: 'ঞ' },
  KeyO: { normal: 'গ', shift: 'ঘ' },
  KeyP: { normal: 'ড়', shift: 'ঢ়' },
  BracketLeft: { normal: 'ে', shift: 'ৈ' },
  BracketRight: { normal: 'ো', shift: 'ৌ' },
  Backslash: { normal: 'ৎ', shift: 'ঃ' },

  KeyA: { normal: 'ৃ', shift: 'অ' },
  KeyS: { normal: 'ু', shift: 'ূ' },
  KeyD: { normal: 'ি', shift: 'ী' },
  KeyF: { normal: 'া', shift: 'অ' },
  KeyG: { normal: '্', shift: '।' },
  KeyH: { normal: 'ব', shift: 'ভ' },
  KeyJ: { normal: 'ক', shift: 'খ' },
  KeyK: { normal: 'ত', shift: 'থ' },
  KeyL: { normal: 'দ', shift: 'ধ' },
  Semicolon: { normal: ';', shift: ':' },
  Quote: { normal: "'", shift: '"' },

  KeyZ: { normal: 'ঁ', shift: 'ঃ' },
  KeyX: { normal: 'ো', shift: 'ৌ' },
  KeyC: { normal: 'ে', shift: 'ৈ' },
  KeyV: { normal: 'র', shift: 'ল' },
  KeyB: { normal: 'ন', shift: 'ণ' },
  KeyN: { normal: 'স', shift: 'ষ' },
  KeyM: { normal: 'ম', shift: 'শ' },
  Comma: { normal: ',', shift: 'ৎ' },
  Period: { normal: '।', shift: '>' },
  Slash: { normal: '/', shift: '?' },
  Space: { normal: ' ', shift: ' ' },
};

// Vowel sign -> Standalone vowel composition when preceded by Link (্ / KeyG) in Unijoy/Jatiya
export const LINK_VOWEL_COMPOSITION: Record<string, string> = {
  'া': 'আ',
  'ি': 'ই',
  'ী': 'ঈ',
  'ু': 'উ',
  'ূ': 'ঊ',
  'ৃ': 'ঋ',
  'ে': 'এ',
  'ৈ': 'ঐ',
  'ো': 'ও',
  'ৌ': 'ঔ',
};

export const VOWEL_TO_KAR: Record<string, string> = Object.fromEntries(
  Object.entries(LINK_VOWEL_COMPOSITION).map(([kar, vowel]) => [vowel, kar])
);

export const BANGLA_LAYOUTS: Record<LayoutId, LayoutDefinition> = {
  probhat: {
    id: 'probhat',
    name: 'Probhat',
    banglaName: 'প্রভাত',
    subtitle: 'Fixed Phonetic-Ergonomic',
    description:
      'One key per character with direct standalone vowels. Ideal for Keybr-style Bangla touch typing with zero composition delays.',
    usesLinkComposition: false,
    keymap: PROBHAT_KEYMAP,
  },
  unijoy: {
    id: 'unijoy',
    name: 'Unijoy (Bijoy)',
    banglaName: 'ইউনিজয়',
    subtitle: 'Classic Desktop Standard',
    description:
      'Bangladesh publishing standard (Bijoy-compatible Unicode). Uses G (্) as a link key to form conjuncts and standalone vowels (G + া = আ).',
    usesLinkComposition: true,
    linkKeyCode: 'KeyG',
    keymap: UNIJOY_KEYMAP,
  },
  jatiya: {
    id: 'jatiya',
    name: 'Jatiya (National)',
    banglaName: 'জাতীয়',
    subtitle: 'Official BCC Ergonomic',
    description:
      'Official Bangladesh Computer Council ergonomic layout placing high-frequency consonants and vowel signs along the home row.',
    usesLinkComposition: true,
    linkKeyCode: 'KeyG',
    keymap: JATIYA_KEYMAP,
  },
  ime: {
    id: 'ime',
    name: 'System IME / Avro',
    banglaName: 'সিস্টেম কিবোর্ড',
    subtitle: 'Use OS Bangla or Avro',
    description:
      'Practice directly using your operating system Bangla keyboard (Avro Keyboard, OpenBangla, macOS/Windows Bengali IME).',
    usesLinkComposition: false,
    keymap: PROBHAT_KEYMAP, // visual reference fallback
  },
};

export function mapPhysicalKeyToBangla(
  layoutId: LayoutId,
  code: string,
  shiftPressed: boolean
): string | null {
  const layout = BANGLA_LAYOUTS[layoutId];
  const mapping = layout.keymap[code];
  if (!mapping) return null;
  return shiftPressed ? mapping.shift : mapping.normal;
}

export function findKeystrokeForBanglaChar(
  layoutId: LayoutId,
  targetChar: string
): KeystrokeInstruction | null {
  const layout = BANGLA_LAYOUTS[layoutId];

  // 1. Direct lookup
  for (const [code, mapping] of Object.entries(layout.keymap)) {
    const def = PHYSICAL_KEY_BY_CODE[code];
    if (!def) continue;
    if (mapping.normal === targetChar) {
      return {
        targetChar,
        displayHint: `${def.label} → ${targetChar}`,
        sequence: [
          {
            code,
            keyLabel: def.label,
            shift: false,
            finger: def.finger,
            outputLabel: targetChar,
          },
        ],
      };
    }
    if (mapping.shift === targetChar) {
      return {
        targetChar,
        displayHint: `Shift + ${def.label} → ${targetChar}`,
        sequence: [
          {
            code,
            keyLabel: def.label,
            shift: true,
            finger: def.finger,
            outputLabel: targetChar,
          },
        ],
      };
    }
  }

  // 2. Link composition lookup (for Unijoy / Jatiya standalone vowels like আ = g + f)
  if (layout.usesLinkComposition && layout.linkKeyCode && VOWEL_TO_KAR[targetChar]) {
    const kar = VOWEL_TO_KAR[targetChar];
    const karStep = findKeystrokeForBanglaChar(layoutId, kar);
    const linkDef = PHYSICAL_KEY_BY_CODE[layout.linkKeyCode];
    if (karStep && linkDef && karStep.sequence.length > 0) {
      const s = karStep.sequence[0];
      return {
        targetChar,
        displayHint: `${linkDef.label} (্) + ${s.shift ? `Shift+${s.keyLabel}` : s.keyLabel} (${kar}) → ${targetChar}`,
        sequence: [
          {
            code: layout.linkKeyCode,
            keyLabel: linkDef.label,
            shift: false,
            finger: linkDef.finger,
            outputLabel: '্',
          },
          s,
        ],
      };
    }
  }

  return null;
}

export function getCharNameEnglish(ch: string): string {
  const names: Record<string, string> = {
    'অ': 'Shoro O',
    'আ': 'Shoro A',
    'ই': 'Hrosho I',
    'ঈ': 'Dirgho I',
    'উ': 'Hrosho U',
    'ঊ': 'Dirgho U',
    'ঋ': 'Ri',
    'এ': 'E',
    'ঐ': 'Oi',
    'ও': 'O',
    'ঔ': 'Ou',
    'া': 'Aa-kar',
    'ি': 'Hrosho I-kar',
    'ী': 'Dirgho I-kar',
    'ু': 'Hrosho U-kar',
    'ূ': 'Dirgho U-kar',
    'ৃ': 'Ri-kar',
    'ে': 'E-kar',
    'ৈ': 'Oi-kar',
    'ো': 'O-kar',
    'ৌ': 'Ou-kar',
    'ক': 'Ko',
    'খ': 'Kho',
    'গ': 'Go',
    'ঘ': 'Gho',
    'ঙ': 'Umo',
    'চ': 'Cho',
    'ছ': 'Chho',
    'জ': 'Borgiyo Jo',
    'ঝ': 'Jho',
    'ঞ': 'Iyo',
    'ট': 'To (Retroflex)',
    'ঠ': 'Tho (Retroflex)',
    'ড': 'Do (Retroflex)',
    'ঢ': 'Dho (Retroflex)',
    'ণ': 'Murdhonno No',
    'ত': 'To (Dental)',
    'থ': 'Tho (Dental)',
    'দ': 'Do (Dental)',
    'ধ': 'Dho (Dental)',
    'ন': 'Donto No',
    'প': 'Po',
    'ফ': 'Pho',
    'ব': 'Bo',
    'ভ': 'Bho',
    'ম': 'Mo',
    'য': 'Ontostho Jo',
    'র': 'Bo-e-shunno Ro',
    'ল': 'Lo',
    'শ': 'Talobbo Sho',
    'ষ': 'Murdhonno Sho',
    'স': 'Donto So',
    'হ': 'Ho',
    'ড়': 'Do-e-shunno Ro',
    'ঢ়': 'Dho-e-shunno Ro',
    'য়': 'Ontostho O',
    'ৎ': 'Khondo To',
    'ং': 'Onushwar',
    'ঃ': 'Bishorgo',
    'ঁ': 'Chondrobindu',
    '্': 'Hasanta (Link)',
    '।': 'Dari (Period)',
    ' ': 'Space',
  };
  return names[ch] || ch;
}

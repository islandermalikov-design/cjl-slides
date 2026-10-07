// Draws the small coronal-section schematics for slide 11 (editable: change SVG, re-run).
const sharp = require('sharp');
const fs = require('fs');
const NAVY = '#0B2545', BLUE = '#1B759C', TEAL = '#0E8C8C', RED = '#D62839', ORANGE = '#E58A1F';

function base({ socket = false, ostiumWide = false, windowAnterior = null, inferiorOpening = false } = {}) {
  const sinus = `M62 56 Q120 38 182 66 L188 122 Q184 160 150 166 L66 162 Q30 152 36 106 Q38 72 62 56 Z`;
  const tooth = (x, roots = true) => `
    <path d="M${x} 188 Q${x + 2} 176 ${x + 14} 176 L${x + 36} 176 Q${x + 48} 176 ${x + 50} 188 L${x + 46} 226 Q${x + 25} 238 ${x + 4} 226 Z" fill="#FFFFFF" stroke="#C9B79C" stroke-width="2.5"/>
    <path d="M${x + 12} 178 L${x + 18} 160 L${x + 24} 178 M${x + 28} 178 L${x + 34} 162 L${x + 38} 178" fill="#FFFFFF" stroke="#C9B79C" stroke-width="2.5"/>`;
  return `
  <rect x="0" y="0" width="300" height="240" rx="18" fill="#F6F1E8"/>
  <path d="M0 168 L300 168 L300 240 L0 240 Z" fill="#EBDDC6"/>
  <rect x="0" y="0" width="300" height="240" rx="18" fill="none"/>
  <!-- nasal cavity -->
  <rect x="198" y="14" width="64" height="160" rx="26" fill="#F9D9D9" stroke="#D98E96" stroke-width="3"/>
  <line x1="230" y1="20" x2="230" y2="170" stroke="#D98E96" stroke-width="2" stroke-dasharray="5 5"/>
  <!-- sinus -->
  <path d="${sinus}" fill="#D6ECF5" stroke="${BLUE}" stroke-width="4"/>
  ${socket ? '' : tooth(66)}
  ${tooth(122)}
  ${socket ? `<path d="M70 170 L70 205 L106 205 L106 170 Z" fill="#F6F1E8"/><path d="M68 170 L68 206 M108 170 L108 206" stroke="#C9B79C" stroke-width="2.5"/>` : ''}
  <!-- natural ostium (high on medial wall) -->
  ${ostiumWide
    ? `<rect x="178" y="68" width="20" height="30" rx="6" fill="#D6ECF5" stroke="${TEAL}" stroke-width="3" stroke-dasharray="4 3"/>`
    : `<circle cx="188" cy="82" r="5" fill="${TEAL}"/>`}
  ${inferiorOpening ? `<rect x="180" y="132" width="22" height="26" rx="6" fill="#D6ECF5" stroke="${TEAL}" stroke-width="3"/>` : ''}
  ${windowAnterior ? windowAnterior : ''}`;
}
const svg = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 240" width="900" height="720">${inner}</svg>`;
const pus = `<path d="M70 152 Q95 140 120 148 Q150 142 172 152 L176 160 L66 160 Z" fill="#E8C547" opacity=".9"/>`;

const items = {
  surgery_1: svg(base() + pus + `
    <line x1="266" y1="146" x2="118" y2="146" stroke="${NAVY}" stroke-width="7" stroke-linecap="round"/>
    <rect x="248" y="136" width="36" height="20" rx="5" fill="${NAVY}"/>
    <circle cx="116" cy="146" r="6" fill="${RED}"/>`),
  surgery_2: svg(base({ ostiumWide: true }) + `
    <path d="M284 10 L226 60 L206 78" stroke="${NAVY}" stroke-width="9" stroke-linecap="round" fill="none"/>
    <path d="M206 78 L172 56 L172 100 Z" fill="#FFE27A" opacity=".75"/>
    <circle cx="206" cy="78" r="6" fill="${TEAL}"/>`),
  surgery_3: svg(base({ windowAnterior: `
    <circle cx="36" cy="104" r="11" fill="#F6F1E8" stroke="${ORANGE}" stroke-width="4"/>
    <line x1="2" y1="104" x2="86" y2="108" stroke="${NAVY}" stroke-width="7" stroke-linecap="round"/>
    <circle cx="88" cy="108" r="6" fill="${TEAL}"/>` }) + pus),
  surgery_4: svg(base({ socket: true }) + `
    <line x1="88" y1="236" x2="88" y2="146" stroke="${NAVY}" stroke-width="7" stroke-linecap="round"/>
    <circle cx="88" cy="144" r="7" fill="${ORANGE}"/>
    <path d="M70 168 L70 160 L106 160 L106 168" stroke="${ORANGE}" stroke-width="4" fill="none" stroke-dasharray="4 3"/>`),
  surgery_5: svg(base({ inferiorOpening: true, windowAnterior: `
    <path d="M28 72 Q16 104 28 138 L44 134 Q36 104 44 76 Z" fill="#F6F1E8" stroke="${ORANGE}" stroke-width="4"/>
    <path d="M0 200 Q10 158 34 112" stroke="${NAVY}" stroke-width="8" fill="none" stroke-linecap="round"/>
    <circle cx="34" cy="108" r="6" fill="${TEAL}"/>` }) + pus),
  balloon: svg(base({ ostiumWide: true }) + `
    <path d="M284 14 L240 44 L214 74" stroke="${NAVY}" stroke-width="7" stroke-linecap="round" fill="none"/>
    <ellipse cx="190" cy="82" rx="17" ry="25" fill="${TEAL}" opacity=".85" stroke="${NAVY}" stroke-width="3"/>
    <path d="M168 82 L150 82 M212 82 L230 82" stroke="${TEAL}" stroke-width="3" stroke-linecap="round"/>`),
};
(async () => {
  for (const [k, v] of Object.entries(items)) {
    await sharp(Buffer.from(v)).png().toFile(`images/${k}.png`);
  }
  console.log('schematics ok');
})();

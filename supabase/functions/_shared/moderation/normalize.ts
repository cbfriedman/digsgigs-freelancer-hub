/**
 * Text normalization for anti-evasion in message moderation.
 * Handles obfuscation, Unicode tricks, spaced letters, etc.
 */

import type { NormalizedText } from "./types.ts";

const ZERO_WIDTH_CHARS = /[\u200B-\u200D\u2060\uFEFF\u00AD]/g;
const INVISIBLE_SEPARATORS = /[\u2063\u2062\u2061]/g;

/** Homoglyph substitutions: lookalike -> canonical (common Cyrillic/Latin lookalikes) */
const HOMOGLYPH_MAP: Record<string, string> = {
  "\u0430": "a", "\u00E0": "a", "\u00E1": "a", "\u00E2": "a", "\u00E3": "a", "\u00E4": "a", "\u00E5": "a",
  "\u0101": "a", "\u0103": "a", "\u0105": "a", "\u01CE": "a", "\u01DF": "a", "\u01E1": "a", "\u01FB": "a",
  "\u0435": "e", "\u00E8": "e", "\u00E9": "e", "\u00EA": "e", "\u00EB": "e", "\u0113": "e", "\u0115": "e",
  "\u0117": "e", "\u0119": "e", "\u011B": "e", "\u01DD": "e", "\u0205": "e", "\u0207": "e", "\u0229": "e",
  "\u0438": "i", "\u00EC": "i", "\u00ED": "i", "\u00EE": "i", "\u00EF": "i", "\u0129": "i", "\u012B": "i",
  "\u012D": "i", "\u012F": "i", "\u0131": "i", "\u01D0": "i", "\u0209": "i", "\u020B": "i", "\u0237": "i",
  "\u043E": "o", "\u00F2": "o", "\u00F3": "o", "\u00F4": "o", "\u00F5": "o", "\u00F6": "o", "\u00F8": "o",
  "\u014D": "o", "\u014F": "o", "\u0151": "o", "\u01A1": "o", "\u01D2": "o", "\u01EB": "o", "\u01ED": "o",
  "\u0443": "u", "\u00F9": "u", "\u00FA": "u", "\u00FB": "u", "\u00FC": "u", "\u0169": "u", "\u016B": "u",
  "\u016D": "u", "\u016F": "u", "\u0171": "u", "\u0173": "u", "\u01B0": "u", "\u01D4": "u", "\u01D6": "u",
  "\u0441": "c", "\u00E7": "c", "\u0107": "c", "\u0109": "c", "\u010B": "c", "\u010D": "c", "\u0188": "c",
  "\u043F": "p", "\u03C1": "p", "\u2374": "p", "\uFF50": "p",
  "\u0445": "x", "\u00D7": "x",
  "\u0660": "0", "\u0661": "1", "\u0662": "2", "\u0663": "3", "\u0664": "4", "\u0665": "5", "\u0666": "6",
  "\u0667": "7", "\u0668": "8", "\u0669": "9", "\u06F0": "0", "\u06F1": "1", "\u06F2": "2", "\u06F3": "3",
  "\u06F4": "4", "\u06F5": "5", "\u06F6": "6", "\u06F7": "7", "\u06F8": "8", "\u06F9": "9",
  "\uFF20": "@", "\uFF0E": ".", "\u06D4": ".",
};

/** Leetspeak map */
const LEET_MAP: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b",
  "@": "a", "$": "s", "!": "i", "+": "t", "|": "i", "(": "c", ")": "c",
  "€": "e", "£": "e", "¥": "y",
};

function applyHomoglyphs(s: string): string {
  let out = "";
  for (const c of s) {
    out += HOMOGLYPH_MAP[c] ?? c;
  }
  return out;
}

function applyLeet(s: string): string {
  let out = "";
  for (const c of s.toLowerCase()) {
    out += LEET_MAP[c] ?? c;
  }
  return out;
}

/** Replace (at), [at], {at}, " at " with @ */
function normalizeAt(text: string): string {
  return text
    .replace(/\s*\(at\)\s*/gi, "@")
    .replace(/\s*\[at\]\s*/gi, "@")
    .replace(/\s*\{at\}\s*/gi, "@")
    .replace(/\s+at\s+/gi, "@")
    .replace(/\s*@\s*/g, "@");
}

/** Replace (dot), [dot], {dot}, " dot " with . */
function normalizeDot(text: string): string {
  return text
    .replace(/\s*\(dot\)\s*/gi, ".")
    .replace(/\s*\[dot\]\s*/gi, ".")
    .replace(/\s*\{dot\}\s*/gi, ".")
    .replace(/\s+dot\s+/gi, ".")
    .replace(/\s*\.\s*/g, ".");
}

/** Collapse spaces between letters in spaced-out words: "f u c k" -> "fuck" */
function collapseSpacedLetters(text: string): string {
  let prev = text;
  let curr = text.replace(/([a-zA-Z])\s+([a-zA-Z])/g, "$1$2");
  while (curr !== prev) {
    prev = curr;
    curr = curr.replace(/([a-zA-Z])\s+([a-zA-Z])/g, "$1$2");
  }
  return curr;
}

/** More aggressive: remove separators between letters (handles "f-u-c-k", "f.u.c.k") */
function collapseSpacedLettersAggressive(text: string): string {
  let prev = text;
  let curr = text.replace(/([a-zA-Z0-9])([\s\-_*.:;,!?]+)([a-zA-Z0-9])/g, "$1$3");
  while (curr !== prev) {
    prev = curr;
    curr = curr.replace(/([a-zA-Z0-9])([\s\-_*.:;,!?]+)([a-zA-Z0-9])/g, "$1$3");
  }
  return curr;
}

/** Remove repeated punctuation */
function collapsePunctuation(text: string): string {
  return text.replace(/([.!?*_\-])\1+/g, "$1");
}

/**
 * Normalize text for moderation detection.
 * Produces raw, normalized, and aggressive-normalized versions.
 */
export function normalizeText(input: string): NormalizedText {
  if (!input || typeof input !== "string") {
    return { raw: "", normalized: "", aggressive: "" };
  }

  const raw = input.trim();

  let step = raw
    .replace(ZERO_WIDTH_CHARS, "")
    .replace(INVISIBLE_SEPARATORS, "")
    .normalize("NFKC");

  const normalized = (() => {
    let s = step.toLowerCase();
    s = normalizeAt(s);
    s = normalizeDot(s);
    s = s.replace(/\s+/g, " ").trim();
    s = collapsePunctuation(s);
    s = applyHomoglyphs(s);
    return s;
  })();

  const aggressive = (() => {
    let s = normalized;
    s = collapseSpacedLetters(s);
    s = collapseSpacedLettersAggressive(s);
    s = applyLeet(s);
    s = s.replace(/[\s\-_*.:;,!?]+/g, "");
    return s;
  })();

  return { raw, normalized, aggressive };
}

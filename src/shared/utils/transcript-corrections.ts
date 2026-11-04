export interface TranscriptTimedWord {
  text: string;
  start: number;
  end: number;
}

export interface TranscriptWordCorrection {
  fromIndex: number;
  toIndex: number;
  text: string;
  start: number;
  end: number;
}

/** @deprecated Use {@link wordIsInSelectedInterval} — partial overlap selects Whisper neighbors. */
export function intervalsOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Treat a word as selected when its midpoint lies in the interval.
 * Whisper word timings often overlap by tens of milliseconds at boundaries;
 * any-touch overlap would include the next word when editing one token.
 */
export function wordIsInSelectedInterval(
  word: TranscriptTimedWord,
  selectionStart: number,
  selectionEnd: number,
): boolean {
  const midpoint = (word.start + word.end) / 2;
  return midpoint >= selectionStart && midpoint <= selectionEnd;
}

function assertContiguousIndices(indices: number[]): boolean {
  if (!indices.length) return false;
  for (let i = 1; i < indices.length; i++) {
    if (indices[i] !== indices[i - 1]! + 1) return false;
  }
  return true;
}

function indicesFromTimeSelection(
  words: TranscriptTimedWord[],
  selectionStart: number,
  selectionEnd: number,
): number[] {
  const selected = words
    .map((word, index) =>
      wordIsInSelectedInterval(word, selectionStart, selectionEnd) ? index : -1,
    )
    .filter((index) => index >= 0);
  if (!selected.length) return [];
  return longestContiguousRun(selected);
}

function longestContiguousRun(sortedIndices: number[]): number[] {
  let bestStart = 0;
  let bestLen = 1;
  let runStart = 0;
  let runLen = 1;
  for (let i = 1; i < sortedIndices.length; i++) {
    if (sortedIndices[i] === sortedIndices[i - 1]! + 1) {
      runLen += 1;
    } else {
      if (runLen > bestLen) {
        bestLen = runLen;
        bestStart = runStart;
      }
      runStart = i;
      runLen = 1;
    }
  }
  if (runLen > bestLen) {
    bestLen = runLen;
    bestStart = runStart;
  }
  return sortedIndices.slice(bestStart, bestStart + bestLen);
}

export interface TranscriptWordSelection {
  start: number;
  end: number;
  /** Contiguous indices shown in the correction dialog; authoritative when set. */
  indices?: number[];
}

/**
 * Build a single word-span correction. Prefers explicit dialog indices over
 * time-based selection so caption timing matches what the user edited.
 */
export function correctTranscriptWords(
  words: TranscriptTimedWord[],
  selection: TranscriptWordSelection,
  replacementText: string,
): TranscriptWordCorrection | null {
  const text = replacementText.replace(/\s+/g, " ").trim();
  if (!text || !words.length) return null;

  let indices: number[];
  if (selection.indices?.length) {
    indices = [...selection.indices].sort((a, b) => a - b);
    if (!assertContiguousIndices(indices)) return null;
    if (indices.some((index) => index < 0 || index >= words.length)) return null;
  } else {
    indices = indicesFromTimeSelection(words, selection.start, selection.end);
    if (!indices.length) return null;
  }

  const fromIndex = indices[0]!;
  const toIndex = indices[indices.length - 1]!;
  return {
    fromIndex,
    toIndex,
    text,
    start: words[fromIndex]!.start,
    end: words[toIndex]!.end,
  };
}

export function applyTranscriptWordCorrections(
  words: TranscriptTimedWord[],
  corrections: TranscriptWordCorrection[],
): TranscriptTimedWord[] {
  if (!corrections.length) return words;
  const byStartIndex = new Map<number, TranscriptWordCorrection>();
  for (const correction of corrections) {
    byStartIndex.set(correction.fromIndex, correction);
  }

  const out: TranscriptTimedWord[] = [];
  for (let index = 0; index < words.length; index++) {
    const correction = byStartIndex.get(index);
    if (!correction) {
      out.push(words[index]!);
      continue;
    }
    out.push({
      text: correction.text,
      start: correction.start,
      end: correction.end,
    });
    index = correction.toIndex;
  }
  return out;
}

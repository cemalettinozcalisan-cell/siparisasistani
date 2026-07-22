import { Injectable } from '@nestjs/common';

export interface SpeechFragment {
  text: string;
  index: number;
  estimatedDurationMs: number;
}

@Injectable()
export class SplitEngine {
  split(text: string): SpeechFragment[] {
    const normalized = this.prepare(text);
    const sentences = this.extractSentences(normalized);
    return this.mergeShortSentences(sentences);
  }

  private prepare(text: string): string {
    return text
      .replace(/\n{2,}/g, '\n')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  private extractSentences(text: string): string[] {
    const raw = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
    return raw.map((s) => s.trim()).filter(Boolean);
  }

  private mergeShortSentences(sentences: string[]): SpeechFragment[] {
    const fragments: SpeechFragment[] = [];
    let buffer = '';

    for (const sentence of sentences) {
      const merged = buffer ? `${buffer} ${sentence}` : sentence;
      if (merged.length > 120 || sentence.length > 80) {
        if (buffer) fragments.push(this.createFragment(buffer));
        buffer = sentence;
      } else {
        buffer = merged;
      }
    }

    if (buffer) fragments.push(this.createFragment(buffer));
    return fragments;
  }

  private createFragment(text: string): SpeechFragment {
    const charDurationMs = 60;
    return {
      text,
      index: 0,
      estimatedDurationMs: text.length * charDurationMs,
    };
  }

  reindex(fragments: SpeechFragment[]): SpeechFragment[] {
    return fragments.map((f, i) => ({ ...f, index: i }));
  }
}

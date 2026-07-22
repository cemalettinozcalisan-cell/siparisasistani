import { Injectable } from '@nestjs/common';

@Injectable()
export class SsmlBuilder {
  build(text: string, config: { speed?: number; style?: string } = {}): string {
    const speed = config.speed ?? 1.0;
    const style = config.style ?? 'natural';

    const fragments = this.splitIntoFragments(text);
    const ssmlParts = fragments.map((f, i) => {
      const pause = i < fragments.length - 1 && f.length > 10
        ? '<break time="0.3s"/>'
        : '';
      return `<prosody rate="${speed}" pitch="0%">${this.escapeXml(f)}</prosody>${pause}`;
    });

    return [
      '<speak>',
      `<voice name="${style}">`,
      ...ssmlParts,
      '</voice>',
      '</speak>',
    ].join('');
  }

  private splitIntoFragments(text: string): string[] {
    const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
    const fragments: string[] = [];

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;

      if (trimmed.length > 100) {
        const parts = trimmed.match(/.{1,100}(?:\s|$)/g) || [trimmed];
        fragments.push(...parts);
      } else {
        fragments.push(trimmed);
      }
    }

    return fragments;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

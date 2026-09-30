export type SubtitleCue = { start: number; end: number; text: string };
const seconds = (value: string) =>
  value
    .replace(',', '.')
    .split(':')
    .reduce((sum, part) => sum * 60 + Number(part), 0);
/** Plain dialogue from the episode's WebVTT/SRT; never inject subtitle markup into the UI. */
export function parseSubtitleCues(input: string): SubtitleCue[] {
  if (input.length > 2_000_000) throw new Error('Subtitle file is too large.');
  return input
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .flatMap((block) => {
      const lines = block.split('\n');
      const index = lines.findIndex((line) => line.includes(' --> '));
      if (index < 0) return [];
      const match = lines[index].match(
        /((?:\d+:)?\d{2}:\d{2}[.,]\d{3})\s+-->\s+((?:\d+:)?\d{2}:\d{2}[.,]\d{3})/,
      );
      if (!match) return [];
      const start = seconds(match[1]),
        end = seconds(match[2]);
      const text = lines
        .slice(index + 1)
        .join('\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .trim();
      return text && Number.isFinite(start) && end > start ? [{ start, end, text }] : [];
    })
    .sort((a, b) => a.start - b.start);
}
export function subtitleAt(cues: SubtitleCue[], time: number): string {
  return cues
    .filter((cue) => cue.start <= time && time < cue.end)
    .map((cue) => cue.text)
    .join('\n');
}

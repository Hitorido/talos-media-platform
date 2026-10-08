import { downloadFile, saveTextFile } from '@/services/storageService';

async function playlist(url: string): Promise<{ text: string; url: string }> {
  if (!['https:', 'http:'].includes(new URL(url).protocol))
    throw new Error('Unsupported playlist URL.');
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error('Playlist download failed (' + response.status + ').');
  const text = await response.text();
  if (text.length > 2_000_000 || !text.trimStart().startsWith('#EXTM3U'))
    throw new Error('Invalid HLS playlist.');
  return { text, url: response.url || url };
}
/** Downloads bounded, unencrypted VOD; never labels a remote playlist as an offline video. */
export async function downloadHls(
  url: string,
  directory: string,
  signal: { isAborted: boolean },
  progress: (done: number, total: number, bytes: number) => void,
) {
  let { text, url: base } = await playlist(url);
  let subtitlePlaylist: string | undefined;
  if (text.includes('#EXT-X-STREAM-INF:')) {
    if (/#EXT-X-MEDIA:TYPE=AUDIO/.test(text))
      throw new Error('Separate audio downloads are not supported for this stream.');
    const subtitleLine = text
      .split(/\r?\n/)
      .find(
        (line) =>
          line.startsWith('#EXT-X-MEDIA:') &&
          line.includes('TYPE=SUBTITLES') &&
          /(?:LANGUAGE="en(?:g)?"|NAME="English")/i.test(line),
      );
    const subtitleUri = subtitleLine?.match(/URI="([^"]+)"/)?.[1];
    if (subtitleUri) subtitlePlaylist = new URL(subtitleUri, base).href;
    const lines = text.split(/\r?\n/);
    const choices = lines.flatMap((line, i) =>
      line.startsWith('#EXT-X-STREAM-INF:') && lines[i + 1] && !lines[i + 1].startsWith('#')
        ? [
            {
              height: Number(line.match(/RESOLUTION=\d+x(\d+)/)?.[1] || 0),
              url: new URL(lines[i + 1].trim(), base).href,
            },
          ]
        : [],
    );
    const preferred = choices.filter((c) => c.height <= 720).sort((a, b) => b.height - a.height);
    const candidates = [
      ...preferred,
      ...choices.filter((c) => c.height > 720).sort((a, b) => a.height - b.height),
    ];
    if (!candidates.length) throw new Error('No downloadable HLS variant.');
    let resolved = false;
    let lastFailure: Error | undefined;
    for (const candidate of candidates) {
      if (signal.isAborted) throw new Error('Download paused.');
      try {
        const media = await playlist(candidate.url);
        const firstSegment = media.text
          .split(/\r?\n/)
          .find((line) => line && !line.startsWith('#'));
        if (firstSegment) {
          const segmentUrl = new URL(firstSegment, media.url);
          if (!['http:', 'https:'].includes(segmentUrl.protocol))
            throw new Error('Unsupported media URL.');
          const probe = await fetch(segmentUrl.href, { signal: AbortSignal.timeout(20000) });
          await probe.body?.cancel();
          if (!probe.ok) throw new Error('Playlist download failed (' + probe.status + ').');
        }
        text = media.text;
        base = media.url;
        resolved = true;
        break;
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !/Playlist download failed \((404|410|500|502|503|504)\)/.test(error.message)
        )
          throw error;
        lastFailure = error;
      }
    }
    if (!resolved) throw lastFailure ?? new Error('No available video variant for this episode.');
  }
  if (!text.includes('#EXT-X-ENDLIST') || text.includes('#EXT-X-STREAM-INF'))
    throw new Error('Only completed VOD playlists can be downloaded.');
  if (
    /#EXT-X-MAP:[^\n]*BYTERANGE=/.test(text) ||
    /#EXT-X-(?!MAP:|KEY:)[^\n]*URI=/.test(text) ||
    /#EXT-X-KEY:(?!METHOD=NONE)/.test(text) ||
    /#EXT-X-(?:BYTERANGE|I-FRAME|MEDIA):/.test(text)
  )
    throw new Error('This stream format is not supported for offline download.');
  const files: { url: string; name: string }[] = [];
  const lines = text.split(/\r?\n/).map((line) => {
    if (line.startsWith('#EXT-X-MAP:'))
      return line.replace(/URI="([^"]+)"/, (_, value) => {
        const name = 'init-' + files.length + '.mp4';
        files.push({ url: new URL(value, base).href, name });
        return 'URI="' + name + '"';
      });
    if (!line || line.startsWith('#')) return line;
    const name = 'segment-' + files.length + '.ts';
    files.push({ url: new URL(line, base).href, name });
    return name;
  });
  if (!files.length || files.length > 2000)
    throw new Error('Episode exceeds the supported offline segment limit.');
  let bytes = 0,
    nextFile = 0,
    completed = 0;
  let failure: unknown;
  // Bounded workers keep a whole episode practical without flooding the source.
  await Promise.all(
    Array.from({ length: Math.min(3, files.length) }, async () => {
      try {
        while (nextFile < files.length && !failure) {
          if (signal.isAborted) throw new Error('Download paused.');
          const file = files[nextFile++],
            parsed = new URL(file.url);
          if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')
            throw new Error('Unsupported media URL.');
          const result = await downloadFile(file.url, directory + file.name);
          bytes += result.size;
          if (bytes > 2 * 1024 * 1024 * 1024)
            throw new Error('Episode exceeds the 2 GB download limit.');
          if (!signal.isAborted && !failure) progress(++completed, files.length, bytes);
        }
      } catch (error) {
        failure ??= error;
      }
    }),
  );
  if (failure) throw failure;
  if (signal.isAborted) throw new Error('Download paused.');
  const localPath = directory + 'video.m3u8';
  let subtitleWarning: string | undefined;
  if (subtitlePlaylist) {
    try {
      const captionResponse = await playlist(subtitlePlaylist);
      const captions = captionResponse.text;
      subtitlePlaylist = captionResponse.url;
      if (
        !captions.includes('#EXT-X-ENDLIST') ||
        /#EXT-X-(?:KEY|MAP|BYTERANGE|STREAM-INF):/.test(captions)
      )
        throw new Error('Unsupported offline subtitle playlist.');
      const captionLines = captions.split(/\r?\n/);
      let captionIndex = 0;
      for (let i = 0; i < captionLines.length; i++) {
        const line = captionLines[i];
        if (!line || line.startsWith('#')) continue;
        if (signal.isAborted) throw new Error('Download paused.');
        if (++captionIndex > 500) throw new Error('Subtitle segment limit exceeded.');
        const name = 'caption-' + captionIndex + '.vtt';
        const downloaded = await downloadFile(
          new URL(line, subtitlePlaylist).href,
          directory + name,
        );
        bytes += downloaded.size;
        captionLines[i] = name;
      }
      if (!captionIndex || signal.isAborted) throw new Error('Subtitle download incomplete.');
      await saveTextFile(directory + 'english.m3u8', captionLines.join('\n'));
      await saveTextFile(directory + 'media.m3u8', lines.join('\n'));
      await saveTextFile(
        localPath,
        '#EXTM3U\n#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="en",NAME="English",LANGUAGE="en",AUTOSELECT=YES,DEFAULT=YES,URI="english.m3u8"\n#EXT-X-STREAM-INF:BANDWIDTH=2500000,SUBTITLES="en"\nmedia.m3u8\n',
      );
    } catch (error) {
      if (signal.isAborted) throw error;
      subtitleWarning = 'Embedded subtitle download failed. Retry while online to save captions.';
      await saveTextFile(localPath, lines.join('\n'));
    }
  } else await saveTextFile(localPath, lines.join('\n'));
  return { localPath, bytes, subtitleWarning };
}

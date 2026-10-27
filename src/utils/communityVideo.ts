export function safeMediaUrl(value?: string): string | undefined {
  if (!value) return undefined;
  if (/^\/api\/public\/community-media\/[a-f0-9-]{36}\.(?:jpg|png|webp|mp4|webm)$/i.test(value)) return value;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}
export function videoSource(value: string): { kind: 'embed' | 'file' | 'external'; src: string } | null {
  const safe = safeMediaUrl(value);
  if (!safe) return null;
  const url = new URL(safe, window.location.origin);
  const host = url.hostname.toLowerCase();
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com', 'youtu.be', 'www.youtu.be'].includes(host)) {
    const videoId = host.endsWith('youtu.be') ? url.pathname.split('/')[1] : url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
    if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)) return { kind: 'embed', src: 'https://www.youtube-nocookie.com/embed/' + videoId + '?rel=0&autoplay=1' };
  }
  if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(host)) {
    const videoId = url.pathname.match(/^\/(?:video\/)?(\d+)\/?$/)?.[1];
    if (videoId) return { kind: 'embed', src: 'https://player.vimeo.com/video/' + videoId + '?autoplay=1' };
  }
  if (/\.(?:mp4|webm|ogg)$/i.test(url.pathname)) return { kind: 'file', src: safe };
  return { kind: 'external', src: safe };
}
export function videoThumbnail(videoUrl: string, thumbnailUrl?: string) {
  const thumbnail = safeMediaUrl(thumbnailUrl);
  if (thumbnail) return thumbnail;
  const source = videoSource(videoUrl);
  const youtubeId = source?.kind === 'embed' ? source.src.match(/youtube-nocookie\.com\/embed\/([A-Za-z0-9_-]{11})/)?.[1] : undefined;
  return youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : '/images/vietnamese-vegan-table.png';
}
export function videoDuration(seconds?: number) {
  if (!seconds || seconds < 0) return '';
  const hours = Math.floor(seconds / 3600);
  return (hours ? hours + ':' : '') + (hours ? String(Math.floor(seconds / 60) % 60).padStart(2, '0') : Math.floor(seconds / 60)) + ':' + String(seconds % 60).padStart(2, '0');
}

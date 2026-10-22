export type MapStyleMode = 'auto' | 'gmap' | 'satellite' | 'esri';

/** Returns the real Google Maps key from env, or '' when none is configured. */
export function getActiveMapApiKey(): string {
  return (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() || '';
}

export function maskApiKey(key: string): string {
  if (!key) return 'Bản đồ số Trực tiếp (Zero-Config)';
  if (key.length < 10) return 'Đã cấu hình';
  return `${key.slice(0, 6)}••••••${key.slice(-4)}`;
}

export function getTileLayerConfig(isDarkTheme: boolean, styleOverride: MapStyleMode = 'auto') {
  if (styleOverride === 'satellite') {
    return {
      url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      attribution: '&copy; Google Maps Vệ tinh',
      label: 'Google Vệ tinh & Đường phố',
      subdomains: '0123',
    };
  }

  if (styleOverride === 'esri') {
    return {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; World Street Map',
      label: 'Esri Street Map',
      subdomains: '',
    };
  }

  // Primary Default: Google Maps Standard Roadmap (Fastest, zero watermark, 100% unblocked in Vietnam)
  return {
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    label: isDarkTheme ? 'Bản đồ Đường phố (Tối)' : 'Bản đồ Đường phố (Sáng)',
    subdomains: '0123',
  };
}

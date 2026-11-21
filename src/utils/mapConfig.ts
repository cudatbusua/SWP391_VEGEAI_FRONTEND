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
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri',
      label: 'Ảnh vệ tinh Esri',
      subdomains: '',
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

  // OpenStreetMap remains available when the Google Maps JavaScript API key is absent.
  return {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    label: isDarkTheme ? 'Bản đồ Đường phố (Tối)' : 'Bản đồ Đường phố (Sáng)',
    subdomains: '',
  };
}

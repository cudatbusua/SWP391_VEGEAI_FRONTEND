import { useEffect, useRef, useState } from 'react';

interface Point { id: string; lat: number; lon: number; title: string; label: string }
interface Position { lat: number; lng: number }
interface MapInstance {
  setCenter(position: Position): void;
  setZoom(zoom: number): void;
  setMapTypeId(type: string): void;
}
interface MarkerInstance { setMap(map: MapInstance | null): void; addListener(event: string, callback: () => void): void }
interface PolylineInstance { setMap(map: MapInstance | null): void }
interface MapsApi {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => MapInstance;
  Marker: new (options: Record<string, unknown>) => MarkerInstance;
  Polyline: new (options: Record<string, unknown>) => PolylineInstance;
}
type MapsWindow = Window & {
  google?: { maps?: MapsApi };
  vegeaiGoogleMapsReady?: () => void;
  gm_authFailure?: () => void;
};

let loadingMaps: Promise<MapsApi> | null = null;

function loadMaps(key: string): Promise<MapsApi> {
  const mapsWindow = window as MapsWindow;
  if (mapsWindow.google?.maps?.Map) return Promise.resolve(mapsWindow.google.maps);
  if (loadingMaps) return loadingMaps;
  loadingMaps = new Promise<MapsApi>((resolve, reject) => {
    const script = document.createElement('script');
    let finished = false;
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      delete mapsWindow.vegeaiGoogleMapsReady;
      delete mapsWindow.gm_authFailure;
      if (error) {
        script.remove();
        loadingMaps = null;
        reject(error);
      } else if (mapsWindow.google?.maps?.Map) {
        resolve(mapsWindow.google.maps);
      } else {
        loadingMaps = null;
        reject(new Error('Google Maps API chưa sẵn sàng'));
      }
    };
    const timeout = window.setTimeout(() => finish(new Error('Google Maps tải quá lâu')), 15000);
    mapsWindow.vegeaiGoogleMapsReady = () => finish();
    mapsWindow.gm_authFailure = () => finish(new Error('Google Maps API key không hợp lệ hoặc chưa được cấp quyền'));
    script.async = true;
    script.onerror = () => finish(new Error('Không tải được Google Maps API'));
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&callback=vegeaiGoogleMapsReady`;
    document.head.appendChild(script);
  });
  return loadingMaps;
}

interface Props {
  apiKey: string;
  center: { lat: number; lon: number };
  points: Point[];
  selectedId?: string;
  onSelect(id: string): void;
  onError(): void;
  mapType?: 'roadmap' | 'satellite';
  showRoute?: boolean;
  className?: string;
}

export function GoogleMapCanvas({ apiKey, center, points, selectedId, onSelect, onError, mapType = 'roadmap', showRoute = false, className = '' }: Props) {
  const elementRef = useRef<HTMLDivElement>(null);
  const onErrorRef = useRef(onError);
  const onSelectRef = useRef(onSelect);
  const [loaded, setLoaded] = useState<{ api: MapsApi; map: MapInstance } | null>(null);
  onErrorRef.current = onError;
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    loadMaps(apiKey).then(api => {
      if (cancelled || !elementRef.current) return;
      const map = new api.Map(elementRef.current, {
        center: { lat: center.lat, lng: center.lon }, zoom: 14, mapTypeId: mapType,
        streetViewControl: false, mapTypeControl: false,
      });
      setLoaded({ api, map });
    }).catch(() => { if (!cancelled) onErrorRef.current(); });
    return () => { cancelled = true; };
  }, [apiKey]);

  useEffect(() => {
    if (!loaded) return;
    const selected = points.find(point => point.id === selectedId);
    loaded.map.setCenter({ lat: selected?.lat ?? center.lat, lng: selected?.lon ?? center.lon });
    loaded.map.setZoom(selected ? 16 : 14);
    loaded.map.setMapTypeId(mapType);
  }, [center.lat, center.lon, loaded, mapType, points, selectedId]);

  useEffect(() => {
    if (!loaded) return;
    const userMarker = new loaded.api.Marker({ position: { lat: center.lat, lng: center.lon }, map: loaded.map, title: 'Vị trí của bạn', icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' });
    const markers = points.map(point => {
      const marker = new loaded.api.Marker({ position: { lat: point.lat, lng: point.lon }, map: loaded.map, title: point.title, label: point.label });
      marker.addListener('click', () => onSelectRef.current(point.id));
      return marker;
    });
    const selected = showRoute ? points.find(point => point.id === selectedId) : undefined;
    const route = selected ? new loaded.api.Polyline({ map: loaded.map, path: [{ lat: center.lat, lng: center.lon }, { lat: selected.lat, lng: selected.lon }], strokeColor: '#10b981', strokeWeight: 4, strokeOpacity: 0.85 }) : null;
    return () => { userMarker.setMap(null); markers.forEach(marker => marker.setMap(null)); route?.setMap(null); };
  }, [center.lat, center.lon, loaded, points, selectedId, showRoute]);

  return <div ref={elementRef} className={className} role="region" aria-label="Bản đồ Google các địa điểm gần bạn" />;
}

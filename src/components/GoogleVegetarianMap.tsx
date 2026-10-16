import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, KeyRound, Loader2 } from 'lucide-react';
import type { Coordinates, Place } from '../services/restaurantService';

type GoogleLatLng = { lat: number; lng: number };
type GoogleMarker = {
  setMap(map: GoogleMap | null): void;
  addListener(event: string, handler: () => void): void;
};
type GoogleInfoWindow = {
  setContent(content: HTMLElement): void;
  open(options: { map: GoogleMap; anchor: GoogleMarker }): void;
  close(): void;
};
type GoogleMap = {
  setCenter(center: GoogleLatLng): void;
  setZoom(zoom: number): void;
};
type GoogleMapsApi = {
  maps: {
    Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMap;
    Marker: new (options: Record<string, unknown>) => GoogleMarker;
    InfoWindow: new () => GoogleInfoWindow;
    SymbolPath: { CIRCLE: string };
  };
};

declare global {
  interface Window {
    google?: GoogleMapsApi;
    vegeAiGoogleMapsReady?: () => void;
  }
}

let googleMapsRequest: Promise<GoogleMapsApi> | null = null;

// Loads the browser-restricted Google Maps key only from the Vite build environment.
function loadGoogleMaps(apiKey: string): Promise<GoogleMapsApi> {
  if (window.google) return Promise.resolve(window.google);
  if (googleMapsRequest) return googleMapsRequest;
  googleMapsRequest = new Promise((resolve, reject) => {
    window.vegeAiGoogleMapsReady = () => {
      if (window.google) resolve(window.google);
      else reject(new Error('Google Maps tải xong nhưng API không khả dụng.'));
    };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=vegeAiGoogleMapsReady&loading=async&v=weekly`;
    script.async = true;
    script.onerror = () => {
      googleMapsRequest = null;
      reject(new Error('Không tải được Google Maps. Kiểm tra quyền API và giới hạn referrer của khóa.'));
    };
    document.head.appendChild(script);
  });
  return googleMapsRequest;
}

interface GoogleVegetarianMapProps {
  center: Coordinates;
  places: Place[];
  selectedPlace: Place | null;
  onSelect(place: Place): void;
}

export function GoogleVegetarianMap({ center, places, selectedPlace, onSelect }: GoogleVegetarianMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const markersRef = useRef<GoogleMarker[]>([]);
  const infoWindowRef = useRef<GoogleInfoWindow | null>(null);
  const [map, setMap] = useState<GoogleMap | null>(null);
  const [error, setError] = useState('');
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? '';

  useEffect(() => {
    let active = true;
    if (!apiKey) {
      setError('Chưa cấu hình VITE_GOOGLE_MAPS_API_KEY. Hãy thêm khóa Google Maps JavaScript API bị giới hạn theo website.');
      return () => { active = false; };
    }
    loadGoogleMaps(apiKey).then(google => {
      if (!active || !containerRef.current) return;
      const loadedMap = new google.maps.Map(containerRef.current, {
        center: { lat: center.lat, lng: center.lon },
        zoom: 14,
        clickableIcons: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          { featureType: 'poi', elementType: 'all', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', elementType: 'all', stylers: [{ visibility: 'off' }] },
        ],
      });
      mapRef.current = loadedMap;
      infoWindowRef.current = new google.maps.InfoWindow();
      setMap(loadedMap);
    }).catch(reason => {
      if (active) setError(reason instanceof Error ? reason.message : 'Không thể tải Google Maps.');
    });
    return () => { active = false; };
  }, [apiKey]);

  useEffect(() => {
    if (!map || !window.google) return;
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    infoWindowRef.current?.close();

    places.forEach((place, index) => {
      const marker = new window.google!.maps.Marker({
        map,
        position: { lat: place.lat, lng: place.lon },
        title: place.name,
        label: { text: String(index + 1), color: '#ffffff', fontWeight: '700' },
        icon: {
          path: window.google!.maps.SymbolPath.CIRCLE,
          fillColor: '#059669',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
          scale: 15,
        },
      });
      marker.addListener('click', () => onSelect(place));
      markersRef.current.push(marker);
      if (selectedPlace?.id === place.id) {
        map.setCenter({ lat: place.lat, lng: place.lon });
        map.setZoom(16);
        const content = document.createElement('div');
        content.className = 'min-w-48 p-1';
        const name = document.createElement('strong');
        name.className = 'block text-sm text-slate-900';
        name.textContent = place.name;
        const address = document.createElement('span');
        address.className = 'mt-1 block text-xs text-slate-600';
        address.textContent = place.address || 'Địa chỉ chưa được cập nhật';
        content.append(name, address);
        infoWindowRef.current?.setContent(content);
        if (infoWindowRef.current) infoWindowRef.current.open({ map, anchor: marker });
      }
    });

    if (!selectedPlace) {
      map.setCenter({ lat: center.lat, lng: center.lon });
      map.setZoom(14);
    }
  }, [center.lat, center.lon, map, onSelect, places, selectedPlace]);

  return (
    <div className="relative h-full min-h-[420px] bg-slate-100">
      <div ref={containerRef} className="h-full min-h-[420px] w-full" aria-label="Bản đồ Google chỉ hiển thị các quán có nhãn chay" />
      {!map && !error && <div role="status" className="absolute inset-0 grid place-content-center gap-3 text-sm text-slate-600">
        <Loader2 size={24} className="mx-auto animate-spin text-emerald-700" />Đang tải bản đồ...
      </div>}
      {error && <div role="alert" className="absolute inset-0 grid place-content-center gap-3 bg-slate-50 p-8 text-center text-sm text-slate-700">
        {apiKey ? <AlertTriangle size={28} className="mx-auto text-amber-600" /> : <KeyRound size={28} className="mx-auto text-amber-600" />}
        <p className="max-w-sm">{error}</p>
      </div>}
    </div>
  );
}

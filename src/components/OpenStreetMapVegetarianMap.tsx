import { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed } from 'lucide-react';
import type { Coordinates, Place } from '../services/restaurantService';
import { useTheme } from '../store/ThemeContext';
import { getTileLayerConfig } from '../utils/mapConfig';

interface OpenStreetMapVegetarianMapProps {
  center: Coordinates;
  places: Place[];
  selectedPlace: Place | null;
  onSelect(place: Place): void;
  userLocation?: Coordinates | null;
  recenterTrigger?: number;
  onRecenter?(): void;
}

function MapViewport({
  center,
  selectedPlace,
  recenterTrigger,
}: {
  center: Coordinates;
  selectedPlace: Place | null;
  recenterTrigger?: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    map.invalidateSize();
    const point: [number, number] = selectedPlace
      ? [selectedPlace.lat, selectedPlace.lon]
      : [center.lat, center.lon];
    map.flyTo(point, selectedPlace ? 16 : 15, { duration: 0.6 });
  }, [center.lat, center.lon, map, selectedPlace, recenterTrigger]);
  return null;
}

const userMarkerIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `
    <div style="position:relative;width:24px;height:24px;">
      <div style="position:absolute;inset:0;background-color:#3b82f6;border-radius:9999px;opacity:0.35;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="position:relative;width:24px;height:24px;border-radius:9999px;background-color:#2563eb;border:3px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function numberedIcon(number: number) {
  return L.divIcon({
    className: 'vegeai-map-marker',
    html: `<span>${number}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

export function OpenStreetMapVegetarianMap({
  center,
  places,
  selectedPlace,
  onSelect,
  userLocation,
  recenterTrigger,
  onRecenter,
}: OpenStreetMapVegetarianMapProps) {
  const { theme } = useTheme();
  const [tileError, setTileError] = useState(false);
  const tileConfig = getTileLayerConfig(theme === 'dark', 'auto');

  return (
    <div className="relative h-full min-h-[420px] bg-slate-100 dark:bg-slate-900 rounded-2xl overflow-hidden">
      <MapContainer
        center={[center.lat, center.lon]}
        zoom={14}
        scrollWheelZoom
        className="z-0 h-full min-h-[420px] w-full"
        style={{ height: '100%', minHeight: '420px', width: '100%' }}
        aria-label="Bản đồ chỉ hiển thị quán chay đã lọc"
      >
        <TileLayer
          key={`${tileConfig.label}-${theme}`}
          attribution={tileConfig.attribution}
          url={tileConfig.url}
          subdomains={tileConfig.subdomains || '0123'}
          maxZoom={19}
          eventHandlers={{
            tileerror: () => setTileError(true),
            tileload: () => setTileError(false),
          }}
        />
        <MapViewport center={center} selectedPlace={selectedPlace} recenterTrigger={recenterTrigger} />

        {/* User GPS Location marker with pulsating blue aura */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lon]} icon={userMarkerIcon}>
            <Popup>
              <div className="text-center font-sans p-1">
                <span className="font-bold text-blue-600 dark:text-blue-400 block text-xs">
                  📍 Vị trí hiện tại của bạn
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Hiển thị các quán chay xung quanh điểm này
                </span>
              </div>
            </Popup>
          </Marker>
        )}

        {places.map((place, index) => (
          <Marker
            key={place.id}
            position={[place.lat, place.lon]}
            icon={numberedIcon(index + 1)}
            eventHandlers={{ click: () => onSelect(place) }}
          >
            {selectedPlace?.id === place.id && (
              <Popup>
                <strong>{place.name}</strong>
                <br />
                {place.address || 'Địa chỉ chưa được cập nhật'}
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>

      {/* Floating GPS button on Map for quick 1-click re-center */}
      {onRecenter && (
        <button
          type="button"
          onClick={onRecenter}
          className="absolute bottom-6 right-4 z-[400] flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/90 dark:border-slate-700 shadow-md text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
          title="Quay lại vị trí của tôi"
        >
          <LocateFixed size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Vị trí của tôi</span>
        </button>
      )}

      {tileError && (
        <p role="alert" className="absolute bottom-10 left-3 z-[1000] max-w-xs rounded-lg bg-white/95 dark:bg-slate-900/95 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 shadow">
          Không tải được ảnh nền bản đồ. Hãy kiểm tra kết nối mạng; các ghim địa điểm vẫn có thể hoạt động.
        </p>
      )}
    </div>
  );
}

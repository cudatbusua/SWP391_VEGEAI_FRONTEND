import { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Coordinates, Place } from '../services/restaurantService';

interface OpenStreetMapVegetarianMapProps {
  center: Coordinates;
  places: Place[];
  selectedPlace: Place | null;
  onSelect(place: Place): void;
}

// Vite exposes VITE_* values in the browser bundle, so restrict this public key to the frontend origin in MapTiler Cloud.
const mapTilerApiKey = import.meta.env.VITE_MAPTILER_API_KEY?.trim();
const mapTileProvider = mapTilerApiKey ? 'MapTiler' : 'OpenStreetMap';
const mapTileUrl = mapTilerApiKey
  ? `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${encodeURIComponent(mapTilerApiKey)}`
  : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const mapTileAttribution = mapTilerApiKey
  ? '<a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener noreferrer">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">&copy; OpenStreetMap contributors</a>'
  : '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">&copy; OpenStreetMap contributors</a>';
const mapTileSize = mapTilerApiKey ? 512 : 256;
// MapTiler's 512px raster tiles need a -1 offset to match Leaflet's standard zoom scale.
const mapTileZoomOffset = mapTilerApiKey ? -1 : 0;

function MapViewport({ center, selectedPlace }: Pick<OpenStreetMapVegetarianMapProps, 'center' | 'selectedPlace'>) {
  const map = useMap();
  useEffect(() => {
    const point: [number, number] = selectedPlace
      ? [selectedPlace.lat, selectedPlace.lon]
      : [center.lat, center.lon];
    map.flyTo(point, selectedPlace ? 16 : 14, { duration: 0.5 });
  }, [center.lat, center.lon, map, selectedPlace]);
  return null;
}

function numberedIcon(number: number) {
  return L.divIcon({
    className: 'vegeai-map-marker',
    html: `<span>${number}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

export function OpenStreetMapVegetarianMap({ center, places, selectedPlace, onSelect }: OpenStreetMapVegetarianMapProps) {
  const [tileError, setTileError] = useState(false);
  return (
    <div className="relative h-full min-h-[420px] bg-slate-100">
      <MapContainer
        center={[center.lat, center.lon]}
        zoom={14}
        scrollWheelZoom
        className="z-0 h-full min-h-[420px] w-full"
        aria-label="Bản đồ các quán chay đã lọc"
      >
        <TileLayer
          attribution={mapTileAttribution}
          url={mapTileUrl}
          tileSize={mapTileSize}
          zoomOffset={mapTileZoomOffset}
          minZoom={mapTilerApiKey ? 1 : 0}
          crossOrigin={mapTilerApiKey ? true : undefined}
          eventHandlers={{
            tileerror: () => setTileError(true),
            tileload: () => setTileError(false),
          }}
        />
        <MapViewport center={center} selectedPlace={selectedPlace} />
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
      {tileError && (
        <p role="alert" className="absolute bottom-10 left-3 z-[1000] max-w-xs rounded-lg bg-white/95 px-3 py-2 text-xs text-slate-700 shadow">
          Không tải được ảnh nền {mapTileProvider}. Hãy kiểm tra kết nối mạng hoặc cấu hình khóa bản đồ; các ghim địa điểm vẫn có thể hoạt động.
        </p>
      )}
    </div>
  );
}

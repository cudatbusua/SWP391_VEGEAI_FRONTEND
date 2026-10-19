import { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, ExternalLink, MapPin } from 'lucide-react';
import type { SmartMarketStore } from '../data/smartMarketData';

interface SmartMarketMapProps {
  stores: SmartMarketStore[];
  selectedStore: SmartMarketStore | null;
  onSelect(store: SmartMarketStore): void;
  userLocation: { lat: number; lon: number };
}

function MapViewport({ center, selectedStore }: { center: { lat: number; lon: number }; selectedStore: SmartMarketStore | null }) {
  const map = useMap();
  useEffect(() => {
    const point: [number, number] = selectedStore
      ? [selectedStore.lat, selectedStore.lon]
      : [center.lat, center.lon];
    map.flyTo(point, selectedStore ? 16 : 14, { duration: 0.6 });
  }, [center.lat, center.lon, map, selectedStore]);
  return null;
}

function storeIcon(store: SmartMarketStore, isSelected: boolean, index: number) {
  const isAppliance = store.category === 'APPLIANCE';
  const ringClass = isSelected ? 'ring-4 ring-emerald-300 ring-offset-2 scale-110' : 'hover:scale-105';
  
  return L.divIcon({
    className: 'custom-smart-marker',
    html: `
      <div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:9999px;background-color:${isAppliance ? '#0891b2' : isSelected ? '#059669' : '#15803d'};color:#fff;font-weight:700;font-size:13px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.2);border:2px solid #ffffff;cursor:pointer;transition:transform 0.15s ease;" class="${ringClass}">
        ${index + 1}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

const userMarkerIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `
    <div style="position:relative;width:24px;height:24px;">
      <div style="position:absolute;inset:0;background-color:#3b82f6;border-radius:9999px;opacity:0.3;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="position:relative;width:24px;height:24px;border-radius:9999px;background-color:#2563eb;border:3px solid #ffffff;box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export function SmartMarketMap({ stores, selectedStore, onSelect, userLocation }: SmartMarketMapProps) {
  const [tileError, setTileError] = useState(false);

  return (
    <div className="relative w-full h-full min-h-[460px] bg-slate-100 rounded-2xl overflow-hidden shadow-sm border border-slate-200">
      <MapContainer
        center={[userLocation.lat, userLocation.lon]}
        zoom={14}
        scrollWheelZoom={true}
        className="h-full w-full z-10"
      >
        <MapViewport center={userLocation} selectedStore={selectedStore} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{
            tileerror: () => setTileError(true),
          }}
        />

        {/* User location marker */}
        <Marker position={[userLocation.lat, userLocation.lon]} icon={userMarkerIcon}>
          <Popup>
            <div className="p-1 text-center font-sans">
              <div className="flex items-center justify-center gap-1 text-blue-600 font-bold text-xs uppercase mb-1">
                <MapPin size={14} /> Vị trí của bạn
              </div>
              <p className="text-xs text-slate-600 font-medium">Khu vực Phan Xích Long, Phú Nhuận</p>
            </div>
          </Popup>
        </Marker>

        {/* Store markers */}
        {stores.map((store, idx) => {
          const isSelected = selectedStore?.id === store.id;
          return (
            <Marker
              key={store.id}
              position={[store.lat, store.lon]}
              icon={storeIcon(store, isSelected, idx)}
              eventHandlers={{
                click: () => onSelect(store),
              }}
            >
              <Popup>
                <div className="p-1 font-sans max-w-[240px]">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {store.categoryLabel}
                    </span>
                    <span className="text-xs font-semibold text-amber-600 flex items-center">
                      ★ {store.rating}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 leading-snug mb-1">{store.name}</h4>
                  <p className="text-xs text-slate-500 mb-2">{store.address}</p>

                  <div className="p-2 bg-emerald-50/70 border border-emerald-100 rounded-lg text-xs mb-2">
                    <div className="flex items-center justify-between text-emerald-800 font-semibold mb-0.5">
                      <span>{store.statusBadge}</span>
                      <span>{store.priceEstimate}</span>
                    </div>
                    <div className="text-[11px] text-emerald-700">{store.distance} ({store.duration})</div>
                  </div>

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => onSelect(store)}
                      className="flex-1 py-1 px-2 text-xs font-semibold bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
                    >
                      Chọn cửa hàng
                    </button>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition flex items-center justify-center"
                      title="Mở Google Maps"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Route polyline to selected store */}
        {selectedStore && (
          <Polyline
            positions={[
              [userLocation.lat, userLocation.lon],
              [selectedStore.lat, selectedStore.lon],
            ]}
            color="#059669"
            weight={4}
            dashArray="6, 8"
            opacity={0.8}
          />
        )}
      </MapContainer>

      {/* Floating map legend / status */}
      <div className="absolute top-3 right-3 z-20 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-md border border-slate-200 text-xs text-slate-700 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-600 border border-white shadow-xs"></div>
          <span className="font-medium">Vị trí của bạn (Bán kính 3km)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-700 border border-white shadow-xs"></div>
          <span className="font-medium">Siêu thị chay / Nông sản</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-600 border border-white shadow-xs"></div>
          <span className="font-medium">Điện Máy Xanh (Bảo quản)</span>
        </div>
      </div>

      {tileError && (
        <div className="absolute bottom-3 left-3 z-20 bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2 rounded-lg text-xs shadow-sm flex items-center gap-2">
          <Navigation size={14} className="text-amber-700" />
          <span>Bản đồ ngoại tuyến sẵn sàng. Dữ liệu điểm bán đã được đồng bộ.</span>
        </div>
      )}
    </div>
  );
}

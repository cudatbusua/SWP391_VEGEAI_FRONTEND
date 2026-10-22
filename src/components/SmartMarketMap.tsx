import { useEffect, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, ExternalLink, MapPin, KeyRound, Layers } from 'lucide-react';
import type { SmartMarketStore } from '../data/smartMarketData';
import { useTheme } from '../store/ThemeContext';
import { getActiveMapApiKey, getTileLayerConfig, maskApiKey, type MapStyleMode } from '../utils/mapConfig';

interface SmartMarketMapProps {
  stores: SmartMarketStore[];
  selectedStore: SmartMarketStore | null;
  onSelect(store: SmartMarketStore): void;
  userLocation: { lat: number; lon: number };
}

function MapViewport({ center, selectedStore }: { center: { lat: number; lon: number }; selectedStore: SmartMarketStore | null }) {
  const map = useMap();

  useEffect(() => {
    // Invalidate map size so tiles calculate dimensions immediately upon mount
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    map.invalidateSize();
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
      <div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:9999px;background-color:${isAppliance ? '#0891b2' : isSelected ? '#10b981' : '#059669'};color:#fff;font-weight:700;font-size:13px;box-shadow:0 4px 10px -1px rgba(0,0,0,0.35);border:2.5px solid #ffffff;cursor:pointer;transition:transform 0.15s ease;" class="${ringClass}">
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
      <div style="position:absolute;inset:0;background-color:#3b82f6;border-radius:9999px;opacity:0.35;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="position:relative;width:24px;height:24px;border-radius:9999px;background-color:#2563eb;border:3px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export function SmartMarketMap({ stores, selectedStore, onSelect, userLocation }: SmartMarketMapProps) {
  const { theme } = useTheme();
  const [tileError, setTileError] = useState(false);
  const [styleMode, setStyleMode] = useState<MapStyleMode>('auto');
  const activeKey = getActiveMapApiKey();
  const tileConfig = getTileLayerConfig(theme === 'dark', styleMode);

  return (
    <div className="relative w-full h-full min-h-[460px] bg-slate-100 dark:bg-slate-900 rounded-2xl overflow-hidden shadow-xs border border-slate-200 dark:border-slate-800">
      <MapContainer
        center={[userLocation.lat, userLocation.lon]}
        zoom={14}
        scrollWheelZoom={true}
        className="h-full w-full z-10"
        style={{ height: '100%', minHeight: '460px', width: '100%' }}
      >
        <MapViewport center={userLocation} selectedStore={selectedStore} />

        <TileLayer
          key={`${tileConfig.label}-${theme}-${styleMode}`}
          attribution={tileConfig.attribution}
          url={tileConfig.url}
          subdomains={tileConfig.subdomains || '0123'}
          maxZoom={19}
          eventHandlers={{
            tileerror: () => {
              if (styleMode !== 'esri') {
                setStyleMode('esri');
              }
              setTileError(false);
            },
            tileload: () => setTileError(false),
          }}
        />

        {/* User location marker */}
        <Marker position={[userLocation.lat, userLocation.lon]} icon={userMarkerIcon}>
          <Popup>
            <div className="p-1 text-center font-sans">
              <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase mb-1">
                <MapPin size={14} /> Vị trí của bạn
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">Khu vực Trung tâm TP.HCM</p>
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
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                      {store.categoryLabel}
                    </span>
                    <span className="text-xs font-semibold text-amber-500 flex items-center">
                      ★ {store.rating}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-snug mb-1">{store.name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{store.address}</p>

                  <div className="p-2 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 rounded-lg text-xs mb-2">
                    <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-semibold mb-0.5">
                      <span>{store.statusBadge}</span>
                      <span>{store.priceEstimate}</span>
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400">{store.distance} ({store.duration})</div>
                  </div>

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => onSelect(store)}
                      className="flex-1 py-1.5 px-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition cursor-pointer"
                    >
                      Chọn điểm này
                    </button>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition flex items-center justify-center"
                      title="Chỉ đường Google Maps"
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
            color="#10b981"
            weight={4}
            dashArray="6, 8"
            opacity={0.85}
          />
        )}
      </MapContainer>

      {/* Top-Left API Key & Layer Switcher Bar */}
      <div className="absolute top-3 left-14 z-20 flex flex-wrap items-center gap-2">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-md border border-slate-200/90 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <KeyRound size={12} className="text-emerald-600 dark:text-emerald-400" />
          <span>Map Key: <code className="font-mono text-emerald-700 dark:text-emerald-400">{maskApiKey(activeKey)}</code></span>
        </div>

        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-slate-200/90 dark:border-slate-800 flex items-center gap-1 text-[11px]">
          <Layers size={12} className="text-slate-400 ml-1.5 mr-0.5" />
          {([
            ['auto', 'Đường phố'],
            ['satellite', 'Vệ tinh Google'],
            ['esri', 'Esri Map'],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setStyleMode(mode)}
              className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                styleMode === mode
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Floating map legend / status */}
      <div className="absolute top-3 right-3 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-xl shadow-md border border-slate-200/90 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-600 border border-white shadow-xs"></div>
          <span className="font-medium">Vị trí của bạn</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-600 border border-white shadow-xs"></div>
          <span className="font-medium">Quán chay / Chợ nông sản</span>
        </div>
      </div>

      {tileError && (
        <div className="absolute bottom-3 left-3 z-20 bg-amber-50 dark:bg-amber-950/90 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 px-3 py-2 rounded-lg text-xs shadow-sm flex items-center gap-2">
          <Navigation size={14} className="text-amber-700 dark:text-amber-400" />
          <span>Đang chuyển đổi máy chủ bản đồ dự phòng...</span>
        </div>
      )}
    </div>
  );
}

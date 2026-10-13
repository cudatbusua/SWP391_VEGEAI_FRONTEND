export interface Place { id: string; name: string; lat: number; lon: number; distance: number; address: string; vegan: boolean; hours?: string; }
export interface Coordinates { lat: number; lon: number; }
function distance(a: Coordinates, b: Coordinates) {
  const rad = (n: number) => n * Math.PI / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export const restaurantService = {
  async locate(query: string): Promise<Coordinates> {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q: query, format: 'jsonv2', limit: '1' })}`, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('Không thể tìm khu vực lúc này. Vui lòng thử lại sau.');
    const data = await response.json() as { lat: string; lon: string }[];
    if (!data.length) throw new Error('Không tìm thấy khu vực. Hãy nhập thêm quận hoặc thành phố.');
    return { lat: Number(data[0].lat), lon: Number(data[0].lon) };
  },
  async nearby(center: Coordinates, radius: number): Promise<Place[]> {
    const around = `around:${radius * 1000},${center.lat},${center.lon}`;
    const query = `[out:json][timeout:25];(nwr[amenity~"^(restaurant|cafe|fast_food)$"]["diet:vegetarian"~"^(yes|only)$"](${around});nwr[amenity~"^(restaurant|cafe|fast_food)$"]["diet:vegan"~"^(yes|only)$"](${around});nwr[amenity~"^(restaurant|cafe|fast_food)$"][name~"chay|vegan|vegetarian",i](${around}););out center tags;`;
    const response = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(35000) });
    if (!response.ok) throw new Error('Dịch vụ tìm quán đang bận. Bạn có thể mở Google Maps bên dưới.');
    const data = await response.json() as { elements: { id: number; type: string; lat?: number; lon?: number; center?: Coordinates; tags?: Record<string, string> }[] };
    return data.elements.flatMap(item => {
      const point = item.center ?? { lat: item.lat!, lon: item.lon! };
      if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon) || !item.tags?.name) return [];
      return [{ id: `${item.type}-${item.id}`, name: item.tags.name, ...point, distance: distance(center, point), address: ['addr:housenumber', 'addr:street', 'addr:suburb', 'addr:city'].map(key => item.tags?.[key]).filter(Boolean).join(', '), vegan: ['yes', 'only'].includes(item.tags['diet:vegan']), hours: item.tags.opening_hours }];
    }).sort((a, b) => a.distance - b.distance);
  },
};

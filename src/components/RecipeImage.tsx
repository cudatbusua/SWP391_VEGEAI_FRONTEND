const recipeArt: Record<string, string> = {
  'nấm đùi gà xào sả ớt giòn thơm': '/images/king-oyster-lemongrass.png',
  'canh cải ngọt nấu nấm bào ngư': '/images/choy-sum-oyster-soup.png',
  'đậu phụ sốt cà chua tươi': '/images/tofu-tomato.png',
};
const seedImages = new Set([
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
  'https://images.unsplash.com/photo-1547592180-85f173990554',
  'https://images.unsplash.com/photo-1540420773420-3366772f4999',
]);

export function RecipeImage({ src, title, detail = false }: { src?: string; title: string; detail?: boolean }) {
  const artwork = (!src || seedImages.has(src)) ? recipeArt[title.trim().toLowerCase()] : undefined;
  return <div className={'relative w-full overflow-hidden bg-gray-100 ' + (detail ? 'aspect-[4/3] rounded-lg' : 'aspect-[16/11]')}>
    <img src={artwork || src || '/images/vietnamese-vegan-table.png'} alt={title} loading={detail ? 'eager' : 'lazy'}
      className="absolute inset-0 w-full h-full object-cover" onError={event => {
        const image = event.currentTarget;
        if (!image.src.endsWith('/images/vietnamese-vegan-table.png')) image.src = '/images/vietnamese-vegan-table.png';
      }} />
  </div>;
}

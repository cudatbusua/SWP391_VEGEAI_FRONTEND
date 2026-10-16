export const dietLabels: Record<string, string> = {
  VEGAN: 'Thuần chay', VEGETARIAN: 'Ăn chay', LACTO_OVO: 'Chay có trứng và sữa',
  LACTO: 'Chay có sữa', OVO: 'Chay có trứng', RAW_VEGAN: 'Thuần chay thô',
  PESCATARIAN: 'Chế độ có hải sản', FLEXITARIAN: 'Bán chay',
};
export const allergyLabels: Record<string, string> = {
  PEANUTS: 'Đậu phộng', TREE_NUTS: 'Hạt dinh dưỡng', SOY: 'Đậu nành', GLUTEN: 'Gluten',
  DAIRY: 'Sữa', EGGS: 'Trứng', SESAME: 'Mè', MUSHROOMS: 'Nấm', CORN: 'Bắp',
};
export function displayAllergies(value?: string) {
  return !value || value === 'NONE' ? '' : value.split(',').map(part => allergyLabels[part.trim()] || part.trim()).join(', ');
}

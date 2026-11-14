export interface RecipeStepItem {
  id: string;
  stepNumber: number;
  title: string;
  instruction: string;
  durationMinutes?: number;
  tip?: string;
}

export const DEFAULT_SERVINGS = '2-3 người';
export const DEFAULT_COOK_TIME = '25';
export const DEFAULT_INGREDIENTS_TEXT =
  '- 200g Nấm đùi gà (rửa sạch, cắt lát mỏng)\n- 2 miếng Đậu hũ trắng (chiên vàng đều)\n- 1 củ Cà rốt (thái sợi vừa ăn)\n- 2 thìa canh Nước tương tamari\n- 1 thìa cà phê Dầu mè nguyên chất & tiêu đen';
export const DEFAULT_RECIPE_STEPS: RecipeStepItem[] = [
  {
    id: 'step-1',
    stepNumber: 1,
    title: 'Sơ chế & Chuẩn bị nguyên liệu',
    instruction: 'Nấm đùi gà ngâm nước muối loãng 5 phút rồi rửa sạch, để ráo và cắt lát mỏng. Đậu hũ cắt miếng vừa ăn và chiên vàng giòn.',
    durationMinutes: 10,
    tip: 'Ngâm nấm với muối loãng giúp nấm giòn ngọt tự nhiên và giữ màu trắng sáng.',
  },
  {
    id: 'step-2',
    stepNumber: 2,
    title: 'Xào & Thấm vị nước sốt',
    instruction: 'Làm nóng chảo với chút dầu mè, phi thơm hành boa-rô rồi cho nấm vào xào nhanh trên lửa lớn. Thêm cà rốt và đậu hũ vào, nêm nước tương tamari và tiêu đen.',
    durationMinutes: 10,
    tip: 'Xào lửa lớn trong 3 phút đầu để nấm giữ độ mọng nước, không bị dai.',
  },
  {
    id: 'step-3',
    stepNumber: 3,
    title: 'Hoàn thiện & Thưởng thức',
    instruction: 'Tắt bếp, rắc tiêu đen xay và thêm vài nhánh ngò rí lên trên. Dọn ra đĩa ăn kèm cơm nóng hoặc bún gạo lứt.',
    durationMinutes: 5,
    tip: 'Dùng ngay khi còn nóng để cảm nhận trọn vẹn hương vị tươi ngon.',
  },
];

export function generateRecipeMarkdown(
  sServings: string,
  sCookTime: string,
  sIngredients: string,
  sSteps: RecipeStepItem[]
): string {
  return `> Khẩu phần: ${sServings.trim() || '2-3 người'} | Thời gian nấu: ${sCookTime.trim() || '25'} phút\n\n### Danh sách nguyên liệu:\n${sIngredients.trim()}\n\n### Hướng dẫn thực hiện:\n${sSteps.map(s => `${s.stepNumber}. **${s.title.trim() || `Bước ${s.stepNumber}`}**${s.durationMinutes ? ` (${s.durationMinutes} phút)` : ''}: ${s.instruction.trim()}${s.tip?.trim() ? `\n   *Mẹo:* ${s.tip.trim()}` : ''}`).join('\n\n')}`;
}

export function parseRecipeMarkdown(raw: string): {
  servings: string;
  cookTime: string;
  ingredientsText: string;
  steps: RecipeStepItem[];
} | null {
  const normalized = raw.replace(/\r\n/g, '\n').trim();
  const ingMarker = '### Danh sách nguyên liệu:';
  const stepMarker = '### Hướng dẫn thực hiện:';
  const ingIdx = normalized.indexOf(ingMarker);
  const stepIdx = normalized.indexOf(stepMarker);
  if (ingIdx === -1 || stepIdx === -1 || stepIdx <= ingIdx) return null;

  const headerPart = normalized.slice(0, ingIdx).trim();
  const metaMatch = headerPart.match(/^>\s*Khẩu phần:\s*([^|\n]+?)\s*\|\s*Thời gian nấu:\s*(\d+)/i);
  const servings = metaMatch ? metaMatch[1].trim() : DEFAULT_SERVINGS;
  const cookTime = metaMatch ? metaMatch[2].trim() : DEFAULT_COOK_TIME;

  const ingredientsText = normalized.slice(ingIdx + ingMarker.length, stepIdx).trim();
  const stepsSection = normalized.slice(stepIdx + stepMarker.length).trim();
  if (!ingredientsText && !stepsSection) return null;

  const blocks = stepsSection.split(/\n(?=\d+\.\s+\*\*)/).map(b => b.trim()).filter(Boolean);
  const parsedSteps: RecipeStepItem[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const match = block.match(
      /^(\d+)\.\s+\*\*(.+?)\*\*(?:\s*\((\d+)\s*phút\))?:\s*([\s\S]*?)(?:\n\s*\*Mẹo:\*\s*([\s\S]*))?$/
    );
    if (!match) return null;
    parsedSteps.push({
      id: `parsed-step-${i + 1}`,
      stepNumber: Number(match[1]) || i + 1,
      title: match[2].trim(),
      durationMinutes: match[3] ? Number(match[3]) : undefined,
      instruction: match[4].trim(),
      tip: match[5]?.trim() || '',
    });
  }
  if (parsedSteps.length === 0) return null;
  return { servings, cookTime, ingredientsText, steps: parsedSteps };
}

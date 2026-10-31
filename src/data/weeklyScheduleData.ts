export interface ScheduledMealItem {
  name: string;
  calories: number;
  protein: number;
  category: string;
  description?: string;
}

export interface ScheduledDayPlan {
  dayName: string;
  dayIndex: number;
  targetCal: number;
  breakfast: ScheduledMealItem;
  lunch: ScheduledMealItem;
  dinner: ScheduledMealItem;
}

export const DEFAULT_WEEKLY_SCHEDULE: ScheduledDayPlan[] = [
  {
    dayName: 'Thứ Hai',
    dayIndex: 1,
    targetCal: 1450,
    breakfast: { name: 'Bánh mì ngũ cốc bơ dầm & hạt chia', calories: 340, protein: 9, category: 'Năng lượng sáng', description: 'Giàu chất béo tốt omega-3 và chất xơ hòa tan' },
    lunch: { name: 'Cơm gạo lứt đậu hũ áp chảo sốt cà chua', calories: 540, protein: 22, category: 'Bữa chính', description: 'Đậm đà đạm thực vật, ít tinh bột nhanh' },
    dinner: { name: 'Canh nấm rong biển hạt sen thanh nhiệt', calories: 380, protein: 14, category: 'Thanh nhẹ tối', description: 'An thần, dễ ngủ, khoáng chất i-ốt dồi dào' }
  },
  {
    dayName: 'Thứ Ba',
    dayIndex: 2,
    targetCal: 1420,
    breakfast: { name: 'Yến mạch nấu sữa đậu nành & chuối', calories: 320, protein: 11, category: 'Năng lượng sáng', description: 'Bổ sung kali, năng lượng giải phóng chậm' },
    lunch: { name: 'Bún riêu chay nấm rơm & chả đậu hũ', calories: 510, protein: 20, category: 'Bữa chính', description: 'Nước dùng cà chua thanh ngọt tự nhiên' },
    dinner: { name: 'Rau củ ngũ sắc luộc kho quẹt chay', calories: 360, protein: 12, category: 'Thanh nhẹ tối', description: 'Đa dạng vitamin A, C, chất chống oxy hóa' }
  },
  {
    dayName: 'Thứ Tư',
    dayIndex: 3,
    targetCal: 1480,
    breakfast: { name: 'Phở nấm thực dưỡng thanh ngọt', calories: 360, protein: 13, category: 'Năng lượng sáng', description: 'Hương vị truyền thống thảo mộc quế hồi' },
    lunch: { name: 'Cơm gạo lứt sườn non lúa mì kho tiêu', calories: 560, protein: 24, category: 'Bữa chính', description: 'Đậm vị cay ấm, giàu đạm lúa mì seitan' },
    dinner: { name: 'Salad bơ đậu gà sốt mè rang', calories: 390, protein: 16, category: 'Thanh nhẹ tối', description: 'Siêu thực phẩm đậu gà giàu chất xơ & folate' }
  },
  {
    dayName: 'Thứ Năm',
    dayIndex: 4,
    targetCal: 1400,
    breakfast: { name: 'Súp ngô non đậu hạt sen bùi ngậy', calories: 310, protein: 8, category: 'Năng lượng sáng', description: 'Mềm mịn, dịu êm dạ dày buổi sáng' },
    lunch: { name: 'Bún lứt xào nấm đùi gà rau cải thìa', calories: 490, protein: 19, category: 'Bữa chính', description: 'Sợi bún lứt dai giòn thơm dầu mè' },
    dinner: { name: 'Canh chua dọc mùng đậu hũ non', calories: 370, protein: 13, category: 'Thanh nhẹ tối', description: 'Vị chua thanh mát me dầm giải nhiệt cơ thể' }
  },
  {
    dayName: 'Thứ Sáu',
    dayIndex: 5,
    targetCal: 1460,
    breakfast: { name: 'Bánh bao chay nhân nấm tươi', calories: 330, protein: 10, category: 'Năng lượng sáng', description: 'Vỏ bánh mềm xốp, nhân mộc nhĩ nấm hương' },
    lunch: { name: 'Cơm tấm sườn nấm bào ngư chiên giòn', calories: 550, protein: 21, category: 'Bữa chính', description: 'Chả trứng chay béo ngậy kèm đồ chua' },
    dinner: { name: 'Cháo yến mạch củ sen hầm thảo mộc', calories: 360, protein: 12, category: 'Thanh nhẹ tối', description: 'Thanh lọc cơ thể, dưỡng tâm an thần cuối tuần' }
  },
  {
    dayName: 'Thứ Bảy',
    dayIndex: 6,
    targetCal: 1520,
    breakfast: { name: 'Smoothie bowl xoài cải kale hạt lanh', calories: 340, protein: 10, category: 'Năng lượng sáng', description: 'Vitamin tổng hợp từ siêu rau củ tươi sống' },
    lunch: { name: 'Cà ri đậu gà khoai lang cốt dừa & bánh mì', calories: 580, protein: 23, category: 'Bữa chính', description: 'Hương cà ri nồng ấm, béo ngậy nước cốt dừa' },
    dinner: { name: 'Gỏi cuốn ngũ sắc tương bơ đậu phộng', calories: 390, protein: 15, category: 'Thanh nhẹ tối', description: 'Rau thơm, bún lứt, đậu hũ cuốn tươi giòn' }
  },
  {
    dayName: 'Chủ Nhật',
    dayIndex: 0,
    targetCal: 1500,
    breakfast: { name: 'Hủ tiếu chay Nam Vang nước dùng củ cải', calories: 370, protein: 12, category: 'Năng lượng sáng', description: 'Nước dùng củ quả ngọt lành tự nhiên' },
    lunch: { name: 'Lẩu nấm dưỡng sinh thảo mộc & bún tươi', calories: 580, protein: 25, category: 'Bữa chính', description: 'Hơn 5 loại nấm tươi quý: đông cô, linh chi, mỡ' },
    dinner: { name: 'Chè hạt sen long nhãn táo đỏ ít ngọt', calories: 320, protein: 7, category: 'Thanh nhẹ tối', description: 'Món tráng miệng thanh nhẹ chuẩn y thực' }
  }
];

import { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { MainLayout } from '../layouts/MainLayout';
import { Button } from '../components/Button';
import { aiService } from '../services/aiService';
import { fridgeService } from '../services/fridgeService';
import { errorMessage } from '../services/apiClient';
import { useAuth } from '../hooks/useAuth';
import type { FridgeScanResponse } from '../types/api';

export function FridgeScanPage() {
  const { isAuthenticated } = useAuth();
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [result, setResult] = useState<FridgeScanResponse | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!image) { setPreview(''); return; }
    const url = URL.createObjectURL(image); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  const scan = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!image || busy) return;
    setBusy(true); setError(''); setMessage(''); setResult(null);
    try { setResult(await aiService.scanFridge(image)); }
    catch (reason) { setError(errorMessage(reason)); }
    finally { setBusy(false); }
  };
  const saveToFridge = async () => {
    if (!result || saving) return;
    setSaving(true); setError(''); setMessage('');
    try {
      const saved = await fridgeService.confirmScan(result);
      setMessage(`Đã lưu ${saved.totalProcessed} nguyên liệu: ${saved.newlyAddedCount} mới, ${saved.updatedExistingCount} cập nhật.`);
    } catch (reason) { setError(errorMessage(reason)); }
    finally { setSaving(false); }
  };
  const freshness: Record<string, string> = { FRESH: 'Tươi', USABLE: 'Nên dùng sớm', SPOILED: 'Đã hỏng' };
  return <MainLayout><div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
    <div className="flex items-center gap-3"><Camera className="text-emerald-600" /><h1 className="text-3xl font-extrabold">Quét Tủ Lạnh</h1></div>
    <p className="text-sm text-gray-500">Tải ảnh nguyên liệu để nhận kết quả phân tích và gợi ý món chay.</p>
    <form onSubmit={scan} className="bg-white rounded-3xl border border-gray-200 p-6 space-y-4">
      <label htmlFor="fridge-image" className="block text-sm font-semibold">Ảnh JPG, PNG hoặc WEBP (tối đa 5 MB)</label>
      <input id="fridge-image" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => {
        setImage(event.target.files?.[0] || null); setResult(null); setError('');
      }} className="block w-full text-sm file:mr-4 file:rounded-xl file:border-0 file:bg-emerald-50 file:p-3 file:text-emerald-800" />
      {preview && <img src={preview} alt="Ảnh nguyên liệu đã chọn" className="max-h-80 rounded-2xl object-contain mx-auto" />}
      {error && <p role="alert" className="text-red-600 text-sm">{error}</p>}
      {message && <p role="status" className="text-emerald-700 text-sm">{message}</p>}
      <Button type="submit" disabled={!image} isLoading={busy}>{busy ? 'Đang phân tích ảnh...' : 'Phân tích nguyên liệu'}</Button>
    </form>
    {result && <section aria-live="polite" className="bg-white rounded-3xl border border-gray-200 p-6 space-y-5">
      <h2 className="text-xl font-bold">Kết quả phân tích</h2><p>{result.summary}</p>
      <p className="text-sm text-gray-500">Phát hiện {result.totalItemsDetected} nguyên liệu.</p>
      {result.hasNonVegetarianItem && <p className="bg-amber-50 text-amber-800 rounded-xl p-3">Có nguyên liệu không phù hợp chế độ ăn chay.</p>}
      {!!result.warnings?.length && <ul className="bg-red-50 text-red-700 rounded-xl p-4 list-disc pl-8">{result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
      <div className="grid sm:grid-cols-2 gap-4">{result.ingredients?.map((item, index) => <article key={index} className="border border-gray-200 rounded-2xl p-4 text-sm space-y-2">
        <h3 className="font-bold">{item.name}</h3><p>{item.isVegetarian ? 'Nguyên liệu chay' : 'Không phải nguyên liệu chay'} · {freshness[item.freshness] || item.freshness}</p>
        {item.shelfLifeEstimate && <p>Thời hạn ước tính: {item.shelfLifeEstimate}</p>}
        {item.visualSigns && <p className="text-gray-500">{item.visualSigns}</p>}
        {item.storageTip && <p className="text-emerald-800">{item.storageTip}</p>}
      </article>)}</div>
      {!!result.suggestedRecipes?.length && <div><h3 className="font-bold mb-2">Món chay được gợi ý</h3><ul className="list-disc pl-5">{result.suggestedRecipes.map((recipe, index) => <li key={index}>{recipe}</li>)}</ul></div>}
      {isAuthenticated && <Button type="button" isLoading={saving} onClick={saveToFridge}>Lưu nguyên liệu vào tủ lạnh</Button>}
    </section>}
  </div></MainLayout>;
}

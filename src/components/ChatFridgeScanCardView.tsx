import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ExternalLink,
  Flame,
  Plus,
  Refrigerator,
  Save,
} from 'lucide-react';
import {
  safeChatImageUrl,
  type ChatFridgeScanCardData,
  type ChatFridgeScanItem,
} from '../features/ai/fridgeChatBridge';

function SafeScanThumb({ url, index }: { url: string; index: number }) {
  const [broken, setBroken] = useState(false);
  const safe = safeChatImageUrl(url);
  if (!safe || broken) return null;

  return (
    <a
      href={safe}
      target="_blank"
      rel="noreferrer"
      title={`Xem ảnh quét tủ lạnh #${index + 1}`}
      className="group relative block h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/25 bg-black/20 shadow-2xs"
    >
      <img
        src={safe}
        alt={`Ảnh quét tủ lạnh ${index + 1}`}
        loading="lazy"
        onError={() => setBroken(true)}
        className="h-full w-full object-cover transition group-hover:scale-105"
      />
      <span className="absolute bottom-1 right-1 rounded bg-black/60 p-0.5 text-white opacity-0 transition group-hover:opacity-100">
        <ExternalLink className="h-2.5 w-2.5" />
      </span>
    </a>
  );
}

function itemFreshnessTone(item: ChatFridgeScanItem): string {
  if (item.freshness === 'USABLE') {
    return 'border-amber-300/60 bg-amber-500/20 text-amber-100';
  }
  return 'border-emerald-300/40 bg-emerald-950/35 text-emerald-50';
}

export function ChatFridgeScanCardView({
  card,
  canSaveToFridge,
  saving = false,
  saveError = '',
  onSaveToFridge,
  onAskCookPriority,
  onScanMoreInChat,
  onAddManualIngredient,
}: {
  card: ChatFridgeScanCardData;
  canSaveToFridge: boolean;
  saving?: boolean;
  saveError?: string;
  onSaveToFridge: () => void;
  onAskCookPriority: (prompt: string) => void;
  onScanMoreInChat?: () => void;
  onAddManualIngredient?: (name: string) => void;
}) {
  const [addingItem, setAddingItem] = useState(false);
  const [draftIngredient, setDraftIngredient] = useState('');
  const images = (card.images || []).filter((img) => Boolean(safeChatImageUrl(img)));
  const urgentItems = card.items.filter(
    (item) => item.freshness === 'USABLE' || item.isPreviouslyTracked
  );
  const visibleWarnings = (card.warnings || [])
    .filter((w) => w && !w.includes('ước tính từ ảnh'))
    .slice(0, 3);

  return (
    <div className="mb-3 rounded-xl border border-white/20 bg-black/15 p-3 text-left text-xs text-white/95">
      {images.length > 0 && (
        <div className="mb-2.5">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-100/90">
            Ảnh tủ lạnh đã quét ({images.length}) — bấm để xem ảnh gốc
          </p>
          <div className="flex flex-wrap gap-2">
            {images.map((url, idx) => (
              <SafeScanThumb key={`${url}-${idx}`} url={url} index={idx} />
            ))}
          </div>
        </div>
      )}

      <div className="mb-2">
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-100/90">
          Nguyên liệu nhận diện ({card.items.length} món)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {card.items.slice(0, 14).map((item, idx) => (
            <span
              key={`${item.name}-${idx}`}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-medium ${itemFreshnessTone(item)}`}
            >
              <span>{item.name}</span>
              {item.quantity != null && (
                <span className="opacity-80">
                  ({item.quantity} {item.unit || 'phần'})
                </span>
              )}
              {item.freshness === 'USABLE' && (
                <span className="rounded bg-amber-400/25 px-1 text-[9px] font-bold text-amber-200">
                  Dùng sớm
                </span>
              )}
              {item.category === 'LACTO' && (
                <span className="rounded bg-blue-400/25 px-1 text-[9px] font-bold text-blue-100">
                  🥛 Sữa
                </span>
              )}
              {item.category === 'OVO' && (
                <span className="rounded bg-blue-400/25 px-1 text-[9px] font-bold text-blue-100">
                  🥚 Trứng
                </span>
              )}
              {(item.category === 'LACTO_OVO' || item.category === 'OVO_LACTO') && (
                <span className="rounded bg-blue-400/25 px-1 text-[9px] font-bold text-blue-100">
                  🥛🥚 Trứng/Sữa
                </span>
              )}
              {item.needsLabelVerification && (
                <span className="rounded bg-amber-400/25 px-1 text-[9px] font-bold text-amber-100">
                  🏷️ Đọc nhãn
                </span>
              )}
              {item.containsFivePungent && (
                <span className="rounded bg-purple-400/25 px-1 text-[9px] font-bold text-purple-100">
                  🧄 Ngũ vị tân
                </span>
              )}
              {item.isPreviouslyTracked && (
                <span className="rounded bg-sky-400/25 px-1 text-[9px] font-bold text-sky-100">
                  Tủ {item.previousDaysInFridge ?? 0}d
                </span>
              )}
            </span>
          ))}
          {card.items.length > 14 && (
            <span className="inline-flex items-center rounded-lg border border-white/20 px-2 py-0.5 text-[10px] text-emerald-100/90">
              +{card.items.length - 14} món khác
            </span>
          )}
        </div>
      </div>

      {visibleWarnings.length > 0 && (
        <div className="mb-2.5 rounded-lg border border-amber-300/35 bg-amber-500/15 px-2.5 py-2 text-[11px] text-amber-100">
          <p className="mb-1 flex items-center gap-1 font-bold text-amber-200">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Lưu ý từ lần quét
          </p>
          <ul className="space-y-0.5 pl-4 list-disc">
            {visibleWarnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {saveError && (
        <p className="mb-2 rounded-lg bg-rose-500/25 px-2.5 py-1.5 text-[11px] font-semibold text-rose-100">
          {saveError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {card.savedToFridge ? (
          <span className="inline-flex items-center gap-1 rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 shadow-2xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            {card.savedSummary || 'Đã lưu vào Kho Tủ Lạnh'}
          </span>
        ) : (
          canSaveToFridge &&
          card.items.length > 0 && (
            <button
              type="button"
              disabled={saving}
              onClick={onSaveToFridge}
              className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 shadow-2xs transition hover:bg-emerald-50 disabled:opacity-60 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Đang lưu...' : `Lưu ${card.items.length} món vào Kho (/fridge)`}
            </button>
          )
        )}

        {onAddManualIngredient && (
          <button
            type="button"
            onClick={() => setAddingItem((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-lg border border-white/30 bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/20 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Thêm món
          </button>
        )}

        {urgentItems.length > 0 && (
          <button
            type="button"
            onClick={() =>
              onAskCookPriority(
                `Hãy ưu tiên lên công thức nấu hết ngay các nguyên liệu cần dùng sớm trong lần quét này: ${urgentItems
                  .map((i) => i.name)
                  .join(', ')}.`
              )
            }
            className="inline-flex items-center gap-1 rounded-lg border border-amber-300/50 bg-amber-500/25 px-2.5 py-1.5 text-[11px] font-bold text-amber-100 transition hover:bg-amber-500/35 cursor-pointer"
          >
            <Flame className="h-3.5 w-3.5" /> Nấu cứu món sắp hết hạn
          </button>
        )}

        {onScanMoreInChat && canSaveToFridge && (
          <button
            type="button"
            onClick={onScanMoreInChat}
            className="inline-flex items-center gap-1 rounded-lg border border-white/30 bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/20 cursor-pointer"
          >
            <Camera className="h-3.5 w-3.5" /> Quét thêm ngăn tại đây
          </button>
        )}

        <Link
          to="/fridge"
          className="inline-flex items-center gap-1 rounded-lg border border-white/30 bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/20"
        >
          <Refrigerator className="h-3.5 w-3.5" /> Kho Tủ Lạnh
        </Link>
        <Link
          to="/fridge-scan"
          className="inline-flex items-center gap-1 rounded-lg border border-white/30 bg-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/20"
        >
          <Camera className="h-3.5 w-3.5" /> Quét mới
        </Link>
      </div>

      {addingItem && onAddManualIngredient && (
        <form
          className="mt-2.5 flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = draftIngredient.trim();
            if (!trimmed) return;
            onAddManualIngredient(trimmed);
            setDraftIngredient('');
            setAddingItem(false);
          }}
        >
          <input
            type="text"
            value={draftIngredient}
            onChange={(e) => setDraftIngredient(e.target.value)}
            placeholder="Nhập tên nguyên liệu muốn bổ sung (VD: Đậu hũ non)..."
            className="min-w-0 flex-1 rounded-lg border border-white/30 bg-black/25 px-2.5 py-1.5 text-[11px] text-white placeholder:text-emerald-100/60 outline-none focus:border-white"
          />
          <button
            type="submit"
            disabled={!draftIngredient.trim()}
            className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50 cursor-pointer"
          >
            Thêm
          </button>
        </form>
      )}
    </div>
  );
}

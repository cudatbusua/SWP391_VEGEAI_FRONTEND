import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, ScrollText, ShieldCheck, X } from 'lucide-react';

export const TERMS_VERSION = '1.0 · 06/11/2026';

export type PolicySection = 'terms' | 'privacy';

interface Clause {
  title: string;
  items: string[];
}

const TERMS: Clause[] = [
  {
    title: '1. Chấp nhận điều khoản',
    items: [
      'Khi tạo tài khoản và sử dụng VEGEAI, bạn xác nhận đã đọc, hiểu và đồng ý tuân thủ toàn bộ Điều khoản sử dụng và Chính sách bảo mật này.',
      'Nếu không đồng ý với bất kỳ nội dung nào, vui lòng không đăng ký hoặc ngừng sử dụng dịch vụ.',
    ],
  },
  {
    title: '2. Tài khoản của bạn',
    items: [
      'Bạn cần từ 16 tuổi trở lên, hoặc có sự đồng ý của cha mẹ/người giám hộ để sử dụng VEGEAI.',
      'Thông tin đăng ký (tên đăng nhập, họ tên, email) phải chính xác và thuộc về bạn. Mỗi người chỉ sử dụng một tài khoản.',
      'Bạn tự chịu trách nhiệm giữ bí mật mật khẩu và mọi hoạt động diễn ra trên tài khoản của mình. Hãy báo ngay cho chúng tôi nếu nghi ngờ tài khoản bị truy cập trái phép.',
    ],
  },
  {
    title: '3. Thông tin dinh dưỡng và AI không thay thế tư vấn y tế',
    items: [
      'Thực đơn, chỉ số dinh dưỡng, gợi ý của AI Bếp trưởng và các nội dung khác chỉ mang tính tham khảo, được tính từ dữ liệu công thức và hồ sơ bạn cung cấp. Đây không phải chẩn đoán hay phác đồ điều trị y khoa.',
      'Nếu bạn có bệnh lý, đang mang thai, cho con bú, hoặc có dị ứng thực phẩm, hãy tham khảo ý kiến bác sĩ hoặc chuyên gia dinh dưỡng trước khi thay đổi chế độ ăn.',
      'Bạn có trách nhiệm kiểm tra nhãn nguyên liệu và nguy cơ lây nhiễm chéo. VEGEAI không chịu trách nhiệm cho phản ứng dị ứng hoặc vấn đề sức khỏe phát sinh từ việc làm theo gợi ý mà không kiểm tra.',
      'Câu trả lời do AI tạo ra có thể chưa chính xác hoặc chưa đầy đủ.',
    ],
  },
  {
    title: '4. Nội dung bạn đăng tải',
    items: [
      'Bạn giữ quyền sở hữu công thức, hình ảnh, video và bình luận do mình đăng. Khi đăng, bạn cho phép VEGEAI hiển thị và lưu trữ nội dung đó trong phạm vi vận hành dịch vụ.',
      'Bạn chỉ đăng nội dung do mình tạo ra hoặc có quyền sử dụng. Không đăng nội dung vi phạm bản quyền của người khác.',
      'Nội dung có thể được đội ngũ kiểm duyệt xem xét trước hoặc sau khi hiển thị. Nội dung vi phạm có thể bị ẩn hoặc gỡ bỏ mà không cần báo trước.',
    ],
  },
  {
    title: '5. Hành vi bị nghiêm cấm',
    items: [
      'Đăng nội dung xúc phạm, thù ghét, khiêu dâm, bạo lực, lừa đảo, quảng cáo trái phép hoặc spam.',
      'Đưa thông tin sai lệch về sức khỏe, dinh dưỡng có thể gây hại cho người khác.',
      'Mạo danh người khác, thu thập dữ liệu của người dùng khác khi chưa được đồng ý.',
      'Tấn công, dò quét lỗ hổng, can thiệp hệ thống, dùng công cụ tự động để khai thác dữ liệu hoặc lạm dụng tính năng AI.',
      'Tạo nhiều tài khoản để lách giới hạn hoặc né tránh việc bị khóa.',
    ],
  },
  {
    title: '6. Tạm khóa và chấm dứt tài khoản',
    items: [
      'VEGEAI có quyền cảnh báo, giới hạn tính năng, tạm khóa hoặc khóa vĩnh viễn tài khoản vi phạm các điều khoản này.',
      'Bạn có thể ngừng sử dụng bất kỳ lúc nào và liên hệ đội ngũ VEGEAI để yêu cầu xóa tài khoản.',
    ],
  },
  {
    title: '7. Thay đổi điều khoản',
    items: [
      'Chúng tôi có thể cập nhật điều khoản khi dịch vụ thay đổi. Với thay đổi quan trọng, bạn sẽ được thông báo trong ứng dụng. Việc tiếp tục sử dụng sau khi cập nhật đồng nghĩa với việc bạn chấp nhận phiên bản mới.',
    ],
  },
];

const PRIVACY: Clause[] = [
  {
    title: '1. Dữ liệu chúng tôi thu thập',
    items: [
      'Thông tin tài khoản: tên đăng nhập, họ tên, email và mật khẩu (được mã hóa, chúng tôi không đọc được mật khẩu của bạn).',
      'Hồ sơ sức khỏe do bạn nhập: tuổi, giới tính, chiều cao, cân nặng, mức vận động, mục tiêu, chế độ ăn và dị ứng.',
      'Nội dung và hoạt động: công thức, thực đơn đã lưu, kho nguyên liệu, danh sách đi chợ, bình luận, đánh giá và lịch sử trò chuyện với AI Bếp trưởng.',
      'Vị trí: chỉ khi bạn cho phép, để tìm cửa hàng và quán chay gần bạn.',
      'Dữ liệu thiết bị đeo (Google Fit): chỉ khi bạn chủ động kết nối, bạn có thể ngắt kết nối bất kỳ lúc nào.',
    ],
  },
  {
    title: '2. Mục đích sử dụng dữ liệu',
    items: [
      'Tính mục tiêu dinh dưỡng, lập thực đơn và gợi ý món phù hợp với chế độ ăn, dị ứng của bạn.',
      'Vận hành các tính năng cộng đồng, thông báo và hỗ trợ tài khoản (xác minh email, đặt lại mật khẩu).',
      'Bảo vệ hệ thống, phát hiện gian lận và hành vi vi phạm.',
    ],
  },
  {
    title: '3. Xử lý bằng AI',
    items: [
      'Để tạo thực đơn và câu trả lời, một phần dữ liệu cần thiết (như mục tiêu dinh dưỡng, chế độ ăn, dị ứng và nội dung câu hỏi) được gửi tới nhà cung cấp AI bên thứ ba (Google Gemini) để xử lý.',
      'Không nhập thông tin nhạy cảm không cần thiết (số giấy tờ, thông tin tài chính, mật khẩu) vào khung trò chuyện với AI.',
    ],
  },
  {
    title: '4. Chia sẻ dữ liệu',
    items: [
      'VEGEAI không bán dữ liệu cá nhân của bạn.',
      'Dữ liệu chỉ được chia sẻ với các nhà cung cấp dịch vụ cần thiết để vận hành (lưu trữ, gửi email, AI, bản đồ), hoặc khi pháp luật yêu cầu.',
      'Nội dung bạn đăng công khai trong cộng đồng (công thức, bình luận, tên hiển thị, ảnh đại diện) sẽ được người dùng khác nhìn thấy.',
    ],
  },
  {
    title: '5. Lưu trữ và bảo mật',
    items: [
      'Dữ liệu được lưu trữ có kiểm soát truy cập. Chúng tôi áp dụng các biện pháp kỹ thuật hợp lý để bảo vệ dữ liệu, tuy nhiên không hệ thống nào an toàn tuyệt đối.',
      'Dữ liệu được giữ trong thời gian tài khoản còn hoạt động, hoặc lâu hơn khi pháp luật yêu cầu.',
    ],
  },
  {
    title: '6. Quyền của bạn',
    items: [
      'Xem và chỉnh sửa thông tin cá nhân, hồ sơ sức khỏe trong trang Hồ sơ & Thể trạng và Cài đặt tài khoản.',
      'Thu hồi quyền truy cập vị trí, ngắt kết nối Google Fit, xóa nội dung đã đăng.',
      'Liên hệ đội ngũ VEGEAI để yêu cầu xóa tài khoản và dữ liệu liên quan.',
    ],
  },
];

interface TermsPolicyDialogProps {
  open: boolean;
  /** Section to scroll to when the dialog opens. */
  section: PolicySection;
  /** Whether the user already read to the end in this session. */
  alreadyRead: boolean;
  onClose: () => void;
  onAccept: () => void;
}

/**
 * Terms of use + privacy policy shown at registration.
 * The accept button stays disabled until the user has scrolled to the end of the document.
 */
export const TermsPolicyDialog: React.FC<TermsPolicyDialogProps> = ({ open, section, alreadyRead, onClose, onAccept }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const termsRef = useRef<HTMLElement>(null);
  const privacyRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const [progress, setProgress] = useState(0);
  const [reachedEnd, setReachedEnd] = useState(alreadyRead);

  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const ratio = max <= 0 ? 1 : el.scrollTop / max;
    setProgress(Math.min(1, ratio));
    if (max <= 0 || el.scrollTop >= max - 8) setReachedEnd(true);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      setReachedEnd(alreadyRead);
      requestAnimationFrame(() => {
        const target = section === 'privacy' ? privacyRef.current : termsRef.current;
        const container = scrollRef.current;
        if (container) container.scrollTop = target && section === 'privacy' ? target.offsetTop - container.offsetTop : 0;
        measure();
      });
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, section, alreadyRead, measure]);

  const jumpTo = (target: PolicySection) => {
    const container = scrollRef.current;
    const el = target === 'privacy' ? privacyRef.current : termsRef.current;
    if (container && el) container.scrollTo({ top: el.offsetTop - container.offsetTop, behavior: 'smooth' });
  };

  const renderClauses = (clauses: Clause[]) => clauses.map(clause => (
    <div key={clause.title} className="space-y-1.5">
      <h4 className="text-[13px] font-extrabold text-slate-900 dark:text-white">{clause.title}</h4>
      <ul className="list-disc pl-5 space-y-1 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
        {clause.items.map(item => <li key={item}>{item}</li>)}
      </ul>
    </div>
  ));

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); onClose(); }}
      className="m-auto w-[min(640px,calc(100vw-32px))] max-h-[min(720px,calc(100vh-32px))] p-0 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-sm open:flex flex-col overflow-hidden"
    >
      <header className="px-5 sm:px-6 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-lg font-extrabold flex items-center gap-2">
              <ScrollText className="w-5 h-5 text-emerald-600" />
              Điều khoản & Chính sách
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Phiên bản {TERMS_VERSION}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" title="Đóng" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex gap-2 text-xs font-bold">
          <button type="button" onClick={() => jumpTo('terms')} className="px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition cursor-pointer">
            Điều khoản sử dụng
          </button>
          <button type="button" onClick={() => jumpTo('privacy')} className="px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition cursor-pointer">
            Chính sách bảo mật
          </button>
        </nav>
        <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden" aria-hidden="true">
          <div className="h-full bg-emerald-500 transition-[width] duration-150" style={{ width: `${Math.round((reachedEnd ? 1 : progress) * 100)}%` }} />
        </div>
      </header>

      <div ref={scrollRef} onScroll={measure} tabIndex={0} className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-5 space-y-8 focus:outline-none">
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[12px] leading-relaxed text-amber-900 dark:text-amber-200">
          Vui lòng đọc kỹ toàn bộ nội dung dưới đây. Bạn cần cuộn đến cuối văn bản trước khi có thể bấm <strong>"Tôi đã đọc và đồng ý"</strong>.
        </div>

        <section ref={termsRef} className="space-y-4">
          <h3 className="text-base font-extrabold flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
            <ScrollText className="w-4 h-4" /> Điều khoản sử dụng
          </h3>
          {renderClauses(TERMS)}
        </section>

        <section ref={privacyRef} className="space-y-4">
          <h3 className="text-base font-extrabold flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4" /> Chính sách bảo mật
          </h3>
          {renderClauses(PRIVACY)}
        </section>

        <p className="text-[12px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4">
          Mọi thắc mắc về điều khoản hoặc dữ liệu cá nhân, vui lòng liên hệ đội ngũ VEGEAI qua kênh hỗ trợ trong ứng dụng.
        </p>
      </div>

      <footer className="px-5 sm:px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          {reachedEnd
            ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Bạn đã đọc hết nội dung.</>
            : <>Đã đọc {Math.round(progress * 100)}% · cuộn xuống cuối để tiếp tục</>}
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            disabled={!reachedEnd}
            onClick={onAccept}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" /> Tôi đã đọc và đồng ý
          </button>
        </div>
      </footer>
    </dialog>
  );
};

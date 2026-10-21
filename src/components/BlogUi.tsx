import { useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Archive, BadgeCheck, Clock, FileText, XCircle, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import type { BlogPost, BlogStatus } from '../types/blog';
import { blogStatuses } from '../types/blog';
import type { PageResponse } from '../types/api';

export function BlogAccess({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { isLoading, isAuthenticated, user, sessionError, retrySession } = useAuth();
  const location = useLocation();
  if (isLoading) return <p className="blog-empty" role="status">Đang tải phiên đăng nhập...</p>;
  if (sessionError && !isAuthenticated) return <BlogError message={sessionError} retry={retrySession} />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (admin && user?.role !== 'admin') return <p role="alert" className="blog-empty">Bạn cần quyền admin để duyệt bài viết.</p>;
  return children;
}
export function BlogBadge({ status }: { status: BlogStatus }) {
  const Icon = { DRAFT: FileText, PENDING_REVIEW: Clock, PUBLISHED: BadgeCheck, REJECTED: XCircle, ARCHIVED: Archive }[status];
  return <span className={'blog-badge ' + status.toLowerCase()}><Icon size={14} />{blogStatuses[status]}</span>;
}
// Pin a distinct, topic-matched image to each published post so reused or stale API covers cannot create duplicate cards.
const editorialCovers: Record<string, string> = {
  '10cda16b-d4f8-4414-8bfb-5ba348357594': 'https://www.lesfruitsetlegumesfrais.com/app/uploads/cache/2013/03/r70-1-salade-chou-rouge-orange-graines/328725460.jpg',
  'e82ee8f3-8148-457c-9de1-4006fd5cc016': 'https://img-global.cpcdn.com/recipes/db902f1fae1ebd99/680x781cq80/canh-chua-chay-recipe-main-photo.jpg',
  'd0c09778-0c72-4e84-b4b9-515f6d906174': 'https://snapcalorie-webflow-website.s3.us-east-2.amazonaws.com/media/recipe_pics_v2/medium/garlic_rosemary_roast_vegetables.jpg',
  '1cf979b5-d060-464b-92dd-13f0c3c3a327': 'https://aboutfuel.de/wp-content/uploads/2019/02/Rezept-Champigon-Brokkoli-Pfanne-auf-Reisnudeln-Sta%CC%88bchen-Teller.jpg',
  '44e946af-4ed2-4afc-8b59-dd10431279f5': 'https://img-global.cpcdn.com/recipes/f339c554a41b3010/400x400cq80/photo.jpg',
  '846f11d4-7468-4179-a037-e6e43b9a6773': 'https://norwoodcolorado.com/wp-content/uploads/2024/06/market-2-1.jpg',
  '6294c9b0-6495-4c59-9a91-2277cce0cfc5': 'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2b/96/b3/a1/caption.jpg?h=-1&s=1&w=600',
  '4d106e01-5e17-44d3-b227-ef71d6367df1': 'https://www.tops.org/hs-fs/hubfs/recipes/rotm-mushroom-poached-tofu-rice.jpg?height=600&name=rotm-mushroom-poached-tofu-rice.jpg',
  'ede9e454-790b-46c9-905d-3ae01eb67b24': 'https://www.greenpeace.org/static/planet4-hungary-stateless/2020/08/e5644127-gp0strmeu.jpg',
  '7a46019d-240b-4e44-9239-ee4d7463b34e': 'https://www.veggiecastle.vn/_next/image?q=75&url=%2Ffood_rice.png&w=1200',
  'd18481b7-f009-4a42-94da-1638aa35876a': 'https://images.happycow.net/venues/1024/36/58/hcmp365866_2291107.jpeg',
  'a8655caa-7bc0-4055-a0e4-e8901dde5ae3': 'https://cdn.shopify.com/s/files/1/2997/5388/files/tofu-bocconcini-salad.jpg',
  '75e3320b-8fcd-4a8a-90f2-912b1956f8e9': 'https://osu-wams-blogs-uploads.s3.amazonaws.com/blogs.dir/3959/files/2021/03/DSCF1051-1024x712.jpg',
  '7b0c8d6e-736d-480d-b0e6-32664a9a6e77': 'https://pekis.net/sites/default/files/styles/social_share_1200x628/public/2025-05/umami_ingredients.webp?itok=ar8nfFMQ',
  '8cfb46bd-76c8-4b08-b0ba-90994707aacb': 'https://images.happycow.net/venues/1024/21/84/hcmp218476_3837667.jpeg',
  'b96617bf-0c99-4a38-a601-e961e7db21db': 'https://img.chefkoch-cdn.de/rezepte/1417861246630035/bilder/1519684/crop-640x427/gemuesebruehe.jpg',
  '2f3aff14-ed81-4354-a50d-290f046e415d': 'https://hips.hearstapps.com/hmg-prod/images/vegan-pumpkin-overnight-oats-with-cinnamon-cashew-cream-1-700x963-1546552834.jpg?crop=1xw%3A1xh%3Bcenter%2Ctop&resize=640%3A*',
  '99952429-4b2f-403d-b102-836f154c9ce6': 'https://cdn2.fptshop.com.vn/unsafe/Uploads/images/tin-tuc/168546/Originals/review-tu-lanh-panasonic-nr-bv280qsvn-7.jpg',
  '0fc4c746-09c6-4840-9bcc-b439a1384a2b': 'https://cdn.shopify.com/s/files/1/0757/7914/6017/files/woman2.png?v=1773659438',
  'a89f19fe-3ad6-4937-bdd3-8f802c13ccdc': 'https://cdn2.tuoitre.vn/thumb_w/480/471584752817336320/2023/5/30/mon-chay-bong-mai1-2-16854085581801516334013.jpg',
};

export function BlogCover({ post, useSubmittedImage = false }: {
  post: Pick<BlogPost, 'coverImage' | 'title'> & { postId?: string };
  useSubmittedImage?: boolean;
}) {
  const [submittedImageFailed, setSubmittedImageFailed] = useState(false);
  // Reviewers must see the author's submitted image, not editorial overrides used by public cards.
  const imageUrl = (useSubmittedImage ? post.coverImage : post.postId && editorialCovers[post.postId])
    || post.coverImage || '/images/vietnamese-vegan-table.png';
  const submittedImageUnavailable = useSubmittedImage && (!post.coverImage || submittedImageFailed);
  return <div className="blog-cover">{submittedImageUnavailable
    ? <div className="blog-cover-unavailable" role="img" aria-label={post.coverImage ? 'Ảnh bìa đã gửi không tải được' : 'Tác giả chưa gửi ảnh bìa'}>
      <strong>{post.coverImage ? 'Không tải được ảnh bìa đã gửi.' : 'Tác giả chưa gửi ảnh bìa.'}</strong>
      <span>{post.coverImage ? 'Kiểm tra đường dẫn ảnh trước khi duyệt.' : 'Chỉ ảnh bìa bài gửi mới được hiển thị tại đây.'}</span>
    </div>
    : <img src={imageUrl} alt={post.title} loading="lazy" onError={event => {
      if (useSubmittedImage && post.coverImage) { setSubmittedImageFailed(true); return; }
      if (!event.currentTarget.src.endsWith('/images/vietnamese-vegan-table.png')) event.currentTarget.src = '/images/vietnamese-vegan-table.png';
    }} />}</div>;
}
export function BlogBody({ content }: { content: string }) {
  if (!/<\/?[a-z][\s\S]*>/i.test(content) || typeof DOMParser === 'undefined') {
    return <div className="blog-body">{content.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>;
  }

  // Legacy blog bodies may contain HTML, so render only a small safe formatting allowlist.
  const document = new DOMParser().parseFromString(content, 'text/html');
  const blockedTags = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'SVG', 'MATH']);
  const allowedTags = new Set([
    'P', 'H1', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'STRONG', 'B', 'EM', 'I', 'BLOCKQUOTE',
    'BR', 'A', 'HR', 'IMG', 'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TH', 'TD',
    'DIV', 'SPAN', 'PRE', 'CODE', 'S', 'DEL', 'INS', 'SUB', 'SUP', 'FIGURE', 'FIGCAPTION',
  ]);
  const renderNode = (node: Node, key: string): ReactNode => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (!(node instanceof Element) || blockedTags.has(node.tagName)) return null;

    const children = Array.from(node.childNodes).map((child, index) => renderNode(child, `${key}-${index}`));
    if (!allowedTags.has(node.tagName)) return <>{children}</>;
    switch (node.tagName) {
      case 'P': return <p key={key}>{children}</p>;
      case 'H1': return <h2 key={key}>{children}</h2>;
      case 'H2': return <h2 key={key}>{children}</h2>;
      case 'H3': return <h3 key={key}>{children}</h3>;
      case 'H4': return <h4 key={key}>{children}</h4>;
      case 'UL': return <ul key={key}>{children}</ul>;
      case 'OL': return <ol key={key}>{children}</ol>;
      case 'LI': return <li key={key}>{children}</li>;
      case 'STRONG': case 'B': return <strong key={key}>{children}</strong>;
      case 'EM': case 'I': return <em key={key}>{children}</em>;
      case 'BLOCKQUOTE': return <blockquote key={key}>{children}</blockquote>;
      case 'BR': return <br key={key} />;
      case 'HR': return <hr key={key} />;
      case 'IMG': {
        const src = node.getAttribute('src') || '';
        let safeSrc = '';
        if (/^\/images\/[A-Za-z0-9._/-]+(?:[?#].*)?$/.test(src)) safeSrc = src;
        else {
          try {
            const url = new URL(src);
            if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) safeSrc = url.href;
          } catch { /* Invalid image URLs are omitted from the rendered post. */ }
        }
        return safeSrc ? <BlogBodyImage key={key} src={safeSrc} alt={node.getAttribute('alt') || ''} /> : null;
      }
      case 'TABLE': return <div key={key} className="blog-table-scroll"><table>{children}</table></div>;
      case 'THEAD': return <thead key={key}>{children}</thead>;
      case 'TBODY': return <tbody key={key}>{children}</tbody>;
      case 'TFOOT': return <tfoot key={key}>{children}</tfoot>;
      case 'TR': return <tr key={key}>{children}</tr>;
      case 'TH': return <th key={key}>{children}</th>;
      case 'TD': return <td key={key}>{children}</td>;
      case 'DIV': return <div key={key}>{children}</div>;
      case 'SPAN': return <span key={key}>{children}</span>;
      case 'PRE': return <pre key={key}>{children}</pre>;
      case 'CODE': return <code key={key}>{children}</code>;
      case 'S': case 'DEL': return <del key={key}>{children}</del>;
      case 'INS': return <ins key={key}>{children}</ins>;
      case 'SUB': return <sub key={key}>{children}</sub>;
      case 'SUP': return <sup key={key}>{children}</sup>;
      case 'FIGURE': return <figure key={key}>{children}</figure>;
      case 'FIGCAPTION': return <figcaption key={key}>{children}</figcaption>;
      case 'A': {
        const href = node.getAttribute('href') || '';
        const safeHref = /^(https?:|\/|#)/i.test(href) ? href : undefined;
        return safeHref ? <a key={key} href={safeHref} rel="noopener noreferrer">{children}</a> : <>{children}</>;
      }
      default: return <>{children}</>;
    }
  };

  return <div className="blog-body">{Array.from(document.body.childNodes).map((node, index) => renderNode(node, `blog-${index}`))}</div>;
}
function BlogBodyImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return failed
    ? <span className="blog-body-image-error" role="img" aria-label={alt || 'Ảnh bài viết không tải được'}>{alt || 'Ảnh bài viết không tải được'}</span>
    : <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}
export function BlogError({ message, retry }: { message: string; retry?: () => void }) {
  return <div role="alert" className="blog-error"><p>{message}</p>{retry && <button onClick={retry}><RefreshCw size={15} /> Tải lại</button>}</div>;
}
export function BlogPagination({ data, busy, change }: { data: PageResponse<BlogPost> | null; busy: boolean; change: (page: number) => void }) {
  if (!data || data.totalPages <= 1) return null;
  return <nav className="blog-pagination" aria-label="Phân trang bài viết"><button title="Trang trước" aria-label="Trang trước" disabled={busy || data.first} onClick={() => change(data.page - 1)}><ChevronLeft size={18} /></button><span>{data.page + 1} / {data.totalPages}</span><button title="Trang sau" aria-label="Trang sau" disabled={busy || data.last} onClick={() => change(data.page + 1)}><ChevronRight size={18} /></button></nav>;
}
export function blogDate(value?: string) {
  return value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }) : '';
}

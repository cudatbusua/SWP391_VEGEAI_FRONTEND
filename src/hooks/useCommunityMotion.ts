import { useEffect } from 'react';

/** Reveal newly loaded cards only when they enter the viewport. */
export function useCommunityMotion(selector: string, itemKeys: string) {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const cards = document.querySelectorAll<HTMLElement>(`${selector}:not([data-community-motion-seen])`);
    if (!cards.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const card = entry.target as HTMLElement;
        card.classList.remove('community-motion-pending');
        card.dataset.communityMotionSeen = 'true';
        observer.unobserve(card);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px 45px 0px' });

    cards.forEach(card => {
      card.classList.add('community-motion-pending');
      observer.observe(card);
    });

    return () => {
      observer.disconnect();
      cards.forEach(card => card.classList.remove('community-motion-pending'));
    };
  }, [selector, itemKeys]);
}

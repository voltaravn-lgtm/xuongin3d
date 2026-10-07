import { useEffect, useRef, type ReactNode } from "react";

/** Follow page scrolling without trapping the tall sidebar in a scroll panel. */
export default function ProductCatalogueSidebar({ children }: { children: ReactNode }) {
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const desktop = window.matchMedia("(min-width: 1024px)");
    const topGap = 112;
    const bottomGap = 24;
    let offset = topGap;
    let previousScroll = window.scrollY;
    let frame = 0;

    const update = () => {
      frame = 0;
      const scroll = Math.max(0, window.scrollY);
      const minimum = Math.min(topGap, window.innerHeight - sidebar.offsetHeight - bottomGap);
      offset = desktop.matches
        ? Math.max(minimum, Math.min(topGap, offset - (scroll - previousScroll)))
        : topGap;
      previousScroll = scroll;
      sidebar.style.setProperty("--catalogue-sidebar-top", `${offset}px`);
    };
    const scheduleUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(sidebar);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    desktop.addEventListener("change", scheduleUpdate);
    update();

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      desktop.removeEventListener("change", scheduleUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={sidebarRef}
      id="products-sidebar"
      aria-label="Tìm kiếm và danh mục sản phẩm"
      className="hidden space-y-6 lg:sticky lg:top-[var(--catalogue-sidebar-top,112px)] lg:col-span-3 lg:block lg:self-start"
    >
      {children}
    </div>
  );
}

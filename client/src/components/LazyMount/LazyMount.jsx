import { useEffect, useRef, useState } from 'react';

/**
 * Defers rendering its children until the wrapper scrolls near the viewport.
 * Used for below-the-fold Recharts panels: charts are expensive to mount, so
 * skipping the off-screen ones makes the dashboard's first paint noticeably
 * faster. `minHeight` reserves space so the page doesn't jump when a chart
 * pops in, and the 200px rootMargin mounts it just before it becomes visible.
 */
function LazyMount({ children, minHeight = 280 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // No IntersectionObserver (old browser / jsdom) → render immediately.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return visible ? children : <div ref={ref} style={{ minHeight }} aria-hidden="true" />;
}

export default LazyMount;

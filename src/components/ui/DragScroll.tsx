import { useRef, useEffect, type HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

/** Horizontal-scroll container with mouse drag support for desktop + touch for mobile */
const DragScroll = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, style, ...props }, _ref) => {
    const innerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const el = innerRef.current;
      if (!el) return;

      let isDown = false;
      let startX = 0;
      let scrollLeft = 0;
      let moved = false;

      const onDown = (e: MouseEvent) => {
        isDown = true;
        moved = false;
        el.style.cursor = 'grabbing';
        el.style.userSelect = 'none';
        startX = e.pageX - el.offsetLeft;
        scrollLeft = el.scrollLeft;
      };
      const onUp = () => {
        isDown = false;
        el.style.cursor = 'grab';
        el.style.userSelect = '';
      };
      const onLeave = () => {
        if (isDown) {
          isDown = false;
          el.style.cursor = 'grab';
          el.style.userSelect = '';
        }
      };
      const onMove = (e: MouseEvent) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - el.offsetLeft;
        const walk = x - startX;
        if (Math.abs(walk) > 3) moved = true;
        el.scrollLeft = scrollLeft - walk;
      };
      // Prevent click on children after drag
      const onClick = (e: MouseEvent) => {
        if (moved) {
          e.stopPropagation();
          e.preventDefault();
          moved = false;
        }
      };

      el.style.cursor = 'grab';
      el.addEventListener('mousedown', onDown);
      el.addEventListener('mouseleave', onLeave);
      el.addEventListener('mouseup', onUp);
      el.addEventListener('mousemove', onMove);
      el.addEventListener('click', onClick, true);

      return () => {
        el.removeEventListener('mousedown', onDown);
        el.removeEventListener('mouseleave', onLeave);
        el.removeEventListener('mouseup', onUp);
        el.removeEventListener('mousemove', onMove);
        el.removeEventListener('click', onClick, true);
      };
    }, []);

    return (
      <div
        ref={innerRef}
        className={cn('overflow-x-auto scrollbar-none', className)}
        style={{ WebkitOverflowScrolling: 'touch', ...style }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

DragScroll.displayName = 'DragScroll';
export default DragScroll;

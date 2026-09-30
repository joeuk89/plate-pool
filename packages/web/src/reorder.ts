import { useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";

export interface Span {
  top: number;
  bottom: number;
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item === undefined) return items;
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
  return next;
}

const centre = (span: Span) => (span.top + span.bottom) / 2;

export function dropIndex(spans: Span[], from: number, offset: number): number {
  const dragged = spans[from];
  if (!dragged) return from;
  const draggedCentre = centre(dragged) + offset;
  return spans.filter((span, index) => index !== from && centre(span) < draggedCentre).length;
}

export function shiftOf(spans: Span[], from: number, to: number, index: number): number {
  const dragged = spans[from];
  if (!dragged || index === from) return 0;
  const [first, second] = spans;
  const gap = first && second ? second.top - first.bottom : 0;
  const slot = dragged.bottom - dragged.top + gap;
  if (from < to && index > from && index <= to) return -slot;
  if (to < from && index >= to && index < from) return slot;
  return 0;
}

interface Drag {
  id: number;
  from: number;
  to: number;
  startY: number;
  lastY: number;
  topBefore: number;
  listHeight: number;
  lift: number;
  measured: boolean;
}

function scrollBy(distance: number) {
  if (Math.abs(distance) >= 1) window.scrollBy(0, distance);
}

export function useReorder<T extends { id: number }>(items: T[], onChange: (items: T[]) => void) {
  const [drag, setDrag] = useState<Drag>();
  const list = useRef<HTMLOListElement>(null);
  const nodes = useRef(new Map<number, HTMLElement>());
  const spans = useRef<Span[]>([]);
  const settle = useRef<{ id: number; top: number }>(undefined);
  const refocus = useRef<number>(undefined);

  const top = (id: number) => nodes.current.get(id)?.getBoundingClientRect().top ?? 0;

  useLayoutEffect(() => {
    if (drag && !drag.measured) {
      scrollBy(top(drag.id) - drag.topBefore);
      spans.current = items.map((item) => {
        const rect = nodes.current.get(item.id)?.getBoundingClientRect();
        return { top: rect?.top ?? 0, bottom: rect?.bottom ?? 0 };
      });
      setDrag({ ...drag, lift: drag.topBefore - top(drag.id), measured: true });
    }
    if (!drag && settle.current) {
      scrollBy(top(settle.current.id) - settle.current.top);
      settle.current = undefined;
    }
    if (refocus.current !== undefined) {
      nodes.current.get(refocus.current)?.querySelector<HTMLElement>(".grip")?.focus();
      refocus.current = undefined;
    }
  });

  const offsetOf = (current: Drag) => current.lastY - current.startY;

  const itemProps = (id: number, index: number) => {
    const ref = (node: HTMLElement | null) => {
      if (node) nodes.current.set(id, node);
      else nodes.current.delete(id);
    };
    let style: CSSProperties | undefined;
    if (drag?.measured) {
      const offset = drag.id === id ? offsetOf(drag) : shiftOf(spans.current, drag.from, drag.to, index);
      style = { transform: `translateY(${offset}px)` };
    }
    return { ref, style, "data-dragging": drag?.id === id ? true : undefined };
  };

  const gripProps = (id: number, index: number) => ({
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0 || items.length < 2) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setDrag({
        id,
        from: index,
        to: index,
        startY: event.clientY,
        lastY: event.clientY,
        topBefore: top(id),
        listHeight: list.current?.getBoundingClientRect().height ?? 0,
        lift: 0,
        measured: false,
      });
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      if (!drag?.measured || drag.id !== id) return;
      const next = { ...drag, lastY: event.clientY };
      setDrag({ ...next, to: dropIndex(spans.current, drag.from, offsetOf(next)) });
    },
    onPointerUp: () => {
      if (!drag || drag.id !== id) return;
      const from = spans.current[drag.from];
      if (drag.measured && from) settle.current = { id, top: from.top + drag.lift + offsetOf(drag) };
      if (drag.to !== drag.from) onChange(moveItem(items, drag.from, drag.to));
      setDrag(undefined);
    },
    onPointerCancel: () => setDrag(undefined),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      const step = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
      const to = index + step;
      if (step === 0 || to < 0 || to >= items.length) return;
      event.preventDefault();
      refocus.current = id;
      onChange(moveItem(items, index, to));
    },
  });

  const listProps = { ref: list, style: drag ? { minHeight: `${drag.listHeight}px`, paddingTop: `${drag.lift}px` } : undefined };

  return { reordering: drag !== undefined, listProps, itemProps, gripProps };
}

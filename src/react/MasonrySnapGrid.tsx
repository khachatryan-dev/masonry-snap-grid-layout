import React, { useEffect, useRef } from 'react';
import MasonrySnapGridLayout from '../core/MasonrySnapGridLayout';
import { MasonryOptions } from '../core/types';

type Props<T> = MasonryOptions<T>;

function MasonrySnapGrid<T>(props: Props<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<MasonrySnapGridLayout<T> | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    instanceRef.current = new MasonrySnapGridLayout(ref.current, props);
    return () => instanceRef.current?.destroy();
  }, []);

  useEffect(() => {
    instanceRef.current?.updateItems(props.items);
  }, [props.items]);

  return <div ref={ref} className="masonry-snap-grid" />;
}

export default MasonrySnapGrid;
import MasonrySnapGridLayout from "./MasonrySnapGridLayout";

export interface MasonrySnapGridLayoutClassNames {
    container?: string;
    item?: string;
}

export interface MasonrySnapGridLayoutOptions<T = unknown> {
    gutter?: number;
    minColWidth?: number;
    animate?: boolean;
    transitionDuration?: number;
    items: T[];
    renderItem: (item: T) => HTMLElement;
    classNames?: MasonrySnapGridLayoutClassNames;
}

export interface MasonrySnapGridRef {
    layout: MasonrySnapGridLayout | null;
}
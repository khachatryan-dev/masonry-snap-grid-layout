export interface MasonrySnapGridLayoutClassNames {
    container?: string;
    item?: string;
}

export interface MasonrySnapGridLayoutOptions {
    gutter?: number;
    minColWidth?: number;
    animate?: boolean;
    transitionDuration?: number;
    classNames?: MasonrySnapGridLayoutClassNames;
}
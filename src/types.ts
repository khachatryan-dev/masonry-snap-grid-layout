import MasonrySnapGridLayout from "./MasonrySnapGridLayout";

/**
 * CSS class names used by MasonrySnapGridLayout for styling.
 */
export interface MasonrySnapGridLayoutClassNames {
    /** CSS class applied to the container element. */
    container?: string;

    /** CSS class applied to each item element. */
    item?: string;
}

/**
 * Options for configuring a MasonrySnapGridLayout instance.
 *
 * @template T - The type of items being rendered in the masonry grid.
 */
export interface MasonrySnapGridLayoutOptions<T = unknown> {
    /**
     * Space between grid items in pixels.
     * @default 16
     */
    gutter?: number;

    /**
     * Minimum width (in pixels) of each column before layout will add another column.
     * @default 250
     */
    minColWidth?: number;

    /**
     * Whether to animate item movement when the layout changes.
     * @default true
     */
    animate?: boolean;

    /**
     * Duration of the item movement animation (in milliseconds).
     * Only applies if `animate` is true.
     * @default 400
     */
    transitionDuration?: number;

    /**
     * Data items to be rendered in the grid.
     */
    items: T[];

    /**
     * Function that renders a single item into a DOM element.
     *
     * @param item - The data item to render.
     * @returns A DOM element representing the rendered item.
     */
    renderItem: (item: T) => HTMLElement;

    /**
     * Optional custom class names for the container and items.
     */
    classNames?: MasonrySnapGridLayoutClassNames;
}

/**
 * Ref object shape for accessing a MasonrySnapGridLayout instance
 * when used inside a React component.
 */
export interface MasonrySnapGridRef {
    /** Reference to the underlying MasonrySnapGridLayout instance. */
    layout: MasonrySnapGridLayout | null;
}

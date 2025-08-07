/**
 * MasonrySnapGridLayoutClassNames
 * Optional CSS class names to override default styling selectors.
 * Enables user to customize CSS classes easily.
 */
export interface MasonrySnapGridLayoutClassNames {
    container?: string;    // Class for masonry container wrapper
    item?: string;         // Class for each masonry item
    itemContent?: string;  // Wrapper for content inside each item
    itemHeader?: string;   // Header section inside an item
    itemTitle?: string;    // Title text inside header
    itemId?: string;       // ID label inside header
    itemBody?: string;     // Main content/body of item
    progressBar?: string;  // Progress bar container
    progress?: string;     // Actual progress bar fill
    itemFooter?: string;   // Footer section inside item
}

/**
 * MasonrySnapGridLayoutOptions
 * Configuration options accepted by MasonrySnapGridLayout.
 */
export interface MasonrySnapGridLayoutOptions {
    /** Spacing between items in pixels (default: 16) */
    gutter?: number;

    /** Minimum width for each column in pixels (default: 250) */
    minColWidth?: number;

    /** Enable or disable animations (default: true) */
    animate?: boolean;

    /** Duration of animation transitions in milliseconds (default: 400) */
    transitionDuration?: number;

    /** Initial number of items to generate on init (default: 30) */
    initialItems?: number;

    /**
     * Optional class names object to override default CSS class names
     */
    classNames?: MasonrySnapGridLayoutClassNames;

    /**
     * Item content can be:
     * - a callback function that receives the item index and returns an HTMLElement or string (HTML markup),
     * - a static HTMLElement or string (HTML markup) for all items,
     * - or null to use the default template.
     */
    itemContent?: ((index: number) => HTMLElement | string) | HTMLElement | string | null;
}

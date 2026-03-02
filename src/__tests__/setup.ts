export {};

class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
}

declare global {
    interface Window {
        ResizeObserver: typeof ResizeObserver;
    }
}

window.ResizeObserver = ResizeObserverMock as any;
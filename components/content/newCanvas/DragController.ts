export class DragController {
    isDragging: boolean = false;
    activeOffset: { x: number, y: number } | null = null; // Optional: if we need to track offset
    private _activeId: string | null = null;
    private listeners: ((isDragging: boolean, id: string | null) => void)[] = [];

    get activeId() {
        return this._activeId;
    }

    startDrag(id: string) {
        this.isDragging = true;
        this._activeId = id;
        this.notify();
    }

    stopDrag() {
        this.isDragging = false;
        this._activeId = null;
        this.notify();
    }

    update(id: string, x: number, y: number) {
        if (this._activeId !== id) return;
        // Optimization: Notify specifically for update to avoid full state toggle logic?
        // Actually, existing notify() simply calls listeners with (isDragging, id).
        // Listeners (NativeConnectionLayer) then poll the DOM or use provided coords.
        // But NativeConnectionLayer currently polls DOM. 
        // If we want it to use specific coords, we should pass them or store them.
        this.activeOffset = { x, y }; // Store current position
        // We don't strictly need to notify if NativeConnectionLayer uses RAF loop.
        // It reads from DOM. Rnd updates DOM on drag.
        // Wait, if Rnd updates DOM, NativeConnectionLayer should see it.
        // Why didn't it work?
    }

    subscribe(callback: (isDragging: boolean, id: string | null) => void) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    private notify() {
        this.listeners.forEach(cb => cb(this.isDragging, this._activeId));
    }
}

// Singleton instance could be used, or created per Canvas via useRef
export const createDragController = () => new DragController();

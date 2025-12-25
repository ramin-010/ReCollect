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

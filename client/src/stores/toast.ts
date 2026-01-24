import { writable } from 'svelte/store';

export type ToastType = 'success' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  timeout?: number;
}

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);

  return {
    subscribe,

    addToast(message: string, type: ToastType = 'info', timeout: number = 3000) {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const toast: Toast = { id, message, type, timeout };

      update(toasts => [...toasts, toast]);

      if (timeout > 0) {
        setTimeout(() => {
          this.dismissToast(id);
        }, timeout);
      }

      return id;
    },

    dismissToast(id: string) {
      update(toasts => toasts.filter(t => t.id !== id));
    },

    clear() {
      update(() => []);
    }
  };
}

export const toasts = createToastStore();

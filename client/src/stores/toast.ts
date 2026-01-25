import { writable } from 'svelte/store';

export type ToastType = 'success' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  timeout?: number;
  projectName?: string;
}

function createToastStore() {
  const { subscribe, update } = writable<Toast[]>([]);

  return {
    subscribe,

    addToast(message: string, type: ToastType = 'info', timeout: number = 3000, projectName?: string) {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const toast: Toast = { id, message, type, timeout, projectName };

      update(toasts => [...toasts, toast]);

      if (timeout > 0) {
        setTimeout(() => {
          this.dismissToast(id);
        }, timeout);
      }

      return id;
    },

    // Convenience method for completion notifications
    // More verbose since toasts are temporary (15s) - full task description
    // Note: projectName is shown separately in Toast header, no need to duplicate
    addCompletion(projectName: string, agentName: string, task: string) {
      const message = `${agentName} finished: ${task}`;
      this.addToast(message, 'success', 15000, projectName); // 15s for completions
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

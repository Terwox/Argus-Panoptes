/**
 * Bounce to VS Code
 *
 * Opens VS Code with the project folder and optionally copies the question to clipboard
 */

export async function bounce(
  projectPath: string,
  question?: string
): Promise<void> {
  // Copy question to clipboard if available
  if (question) {
    try {
      await navigator.clipboard.writeText(question);
      showToast('Question copied to clipboard');
    } catch (e) {
      console.error('Failed to copy to clipboard:', e);
    }
  }

  // Open VS Code via vscode:// protocol
  // This works on Windows when VS Code is installed
  // Convert backslashes to forward slashes and encode only special chars (not slashes)
  const normalizedPath = projectPath.replace(/\\/g, '/');
  const vscodeUrl = `vscode://file/${normalizedPath}`;

  // Try to open VS Code
  window.open(vscodeUrl, '_self');

  // Also try opening via a hidden iframe (fallback for some browsers)
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = `vscode://file/${normalizedPath}`;
  document.body.appendChild(iframe);

  // Clean up after a short delay
  setTimeout(() => {
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
  }, 1000);
}

// Simple toast notification
function showToast(message: string): void {
  const toast = document.createElement('div');
  toast.className =
    'fixed bottom-4 right-4 bg-white/10 backdrop-blur text-white px-4 py-2 rounded-lg text-sm animate-fade-in z-50';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 2000);
}

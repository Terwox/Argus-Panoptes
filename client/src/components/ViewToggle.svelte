<script lang="ts">
  import { viewMode } from '../stores/state';
</script>

<div class="flex items-center gap-1 bg-[var(--bg-muted)] rounded-lg p-1">
  <button
    class="px-3 py-1 text-sm rounded-md transition-colors {$viewMode ===
    'simple'
      ? 'bg-[var(--bg-muted-hover)] text-[var(--text-primary)]'
      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}"
    on:click={() => viewMode.set('simple')}
  >
    Simple
  </button>
  <button
    class="px-3 py-1 text-sm rounded-md transition-colors {$viewMode ===
    'detailed'
      ? 'bg-[var(--bg-muted-hover)] text-[var(--text-primary)]'
      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}"
    on:click={() => viewMode.set('detailed')}
  >
    Detailed
  </button>
</div>

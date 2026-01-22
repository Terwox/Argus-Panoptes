<script lang="ts">
  import { viewMode } from '../stores/state';
</script>

<div class="flex items-center gap-1 bg-white/5 rounded-lg p-1">
  <button
    class="px-3 py-1 text-sm rounded-md transition-colors {$viewMode ===
    'simple'
      ? 'bg-white/10 text-white'
      : 'text-gray-400 hover:text-white'}"
    on:click={() => viewMode.set('simple')}
  >
    Simple
  </button>
  <button
    class="px-3 py-1 text-sm rounded-md transition-colors {$viewMode ===
    'detailed'
      ? 'bg-white/10 text-white'
      : 'text-gray-400 hover:text-white'}"
    on:click={() => viewMode.set('detailed')}
  >
    Detailed
  </button>
</div>

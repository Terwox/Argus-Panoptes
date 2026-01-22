<script lang="ts">
  import type { Agent } from '../../../shared/types';

  export let agents: Agent[];

  $: blocked = agents.filter((a) => a.status === 'blocked').length;
  $: working = agents.filter((a) => a.status === 'working').length;
  $: complete = agents.filter((a) => a.status === 'complete').length;
  $: total = agents.length;
</script>

<div class="flex items-center gap-3 text-sm">
  {#if blocked > 0}
    <span class="flex items-center gap-1 text-blocked">
      <span>💬</span>
      {blocked} blocked
    </span>
  {/if}

  {#if working > 0}
    <span class="flex items-center gap-1 text-working">
      <span>⏳</span>
      {working} working
    </span>
  {/if}

  {#if complete > 0}
    <span class="flex items-center gap-1 text-green-500">
      <span>✅</span>
      {complete} done
    </span>
  {/if}

  {#if total === 0}
    <span class="text-gray-500">No agents</span>
  {/if}
</div>

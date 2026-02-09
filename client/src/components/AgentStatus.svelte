<script lang="ts">
  import type { Agent } from '../../../shared/types';
  import { cuteMode } from '../stores/state';
  import CuteBot from './CuteBot.svelte';

  export let agents: Agent[];

  $: blocked = agents.filter((a) => a.status === 'blocked').length;
  $: error = agents.filter((a) => a.status === 'error').length;
  $: working = agents.filter((a) => a.status === 'working').length;
  $: complete = agents.filter((a) => a.status === 'complete').length;
  $: total = agents.length;
</script>

<div class="flex items-center gap-3 text-sm">
  {#if blocked > 0}
    <span class="flex items-center gap-1 text-blocked">
      {#if $cuteMode}
        <CuteBot status="blocked" size="xs" />
      {:else}
        <span>💬</span>
      {/if}
      {blocked} blocked
    </span>
  {/if}

  {#if error > 0}
    <span class="flex items-center gap-1 text-purple-500">
      {#if $cuteMode}
        <CuteBot status="error" size="xs" />
      {:else}
        <span>⚠️</span>
      {/if}
      {error} error
    </span>
  {/if}

  {#if working > 0}
    <span class="flex items-center gap-1 text-working">
      {#if $cuteMode}
        <CuteBot status="working" size="xs" />
      {:else}
        <span>⏳</span>
      {/if}
      {working} working
    </span>
  {/if}

  {#if complete > 0}
    <span class="flex items-center gap-1 text-green-500">
      {#if $cuteMode}
        <CuteBot status="complete" size="xs" />
      {:else}
        <span>✅</span>
      {/if}
      {complete} done
    </span>
  {/if}

  {#if total === 0}
    <span class="text-gray-500">No agents</span>
  {/if}
</div>

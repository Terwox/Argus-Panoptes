<script lang="ts">
  /**
   * Scoreboard - Aggregate metrics display
   *
   * Shows total working time, completed agents, and other stats
   */
  import { metrics, stats } from '../stores/state';

  // Format milliseconds to human readable
  function formatDuration(ms: number): string {
    if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }
</script>

<div class="flex items-center gap-4 text-sm">
  <!-- Agent counts -->
  <div class="flex items-center gap-2">
    <span class="text-gray-500">Agents:</span>
    {#if $metrics.workingAgents > 0}
      <span class="text-working font-medium">{$metrics.workingAgents} working</span>
    {/if}
    {#if $metrics.blockedAgents > 0}
      <span class="text-blocked font-medium">{$metrics.blockedAgents} blocked</span>
    {/if}
    {#if $metrics.completedAgents > 0}
      <span class="text-green-500">{$metrics.completedAgents} done</span>
    {/if}
  </div>

  <!-- Divider -->
  {#if $metrics.totalWorkingTimeMs > 0}
    <span class="text-gray-700">|</span>

    <!-- Total work time -->
    <div class="flex items-center gap-1" title="Total time spent working across all agents">
      <span class="text-gray-500">Total:</span>
      <span class="text-gray-300 font-mono">{formatDuration($metrics.totalWorkingTimeMs)}</span>
    </div>
  {/if}

  <!-- Longest running -->
  {#if $metrics.longestWorkingTimeMs > 1800000}
    <span class="text-gray-700">|</span>
    <div
      class="flex items-center gap-1"
      title="Longest running agent: {$metrics.longestWorkingAgent}"
    >
      <span class="text-orange-400">🏃</span>
      <span class="text-orange-300 font-mono">{formatDuration($metrics.longestWorkingTimeMs)}</span>
      <span class="text-gray-500 text-xs">({$metrics.longestWorkingAgent})</span>
    </div>
  {/if}
</div>

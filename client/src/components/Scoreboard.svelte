<script lang="ts">
  /**
   * Scoreboard - Aggregate metrics display
   *
   * DESIGN: NO VISIBLE TIMERS - no anxiety
   * Shows agent counts only, no time durations
   */
  import { metrics, stats } from '../stores/state';
</script>

<div class="flex items-center gap-4 text-sm">
  <!-- Agent counts only - NO TIMERS -->
  <div class="flex items-center gap-2">
    <span class="text-[var(--text-muted)]">Agents:</span>
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
</div>

<script lang="ts">
  import { layoutMode, soundEnabled } from '../stores/state';
  import { preloadChime } from '../lib/sounds';

  export let open = false;

  function toggleLayoutMode() {
    layoutMode.update(mode => mode === 'grid' ? 'compact' : 'grid');
  }

  function toggleSound() {
    soundEnabled.update(enabled => {
      const newValue = !enabled;
      // Preload chime when enabling sound
      if (newValue) {
        preloadChime();
      }
      return newValue;
    });
  }
</script>

{#if open}
  <div class="settings-overlay" on:click={() => open = false}>
    <div class="settings-panel" on:click|stopPropagation>
      <h3>Settings</h3>

      <div class="setting-group">
        <label>
          <input
            type="checkbox"
            checked={$layoutMode === 'compact'}
            on:change={toggleLayoutMode}
          />
          <span class="label-text">Compact Mode</span>
        </label>
        <p class="setting-description">Stack projects vertically with smaller cards</p>
      </div>

      <div class="setting-group">
        <label>
          <input
            type="checkbox"
            checked={$soundEnabled}
            on:change={toggleSound}
          />
          <span class="label-text">Sound Notifications</span>
        </label>
        <p class="setting-description">Play a gentle chime when projects become blocked</p>
      </div>

    </div>
  </div>
{/if}

<style>
  .settings-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    z-index: 1000;
    padding: 4rem 1rem 1rem 1rem;
  }

  .settings-panel {
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    padding: 1.5rem;
    min-width: 320px;
    max-width: 400px;
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  h3 {
    margin: 0 0 1.5rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
  }

  .setting-group {
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .setting-group:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  label {
    display: flex;
    align-items: center;
    cursor: pointer;
    user-select: none;
  }

  input[type="checkbox"] {
    width: 1.25rem;
    height: 1.25rem;
    cursor: pointer;
    accent-color: #3b82f6;
  }

  .label-text {
    margin-left: 0.75rem;
    font-size: 1rem;
    font-weight: 500;
    color: #1f2937;
  }

  .setting-description {
    margin: 0.5rem 0 0 2rem;
    font-size: 0.875rem;
    color: #6b7280;
    line-height: 1.4;
  }

</style>

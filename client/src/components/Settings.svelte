<script lang="ts">
  import { layoutMode, soundEnabled, overloadMode, themeMode } from '../stores/state';
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

  function toggleOverload() {
    overloadMode.update(enabled => !enabled);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      open = false;
    }
  }
</script>

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="settings-overlay" on:click={() => open = false}>
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div class="settings-panel" on:click|stopPropagation on:keydown={handleKeydown} role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <h3 id="settings-title">Settings</h3>

      <div class="setting-group">
        <span class="label-text">Theme</span>
        <div class="theme-selector">
          <button
            class="theme-btn"
            class:active={$themeMode === 'system'}
            on:click={() => themeMode.set('system')}
          >System</button>
          <button
            class="theme-btn"
            class:active={$themeMode === 'light'}
            on:click={() => themeMode.set('light')}
          >Light</button>
          <button
            class="theme-btn"
            class:active={$themeMode === 'dark'}
            on:click={() => themeMode.set('dark')}
          >Dark</button>
        </div>
        <p class="setting-description">Follow your OS preference, or force a specific theme</p>
      </div>

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

      <div class="setting-group">
        <label>
          <input
            type="checkbox"
            checked={$overloadMode}
            on:change={toggleOverload}
          />
          <span class="label-text">Overload Mode</span>
        </label>
        <p class="setting-description">Show ALL speech bubbles for ALL bots. Chaos! A goofy wreck of system state.</p>
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
    background: var(--bg-overlay);
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    z-index: 1000;
    padding: 4rem 1rem 1rem 1rem;
  }

  .settings-panel {
    background: var(--panel-bg);
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
    color: var(--panel-text);
  }

  .setting-group {
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--panel-border);
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
    color: var(--panel-text);
  }

  .setting-description {
    margin: 0.5rem 0 0 2rem;
    font-size: 0.875rem;
    color: var(--panel-description);
    line-height: 1.4;
  }

  .theme-selector {
    display: flex;
    gap: 0.5rem;
    margin: 0.5rem 0 0 0.75rem;
  }

  .theme-btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
    border-radius: 0.5rem;
    border: 1px solid var(--panel-border);
    background: transparent;
    color: var(--panel-description);
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .theme-btn:hover {
    border-color: #3b82f6;
    color: var(--panel-text);
  }

  .theme-btn.active {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
  }
</style>

<script lang="ts">
  export let question: string;

  // Truncate very long questions
  $: displayQuestion =
    question.length > 500 ? question.slice(0, 500) + '...' : question;
</script>

<div class="mt-3 p-3 bg-blocked/10 border border-blocked/30 rounded-lg">
  <p class="text-sm text-blocked/90 whitespace-pre-wrap">{displayQuestion}</p>
</div>

<script lang="ts">
	import { onMount } from "svelte";

  let module
  function createMemory() {
    module.create_memory()
    module.do_leak_check_fatal()
  }

  onMount(async () => {
    const { default: init } = await import('/lib.debug.js?url')
    module = await init()
  })
</script>

<h1>Emscripten Testbed</h1>
<button on:click={createMemory}>Do stuff</button>

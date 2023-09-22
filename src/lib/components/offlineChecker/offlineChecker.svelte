<script lang="ts">

	// роверять доступность сервера каждые 5 секунд
	// и отправляет события о состоянии сервера.
	// Запрос будет автоматически прерван после 5 секунд, если сервер не ответит.

	import { onMount, onDestroy } from 'svelte';
	import { createEventDispatcher } from 'svelte';
  
	const dispatch = createEventDispatcher();
  
	let intervalId: number;
	
 

	const checkServerAccess = async () => {
	  const controller = new AbortController();
	  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
	  try {
		const response = await fetch('/api/data/words_v1/structure', { 
		  method: 'HEAD', 
		  signal: controller.signal 
		});
  
		clearTimeout(timeoutId);
  
		if (response.ok) {
		  dispatch('server-status', { online: true });
		} else {
		  dispatch('server-status', { online: false });
		}
	  } catch (e) {
		clearTimeout(timeoutId);
		dispatch('server-status', { online: false });
	  }
	};
  
	onMount(() => {
	  intervalId = window.setInterval(checkServerAccess, 5000);
	});
  
	onDestroy(() => {
	  clearInterval(intervalId);

	});
  </script>
  
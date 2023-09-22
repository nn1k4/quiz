<script lang="ts">
	// проверяет статус приложения на Offlene и отправляет событие с помощью createEventDispatcher.
	// проверяет статус интернета
	// проверяет статус доступности сервера
	import { onMount, onDestroy } from 'svelte';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	let intervalId1: number;
	let intervalId2: number;
	let intervalId3: number;

	const checkOfflineApp = () => {
		if (navigator.onLine) {
			dispatch('offline-status', { online: true });
		} else {
			dispatch('offline-status', { online: false });
		}
	};

	const checkInternet = async () => {
		try {
			const response = await fetch('https://www.google.com/favicon.ico', {
				method: 'HEAD',
				mode: 'no-cors'
			});
			dispatch('internet-status', { online: true });
		} catch (e) {
			dispatch('internet-status', { online: false });
		}
	};

	const checkServerAccess = async () => {
		try {
			const response = await fetch('/api/data/words_v1/structure', {
				method: 'HEAD',
				mode: 'no-cors'
			});
			dispatch('server-status', { online: true });
		} catch (e) {
			dispatch('server-status', { online: false });
		}
	};

	onMount(() => {
		intervalId1 = window.setInterval(checkOfflineApp, 3000);
		intervalId2 = window.setInterval(checkInternet, 3000);
		intervalId3 = window.setInterval(checkServerAccess, 3000);
	});

	onDestroy(() => {
		clearInterval(intervalId1);
		clearInterval(intervalId2);
		clearInterval(intervalId3);
	});
</script>

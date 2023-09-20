<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Word, Stage } from '$lib/server/db';
	import { runQuery } from '$lib/sqlite/dataApi';
	import { waitTillStroageReady } from '$lib/sqlite/initStorages';
	import {
		useArrayCursor,
		moveToNext,
		moveToPrev,
		resetCursor,
		ArrayCursor
	} from './hooks/use_shared_store';
	import type { Writable } from 'svelte/store';

	let storageReady = false;
	let loadedWords: Word[] = [];
	let showTranslation = false;
	let stages: Stage[] = [];


	let localCursorStore: Writable<ArrayCursor> | null = null;
	let cursor: Word | null = null;
	let initialWords: Word[] = [];

	// Инициализация хранилища с пустым массивом (или каким-то начальным состоянием)
	localCursorStore = useArrayCursor(initialWords);

	onMount(async () => {
		await waitTillStroageReady('words_v1'); // ждем когда хранилище будет готово
		await waitTillStroageReady('stages_v1'); // ждем когда хранилище будет готово
		storageReady = true; // хранилища готовы

		// Загрузка данных (эмуляция)
		const initialWords = (await runQuery(`		
                  SELECT *
                  FROM words_v1 
                  WHERE next_review_date <= unixepoch(datetime('now', 'localtime')) 
                  OR next_review_date IS NULL
                  ORDER BY frequency DESC, next_review_date ASC
                  LIMIT 10;
              `)) as Word[];

		// Обновление хранилища после получения данных
		if (localCursorStore) {
			// Добавьте эту проверку
			localCursorStore.update((store) => {
				if (store) {
					// Эта проверка тоже будет полезной
					store.array = initialWords;
				}
				return store;
			});
		}
		if (localCursorStore) {
			localCursorStore.subscribe(($cursor) => {
				if ($cursor) {
					cursor = $cursor.current();
				}
			});
		}
	});

	function handleNext() {
		if (localCursorStore) {
			moveToNext(localCursorStore);
		}
	}

	function handlePrev() {
		if (localCursorStore) {
			moveToPrev(localCursorStore);
		}
	}

	function handleReset() {
		if (localCursorStore) {
			resetCursor(localCursorStore);
		}
	}
</script>

<button on:click={handleNext}>Next</button>
<button on:click={handlePrev}>Previous</button>
<button on:click={handleReset}>Reset</button>

<p>
	Current item: {cursor
		? `Word: ${cursor.word}, Translation: ${cursor.translation}`
		: 'No current item'}
</p>

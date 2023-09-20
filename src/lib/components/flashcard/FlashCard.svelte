<script lang="ts">

	// TODO Добавь ограничение когда мы подойдем к кону базы то есть больше не сможем взять слов из локальной таблице.
	import { onMount, onDestroy } from 'svelte';
	import type { Word, Stage, QueryResult } from '$lib/server/db';
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

	let offset = 0;
	let limit = 3;
	let isEndReached = false; // текущая выборка слов закончилась
	let localCursorStore: Writable<ArrayCursor> | null = null;
	let cursor: Word | null = null;
	let initialWords: Word[] = [];
	let unsubscribe: () => void; // Переменная для хранения функции отписки
	// Инициализация хранилища с пустым массивом (или каким-то начальным состоянием)
	localCursorStore = useArrayCursor(initialWords);
	let countWords: number; // количество слов в локальной базе
	let moreRows: boolean = false; // ест ли еще записи для локальной таблицы

	async function getWordsCount(): Promise<number> {
		const res = await runQuery(`
		SELECT COUNT(*) as "cnt" FROM words_v1
		`);

		return Number(res[0].cnt);
	}

	async function loadMoreWords() {
		if (moreRows) {
			offset += limit; // Увеличиваем смещение на limit
			await loadWords();
		} 
	}

	async function loadWords() {

		// Загрузка данных (эмуляция)
		const initialWords = await getWords(limit, offset);

		// Обновление хранилища после получения данных
		if (localCursorStore) {
			localCursorStore.update((store) => {
				if (store) {
					store.array = initialWords.data; // передаем массив слов в стор
					store.index = 0; // обнуляем индекс курсора
					moreRows = initialWords.moreRows; // есть ли еще записи в локальной таблице
				}
				return store;
			});
		}
	}

	async function getWords(limit: number = 10, offset: number = 0): Promise<QueryResult<Word[]>> {
		const data = (await runQuery(`		
                  SELECT *
                  FROM words_v1 
                  WHERE next_review_date <= unixepoch(datetime('now', 'localtime')) 
                  OR next_review_date IS NULL
                  ORDER BY frequency DESC, next_review_date ASC
                  LIMIT ${limit} OFFSET ${offset};
              `)) as Word[];

		return {
			data,
			moreRows: countWords > offset + limit
		};
	}

	onMount(async () => {
		await waitTillStroageReady('words_v1'); // ждем когда хранилище будет готово
		await waitTillStroageReady('stages_v1'); // ждем когда хранилище будет готово
		storageReady = true; // хранилища готовы

		countWords = await getWordsCount(); // количество слов в локальной таблице

		await loadWords(); // загружаем слова в стор

		if (localCursorStore) {
			unsubscribe = localCursorStore.subscribe(($cursor) => {
				if ($cursor) {
					if ($cursor.index == limit - 1){
						isEndReached = true;
					} else {
						isEndReached = false;
					};
					cursor = $cursor.current();
					console.log('The current value is:', cursor);
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

	// Отписка при уничтожении компонента
	onDestroy(() => {
		if (unsubscribe) {
			unsubscribe();
		}
	});
</script>

{#if isEndReached }
    <p>Cards are over.</p><br />
    <button on:click={loadMoreWords}>Learn more words</button><br />
{/if}

<button on:click={handleNext}>Next</button>
<button on:click={handlePrev}>Previous</button>
<button on:click={handleReset}>Reset</button>

<p>
	Current item: {cursor
		? `Word: ${cursor.word}, Translation: ${cursor.translation}`
		: 'No current item'}
</p>


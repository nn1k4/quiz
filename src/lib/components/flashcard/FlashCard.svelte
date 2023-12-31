<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Word, Stage, QueryResult } from '$lib/server/db';
	import { runQuery } from '$lib/sqlite/dataApi';
	import { waitTillStroageReady } from '$lib/sqlite/initStorages';
	import { updateWordsFromServer } from './util/updateWordsFromServer';
	import {
		useArrayCursor,
		moveToNext,
		moveToPrev,
		resetCursor,
		ArrayCursor,
		currentTime,
		convertToDatetime,
		updateCurrentTime
	} from './hooks/use_shared_store';
	import type { Writable } from 'svelte/store';
	import type { Stages } from './types';
	let storageReady = false;
	let loadedWords: Word[] = [];
	let showTranslation = false;

	const stages: Stages = [
		{ id: 1, interval: '+15 minutes' },
		{ id: 2, interval: '+1 hours' },
		{ id: 3, interval: '+3 hours' },
		{ id: 4, interval: '+1 days' },
		{ id: 5, interval: '+2 days' },
		{ id: 6, interval: '+4 days' },
		{ id: 7, interval: '+7 days' },
		{ id: 8, interval: '+14 days' },
		{ id: 9, interval: '+1 months' }
	];

	let offset = 0;
	let limit = 5; // количество заучиваемых слов за раз
	let isCursorEnd = false; // текущая выборка слов в курсоре закончилась
	let isTableEnd = false; // слова в локальной таблице закончились
	let localCursorStore: Writable<ArrayCursor> | null = null;
	let cursor: Word | null = null;
	let initialWords: Word[] = [];
	let unsubscribe: () => void; // Переменная для хранения функции отписки
	// Инициализация хранилища с пустым массивом (или каким-то начальным состоянием)
	localCursorStore = useArrayCursor(initialWords);
	let countWords: number; // количество слов в локальной таблице
	let moreRows: boolean = false; // ест ли еще записи в локальной таблице
	let stopUpdateTime: () => void; // для остановки таймера часов в сторе

	async function changeStages() {
		const chunkSize = 100; // количество элементов в каждом подмассиве (разбиваем массив на чанки для оптимизации производительности)
		// эта функция берет слова из курсора и меняет их stage и next_review_date
		if (localCursorStore) {
			localCursorStore.update((store) => {
				if (store) {
					const arr = store.getAll();

					if (arr.length > 0) {
						for (let i = 0; i < arr.length; i += chunkSize) {
							const chunk = arr.slice(i, i + chunkSize);
							// разбиваем в цикле массив на чанки
							const queryParts: string[] = []; // здесь формируется запрос

							chunk.map((item) => {
								console.log(`--->${item.word}`);
								// формируем sql запрос
								const nextStage = item.stage != null ? item.stage + 1 : 1;
								const stageExists = stages.some((stage) => stage.id === nextStage);

								if (stageExists) {
									const interval = stages.find((stage) => stage.id === nextStage)?.interval;
									const part = `
									UPDATE words_v1 
									SET 
										stage = ${nextStage},
										next_review_date = strftime('%s', 'now', '${interval}')
									WHERE id = ${item.id};
									`;
									queryParts.push(part);
								}
							});

							const query = queryParts.join('\n');
							console.log(query);
							// выполняем запрос
							runQuery(query)
								.then((result) => {
									console.log(`RESULT: ${result}`)
									// Обработка результата
								})
								.catch((error) => {
									console.log(`ERROR: ${error}`)
									// Обработка ошибки
								});
						}
					} else {
						throw new Error('Курсор пустой');
					}
				}
				return store;
			});
		}
	}

	async function updateLocalDatabase() {
		changeStages(); // меняем stage в локальной базе у просмотренных слов
		countWords = await getWordsCount(); // пересчитываем количество слов в локальной таблице
		offset -= limit;  // уменьшаем смещение поскольку этих слов в следующей выборке не будет.
		console.log('Update local database...');

		// здесь будем вызывать функцию которая будет обновлять локальную таблицу
		// но те слова которые были просмотрены с интервальными метками будут сохранены при этом.
		storageReady = false; // хранилища не готовы
		await updateWordsFromServer(countWords, 'words_v1');
		let newCountWords = await getWordsCount(); // новое количество слов в локальной таблице
		//await waitTillStroageReady('words_v1'); // ждем когда хранилище будет готово
		storageReady = true; // хранилище готово

		isTableEnd = false;
		// offset = 0; // если после обновления захотим вернуться назад
		console.log(` В локальную таблицу загружено ${newCountWords - countWords} новых слов`);
		countWords = newCountWords;
		await loadWords(); // загружаем новые слова в стор
	}

	async function getWordsCount(): Promise<number> {
		const res = await runQuery(`
		SELECT COUNT(*) as "cnt"
                  FROM words_v1 
                  WHERE next_review_date <= strftime('%s', 'now') 
                  OR next_review_date IS NULL
		`);

		return Number(res[0].cnt);
	}

	async function loadMoreWords() {
		changeStages(); // меняем stage в локальной базе у просмотренных слов
		countWords = await getWordsCount(); // пересчитываем количество слов в локальной таблице
		offset -= limit;  // уменьшаем смещение поскольку этих слов в следующей выборке не будет.
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
					if (!moreRows) {
						isTableEnd = true; // дошли до конца локальной таблицы
					}
				}
				return store;
			});
		}
	}

	async function getWords(limit: number = 10, offset: number = 0): Promise<QueryResult<Word[]>> {
		const data = (await runQuery(`		
                  SELECT *
                  FROM words_v1 
                  WHERE next_review_date <= strftime('%s', 'now') 
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
		stopUpdateTime = updateCurrentTime(); // запуск обновления текущего времени в сторе
		await waitTillStroageReady('words_v1'); // ждем когда хранилище будет готово
		// await waitTillStroageReady('stages_v1'); // ждем когда хранилище будет готово
		storageReady = true; // хранилища готовы

		countWords = await getWordsCount(); // количество слов в локальной таблице

		await loadWords(); // загружаем слова в стор

		if (localCursorStore) {
			unsubscribe = localCursorStore.subscribe(($cursor) => {
				if ($cursor) {
					if ($cursor.index == limit - 1 || $cursor.index == $cursor.length() -1) {
						isCursorEnd = true;
					} else {
						isCursorEnd = false;
					}
					cursor = $cursor.current();
					// -- отладка
					const stor = $cursor.array;
					const index = $cursor.index;
					console.log('The stor value is:', stor);
					console.log('The index value is:', index);
					// -- отладка
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

	// Отписки при уничтожении компонента
	onDestroy(() => {
		if (stopUpdateTime) {
			stopUpdateTime(); // останавливаем таймер в сторе
		}

		if (unsubscribe) {
			unsubscribe(); // отписывает компонент от обновлений хранилища localCursorStore
		}
	});
</script>

<div>
	Storage Ready: {storageReady ? 'true' : 'false'}
</div>

<p>Текущее время: {$currentTime} Unix epoch</p>
<p>В формате datetime: {convertToDatetime($currentTime)}</p>



	{#if storageReady && ((isTableEnd && isCursorEnd) || !cursor) }
		<p>Local word database are over.</p>
		<br />
		<button on:click={updateLocalDatabase}>Update local database?</button><br />
	{/if}

	{#if storageReady && (isCursorEnd && !isTableEnd)}
		<p>Cards are over.</p>
		<br />
		<button on:click={loadMoreWords}>Learn more words</button><br />
	{/if}

	{#if storageReady && cursor }
	<button on:click={handleNext}>Next</button>
	<button on:click={handlePrev}>Previous</button>
	<button on:click={handleReset}>Reset</button>

	<p>
		Current item: {cursor
			? `Word: ${cursor.word}, Translation: ${cursor.translation}`
			: 'No current item'}
	</p>
	{/if}
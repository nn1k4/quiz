<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { words,  cursorStore, moveToNext, moveToPrev, resetCursor, setInitialArray  } from './store';
    import type { Word, Stage } from '$lib/server/db';
    import { runQuery } from '$lib/sqlite/dataApi';
    import { waitTillStroageReady } from '$lib/sqlite/initStorages';

    let storageReady = false;
    let  loadedWords: Word[] = [];
    let currentWord: Word | null = null;
    let showTranslation = false;
    let stages: Stage[] = [];

    let cursor: Word | null = null;
    cursorStore.subscribe($cursor => {
      if ($cursor) {
        cursor = $cursor.current();
        }
    });

      // Инициализация массива из компонента
  const initialWords: Word[] = [
    { id: 1, word: "apple", translation: "яблоко", frequency: 5, next_review_date: 1633027200, stage: 1 },
    { id: 2, word: "pear", translation: "груша", frequency: 4, next_review_date: 1633027211, stage: 2 },
    // ... другие слова
  ];
  
  setInitialArray(initialWords);

    words.subscribe(value => {
        console.log("Current state:", value); // вывожу в консоль состояние стора
        // value.forEach((item, index) => {
        // console.log(`Item ${index}:`, item);
        // });
    });


    onMount(async () => {

        await waitTillStroageReady('words_v1'); // ждем когда хранилище будет готово
	      await waitTillStroageReady('stages_v1'); // ждем когда хранилище будет готово
		    storageReady = true; // хранилища готовы

      

        // Загрузка данных (эмуляция)
        loadedWords  = (await runQuery(`		
                SELECT *
                FROM words_v1 
                WHERE next_review_date <= unixepoch(datetime('now', 'localtime')) 
                OR next_review_date IS NULL
                ORDER BY frequency DESC, next_review_date ASC
                LIMIT 10;
            `)) as Word[];
        words.set(loadedWords);
  
      // Установить первое слово
      if (loadedWords.length > 0) {
        currentWord = loadedWords[0];
      }
    });

    onDestroy(() => {
         words.set([]); 
    });
  
    function nextWord() {
        showTranslation = false;

        // Достать следующее слово
        const loadedWords = $words;
        const next = loadedWords.shift();
        if (next !== undefined) {
            currentWord = next;
        } else {
            currentWord = null;  // или какое-то другое начальное значение
        }
        words.set(loadedWords);
    }

    function handleKeyPress(event: KeyboardEvent) {
      if (event.key === ' ') {
        if (showTranslation) {
          nextWord();
        } else {
          showTranslation = true;
        }
      }
    }
  </script>
  
  <svelte:window on:keydown={handleKeyPress} />

<button on:click={moveToPrev}>Previous</button>
<button on:click={moveToNext}>Next</button>
<button on:click={resetCursor}>Reset</button>
<p>Current item: {cursor ? `Word: ${cursor.word}, Translation: ${cursor.translation}` : 'No current item'}</p>

  <div>
	Storage Ready: {storageReady ? 'true' : 'false'}
  </div>
  
  {#if storageReady}
    {#if currentWord}
        <div>
        <p>{showTranslation ? currentWord.translation : currentWord.word}</p>
        </div>
    {:else}
        <div>
        <p>Нет слов для отображения</p>
        </div>
    {/if}
  {/if}
  
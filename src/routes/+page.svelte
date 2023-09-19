<script lang="ts">
	import type { Word, Stage } from '$lib/server/db';
	import { runQuery, runStorageQuery } from '$lib/sqlite/dataApi';
	import { waitTillStroageReady } from '$lib/sqlite/initStorages';
	import { onMount } from 'svelte';
	
	let storageReady = false;
	let words: Word[] = [];
	let stages: Stage[] = [];
	// Функция для преобразования unixepoch в формат datetime
	function convertToDatetime(unixepochTime: number) {

		const datetime = new Date(unixepochTime * 1000);
		return datetime.toLocaleString("lv-LV", { hour12: false, timeZone: "UTC" }); // Вы можете изменить это согласно вашим потребностям
	}



	onMount(async () => {
		
		await waitTillStroageReady('words_v1'); // ждем когда хранилище будет готово
		await waitTillStroageReady('stages_v1'); // ждем когда хранилище будет готово
		storageReady = true; // хранилище готово

		// words = (await runQuery('select * from words_v1 limit 10')) as Word[];
		words = (await runQuery(`		
			SELECT *
			FROM words_v1 
			WHERE next_review_date <= unixepoch(datetime('now', 'localtime')) 
			OR next_review_date IS NULL
			ORDER BY frequency DESC, next_review_date ASC
			LIMIT 10;
		`)) as Word[];

		stages = (await runQuery('select * from stages_v1 limit 10')) as Stage[];

		// customers = (await runQuery('select * from customers_v1 limit 10')) as Customer[];
		
		// customers = (await runStorageQuery('customers_v1',{
		// 	searchTerm: 'Paul', limit: 2
		// }))	as Customer[];

		// customers = (await runStorageQuery('customers_v1',{
		// limit: 10, offset: 30
		// }))	as Customer[];

		// customers = (await runStorageQuery('customers_v1',{
		// limit: 10,
		// orderByCol: 'contact',
		// orderByDir: 'desc',
		// searchTerm: 'Paul'
		// }))	as Customer[];

		// customers = (await runStorageQuery('customers_v1', {
		// 	orderByCol: 'contact',
		// 	orderByDir: 'desc',
		// 	searchTerm: 'Paul'
		// })) as Customer[];
		console.log(words);
	});
</script>

<h1 class="text-5xl text-teal-500">SvelteKit Offline SQLite</h1>

<div>
	Storage Ready: {storageReady ? 'true' : 'false'}
</div>

<div>

STAGES:
<hr />
{#each stages as stage}
		<div>
		
			<span  class="font-semibold" > {stage.id} : {stage.interval} </span> <br /> 
			
		</div>
{/each}
<hr />

WORDS:
{#each words as word}
		<div>
			
			<hr />
			<span  class="font-semibold" > {word.word} : {word.translation} </span> <br /> 
			Trequency:  {word.frequency} <br /> 
			Next_review_date:  {convertToDatetime(word.next_review_date)} <br />
			Stage: {word.stage} <br />
			<hr />
		</div>
	{/each} 
</div>

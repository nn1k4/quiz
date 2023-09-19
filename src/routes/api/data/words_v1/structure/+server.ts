import { json, type RequestHandler } from '@sveltejs/kit';
import type { TableStructure } from '../../types';

export const GET = (() => {
	// https://localhost:5173/api/data/words_v1/structure

	const data: TableStructure = {
		columns: [
			{ name: 'id', type: 'number' },
			{ name: 'word', type: 'string' },
			{ name: 'translation', type: 'string' },
			{ name: 'frequency', type: 'number' },
			{ name: 'next_review_date', type: 'number' },
			{ name: 'stage', type: 'number' },
		],
		pkColumn: 'id'
	};
	return json(data);
}) satisfies RequestHandler;

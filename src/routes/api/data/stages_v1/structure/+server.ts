import { json, type RequestHandler } from '@sveltejs/kit';
import type { TableStructure } from '../../types';

export const GET = (() => {
	// https://localhost:5173/api/data/stages_v1/structure

	const data: TableStructure = {
		columns: [
			{ name: 'id', type: 'number' },
			{ name: 'interval', type: 'string' },
		],
		pkColumn: 'id'
	};
	return json(data);
}) satisfies RequestHandler;

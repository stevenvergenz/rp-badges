import fetch from 'node-fetch';
import { Event as DbEvent } from './types';

const upcomingEventsUrl = 'https://account.altvr.com/api/public/channels/866762872787567365/events';
const pastEventsUrl = 'https://account.altvr.com/api/public/channels/866762872787567365/events/past?per=50';

type ApiEvent = {
	event_id: string;
	name: string;
	start_time: string;
	image_small: string;
};
type ApiEventsResponse = {
	events: ApiEvent[];
	pagination: { token: string; };
};

export async function getEvents() {
	const body: ApiEventsResponse = await (
		await fetch(upcomingEventsUrl, { timeout: 5000 })
	).json();

	return body.events.map(ae => {
		return new DbEvent(
			ae.event_id,
			ae.name,
			new Date(ae.start_time),
			ae.image_small);
	});
}

export async function getPastEvents() {
	const allEvents: ApiEvent[] = [];
	let body: ApiEventsResponse;
	do {
		body = await (
			await fetch(body ? `${pastEventsUrl}&token=${body.pagination.token}` : pastEventsUrl, { timeout: 5000 })
		).json();
		allEvents.push(...body.events);
	} while (body.pagination.token)

	const twoYearsAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 2);
	return allEvents
		.map(evt => {
			return new DbEvent(
				evt.event_id,
				evt.name,
				new Date(evt.start_time),
				evt.image_small);
		})
		.filter(evt => evt.timestamp > twoYearsAgo);
}

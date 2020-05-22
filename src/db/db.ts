import * as PG from 'pg';
import { withArray } from 'pg-format';
import * as MRE from '@microsoft/mixed-reality-extension-sdk';

import * as Queries from './queries';
import { PresentationMode, User, Event, Joining } from './types';
import * as API from './api';

export class Database {
	private clientPool: PG.Pool;
	private ready: Promise<void>;

	constructor() {
		this.clientPool = new PG.Pool({ connectionTimeoutMillis: 30000 });
		this.ready = this.init().then(
			() => MRE.log.info('app', "DB updated and ready"),
			err => MRE.log.error('app', err));
	}

	private async init() {
		// create the events table
		await this.clientPool.query(Queries.CreateEventsTable);

		// populate the old event backlog if the events table is empty
		const result = await this.clientPool.query(Queries.ValidateEventsTable);
		if (!result.rows[0].hasEvents) {
			const pastEvents = await API.getPastEvents();
			await this.clientPool.query(
				withArray(Queries.UpdateEvents, [pastEvents.map(e => e.toJSON())]));
		}

		// populate new events
		const events = await API.getEvents();
		await this.clientPool.query(
			withArray(Queries.UpdateEvents, [events.map(e => e.toJSON())]));

		// create the users table
		await this.clientPool.query(Queries.CreateUsersTable);

		// create the joinings table
		await this.clientPool.query(Queries.CreateJoiningsTable);
	}

	private userCache = new Map<MRE.Guid, Promise<User>>();
	public getUser(id: MRE.Guid) {
		if (!this.userCache.has(id)) {
			this.userCache.set(id, this._getUser(id));
		}
		return this.userCache.get(id);
	}
	private async _getUser(id: MRE.Guid) {
		await this.ready;
		const result = await this.clientPool.query(Queries.GetUser, [id]);
		if (result.rowCount === 1) {
			return new User(
				result.rows[0].id,
				result.rows[0].name,
				result.rows[0].presentation_mode,
				result.rows[0].fit);
		} else {
			return null;
		}
	}
	
	public async updateUser(user: User) {
		await this.ready;
		const result = await this.clientPool.query(Queries.UpdateUser, user.toJSON());
		if (result.rowCount === 1) {
			this.userCache.set(user.id, Promise.resolve(user));
			return true;
		} else {
			return false;
		}
	}

	public async deleteUser(id: MRE.Guid) {
		await this.ready;
		const result = await this.clientPool.query(Queries.DeleteUser, [id]);
		if (result.rowCount === 1) {
			this.userCache.delete(id);
			return true;
		} else {
			return false;
		}
	}

	private eventsCache: Promise<Event[]>;
	public getEvents() {
		if (!this.eventsCache) {
			this.eventsCache = this._getEvents();
		}
		return this.eventsCache;
	}
	private async _getEvents() {
		await this.ready;
		const result = await this.clientPool.query(Queries.GetEvents);
		return result.rows.map(row => new Event(row.id, row.name, row.timestamp, row.badge_url));
	}

	public async updateEvents(events: Event[]) {
		await this.ready;
		const result = await this.clientPool.query(
			withArray(Queries.UpdateEvents, [events.map(e => e.toJSON())]));
		return result.rowCount === events.length;
	}

	public async addJoining(userId: MRE.Guid, eventId: string) {
		await this.ready;
		const result = await this.clientPool.query(Queries.AddJoining, [userId, eventId]);
		return result.rowCount === 1;
	}

	private joiningsCache = new Map<MRE.Guid, Promise<Joining[]>>();
	public getJoinings(userId: MRE.Guid) {
		if (!this.joiningsCache.has(userId)) {
			this.joiningsCache.set(userId, this._getJoinings(userId));
		}
		return this.joiningsCache.get(userId);
	}
	private async _getJoinings(userId: MRE.Guid) {
		await this.ready;
		const result = await this.clientPool.query(Queries.GetJoinings, [userId]);
		return result.rows.map(row => new Joining(row.user_id, row.event_id, row.timestamp));
	}

	public shutdown() {
		this.clientPool.end();
	}
}

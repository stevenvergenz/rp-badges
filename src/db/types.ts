import { Guid } from '@microsoft/mixed-reality-extension-sdk';

export enum PresentationMode {
	None = 0,
	Count,
	Badges
}

export class User {
	public constructor(
		public id: Guid,
		public name: string,
		public presentation_mode: PresentationMode,
		public fit: number
	) { }

	public toJSON() {
		return [this.id, this.name, this.presentation_mode, this.fit];
	}
}


export class Event {
	private static readonly starlinkRegex = /starlink/iu;
	private static readonly shortNameRegex = /^(?:\[SCRUBBED\] )?(?:Rocket Party: )?(.*)$/u;

	public constructor(
		public id: string, 
		public name: string, 
		public timestamp: Date, 
		public badge_url: string) { }

	public get shortName() {
		const match = Event.shortNameRegex.exec(this.name);
		if (match) {
			return match[1];
		} else {
			return this.name;
		}
	}

	public isStarlink() {
		return Event.starlinkRegex.test(this.name);
	}

	public toJSON() {
		return [this.id, this.name, this.timestamp, this.badge_url];
	}
}

export class Joining {
	public constructor(
		public user_id: Guid,
		public event_id: string,
		public timestamp: Date) { }

	public toJSON() {
		return [this.user_id, this.event_id, this.timestamp];
	}
}

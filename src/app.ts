import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import { instanceList } from './index';
import { Database, Event as DbEvent, User as DbUser, PresentationMode } from './db';
import { MenuManager } from './menu';

type UserAnchor = {
	anchor: MRE.Actor;
	layout: MRE.PlanarGridLayout;
	label: MRE.Actor;
}

export default class App {
	public db: Database;
	private menus: MenuManager;

	private assets: MRE.AssetContainer;
	private badgeDefs = new Map<string, Partial<MRE.ActorLike>>();
	private userAnchors = new Map<MRE.Guid, UserAnchor>();

	public constructor(public context: MRE.Context, public baseUrl: string) {
		instanceList.push(this);
		this.db = new Database();

		this.context.onStarted(() => this.onStarted().catch(err => MRE.log.error('app', err)));
		this.context.onStopped(() => this.shutdown());
		this.context.onUserJoined(user => this.onUserJoined(user).catch(err => MRE.log.error('app', err)));
		this.context.onUserLeft(user => this.onUserLeft(user));
	}

	private async onStarted() {
		this.menus = new MenuManager(this);

		this.assets = new MRE.AssetContainer(this.context);
		await this.assets.loadGltf(`${this.baseUrl}/badge.glb`);
		const badgeMesh = this.assets.meshes[0];
		const badgeMatBase = this.assets.materials[0].toJSON().material;

		// preload badge graphics
		const events = await this.db.getEvents();
		for (const event of events) {
			const badgeTemplate: Partial<MRE.ActorLike> = {
				name: event.shortName,
				appearance: {
					meshId: badgeMesh.id,
					materialId: this.assets.createMaterial(event.shortName, {
						...badgeMatBase,
						mainTextureId: this.assets.createTexture(event.shortName, {
							uri: event.badge_url
						}).id
					}).id
				},
				transform: { local: {
					rotation: MRE.Quaternion.FromEulerAngles(-Math.PI / 2, Math.PI, 0),
					scale: { x: 0.6, y: 0.6, z: 0.6 }
				}}
			};
			this.badgeDefs.set(event.id, badgeTemplate);
		}
	}

	public shutdown() {
		instanceList.splice(instanceList.findIndex(app => app === this), 1);
		this.db.shutdown();
	}

	private async onUserJoined(user: MRE.User) {
		const dbUser = await this.db.getUser(user.id);

		// always attach the menu
		await this.menus.attachToUser(user.id, dbUser);

		// make sure user is participating
		if (!dbUser) { return; }

		await this.awardBadge(user);
		
		// attach badges
		await this.displayBadges(user.id, dbUser);
	}

	private onUserLeft(user: MRE.User) {
		const anchor = this.userAnchors.get(user.id);
		if (anchor) {
			anchor.anchor.destroy();
			this.userAnchors.delete(user.id);
		}
	}

	public async awardBadge(user: MRE.User) {
		// record if user joined eligible event
		const joinedEventId = user.properties['altspacevr-event-id'];
		const events = await this.db.getEvents();
		const matchedEvent = events.find(e => e.id === joinedEventId);
		if (joinedEventId && matchedEvent) {
			MRE.log.info('app', `${user.name} attended valid event ${matchedEvent.name}`);
			await this.db.addJoining(user.id, matchedEvent.id);
		}
	}

	public async displayBadges(userId: MRE.Guid, dbUser: DbUser) {
		// set up attachment point
		if (!this.userAnchors.has(userId)) {
			const anchor = MRE.Actor.Create(this.context, { actor: {
				name: "badges",
				attachment: {
					userId: userId,
					attachPoint: 'spine-top'
				},
				transform: { local: { position: { y: 0.07, z: 0.13 }}}
			}});
			const label = MRE.Actor.Create(this.context, { actor: {
				name: "label",
				parentId: anchor.id,
				transform: { local: {
					position: { y: -0.40 },
					rotation: MRE.Quaternion.FromEulerAngles(0, Math.PI, 0)
				}},
				text: {
					height: 0.09,
					anchor: MRE.TextAnchorLocation.MiddleCenter,
					color: MRE.Color3.FromHexString('#856d8a')
				}
			}});
			this.userAnchors.set(userId, {
				anchor,
				layout: new MRE.PlanarGridLayout(anchor, MRE.BoxAlignment.BottomCenter, MRE.BoxAlignment.MiddleCenter),
				label
			});
		}

		const userAnchor = this.userAnchors.get(userId);
		this.cleanBadges(userAnchor);
		if (!dbUser) { return; }

		// adjust fit
		userAnchor.anchor.transform.local.position.z = 0.13 + 0.01 * dbUser.fit;

		// get all events this user attended
		const eventsLookup = (await this.db.getEvents())
			.reduce((map, event) => map.set(event.id, event), new Map<string, DbEvent>());
		//const joinedEvents = [...eventsLookup.values()];
		const joinedEvents = (await this.db.getJoinings(dbUser.id))
			.map(j => eventsLookup.get(j.event_id));

		// filter out duplicate starlink launches, limit to 20 badges
		const firstStarlinkIndex = joinedEvents.findIndex(evt => evt.isStarlink());
		const displayedEvents = joinedEvents
			.filter((evt, i) => !evt.isStarlink() || i === firstStarlinkIndex)
			.slice(0, 20);
		MRE.log.info('app', `Applying ${displayedEvents.length} badges to ${dbUser.name}`);

		// show attendance count
		if (dbUser.presentation_mode === PresentationMode.Count) {
			userAnchor.label.text.contents = joinedEvents.length.toString();
		}
		// show badges
		else if (dbUser.presentation_mode === PresentationMode.Badges) {
			for (let i = 0; i < displayedEvents.length; i++) {
				const event = displayedEvents[i];
				userAnchor.layout.addCell({
					contents: MRE.Actor.Create(this.context, { actor: {
						...this.badgeDefs.get(event.id),
						parentId: userAnchor.anchor.id
					}}),
					row: Math.floor(i / 4),
					column: 3 - (i % 4),
					width: 0.07,
					height: 0.07
				});
			}
			userAnchor.layout.applyLayout();
	
			if (displayedEvents.length < joinedEvents.length) {
				userAnchor.label.text.contents = `+ ${joinedEvents.length - displayedEvents.length}`;
			}
		}
	}

	private cleanBadges(userAnchor: UserAnchor) {
		for (const child of userAnchor.anchor.children) {
			if (child !== userAnchor.label) {
				child.destroy();
			}
		}
		userAnchor.layout = new MRE.PlanarGridLayout(
			userAnchor.anchor,
			MRE.BoxAlignment.BottomCenter,
			MRE.BoxAlignment.MiddleCenter);

		userAnchor.label.text.contents = "";
	}
}

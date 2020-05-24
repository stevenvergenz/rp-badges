import * as MRE from '@microsoft/mixed-reality-extension-sdk';

import App from './app';
import { User as DbUser, PresentationMode } from './db';

type MenuState = {
	dbUser: DbUser;
	showing: boolean;
	menuActor: MRE.Actor;
	participateActor: MRE.Actor;
	noDisplayActor: MRE.Actor;
	numbersActor: MRE.Actor;
	badgesActor: MRE.Actor;
	menuOpenAnim: MRE.Animation;
	menuCloseAnim: MRE.Animation;
};

export class MenuManager {
	private assets: MRE.AssetContainer;
	private ready: Promise<void>;
	private menuPrefab: MRE.Prefab;
	private selectedMat: MRE.Material;
	private deselectedMat: MRE.Material;
	private menuOpenAnimData: MRE.AnimationData;
	private menuCloseAnimData: MRE.AnimationData;

	private menuStates = new Map<MRE.Guid, MenuState>();

	public constructor(private app: App) {
		this.assets = new MRE.AssetContainer(this.app.context);
		this.ready = this.init().catch(err => MRE.log.error('app', err));
	}

	private async init() {
		// load core menu asset
		await this.assets.loadGltf(`${this.app.baseUrl}/menu.glb`);
		this.menuPrefab = this.assets.prefabs[0];
		this.selectedMat = this.assets.materials.find(m => m.name === "SelectedMat");
		this.deselectedMat = this.assets.materials.find(m => m.name === "DeselectedMat");

		// swap everything over to emissive
		for (const mat of this.assets.materials) {
			mat.emissiveColor.set(mat.color.r, mat.color.g, mat.color.b);
			mat.emissiveTexture = mat.mainTexture;
			mat.emissiveTextureOffset = mat.mainTextureOffset;
			mat.emissiveTextureScale = mat.mainTextureScale;
			mat.color.set(0, 0, 0, 1);
		}

		// create menu-open anim
		const animLength = 0.5;
		this.menuOpenAnimData = this.assets.createAnimationData("menuOpen", { tracks: [{
			target: MRE.ActorPath("menuRoot").transform.local.position.y,
			easing: MRE.AnimationEaseCurves.EaseOutCubic,
			keyframes: [
				{ time: 0,          value: -0.5 },
				{ time: animLength, value: 0.5 }
			]
		}, {
			target: MRE.ActorPath("menuRoot").transform.local.rotation,
			easing: MRE.AnimationEaseCurves.EaseOutCubic,
			keyframes: [
				{ time: 0,          value: MRE.Quaternion.FromEulerAngles(-Math.PI / 4, Math.PI, 0) },
				{ time: animLength, value: MRE.Quaternion.FromEulerAngles(0, Math.PI, 0) }
			]
		}, {
			target: MRE.ActorPath("menu").transform.local.position,
			easing: MRE.AnimationEaseCurves.EaseOutCubic,
			keyframes: [
				{ time: 0,          value: { x: 0, y: 0, z: 0 } },
				{ time: animLength, value: { x: 0.66, y: 0, z: 0 } }
			]
		}, {
			target: MRE.ActorPath("participate").transform.local.position,
			easing: MRE.AnimationEaseCurves.EaseOutCubic,
			keyframes: [
				{ time: 0,          value: { x: 0, y: -0.01, z: 0 } },
				{ time: animLength, value: { x: -0.33, y: 0, z: 0 } }
			]
		}, {
			target: MRE.ActorPath("noDisplay").transform.local.position,
			easing: MRE.AnimationEaseCurves.EaseOutCubic,
			keyframes: [
				{ time: 0,          value: { x: 0, y: -0.02, z: 0 } },
				{ time: animLength, value: { x: -0.66, y: 0, z: 0 } }
			]
		}, {
			target: MRE.ActorPath("numbers").transform.local.position,
			easing: MRE.AnimationEaseCurves.EaseOutCubic,
			keyframes: [
				{ time: 0,          value: { x: 0, y: -0.03, z: 0 } },
				{ time: animLength, value: { x: -0.99, y: 0, z: 0 } }
			]
		}, {
			target: MRE.ActorPath("badges").transform.local.position,
			easing: MRE.AnimationEaseCurves.EaseOutCubic,
			keyframes: [
				{ time: 0,          value: { x: 0, y: -0.04, z: 0 } },
				{ time: animLength, value: { x: -1.32, y: 0, z: 0 } }
			]
		}, {
			target: MRE.ActorPath("adjustFit").transform.local.position,
			easing: MRE.AnimationEaseCurves.EaseOutCubic,
			keyframes: [
				{ time: 0,          value: { x: 0, y: -0.05, z: 0 } },
				{ time: animLength, value: { x: -0.66, y: 0, z: 0.44 } }
			]
		}]});

		// create menu-close anim
		this.menuCloseAnimData = this.assets.createAnimationData("menuClose", { tracks: [{
			target: MRE.ActorPath("menuRoot").transform.local.position.y,
			easing: MRE.AnimationEaseCurves.EaseOutCubic,
			keyframes: [
				{ time: 0,          value: 0.5 },
				{ time: animLength, value: -0.5 }
			]
		}, {
			target: MRE.ActorPath("menuRoot").transform.local.rotation,
			easing: MRE.AnimationEaseCurves.EaseOutCubic,
			keyframes: [
				{ time: 0,          value: MRE.Quaternion.FromEulerAngles(0, Math.PI, 0) },
				{ time: animLength, value: MRE.Quaternion.FromEulerAngles(-Math.PI / 4, Math.PI, 0) }
			]
		}, {
			target: MRE.ActorPath("menu").transform.local.position,
			easing: MRE.AnimationEaseCurves.EaseOutCubic,
			keyframes: [
				{ time: 0,          value: { x: 0.66, y: 0, z: 0 } },
				{ time: animLength, value: { x: 0, y: 0, z: 0 } }
			]
		}, {
			target: MRE.ActorPath("participate").transform.local.position,
			easing: MRE.AnimationEaseCurves.EaseOutCubic,
			keyframes: [
				{ time: 0,          value: { x: -0.33, y: 0, z: 0 } },
				{ time: animLength, value: { x: 0, y: -0.01, z: 0 } }
			]
		}, {
			target: MRE.ActorPath("noDisplay").transform.local.position,
			easing: MRE.AnimationEaseCurves.EaseOutCubic,
			keyframes: [
				{ time: 0,          value: { x: -0.66, y: 0, z: 0 } },
				{ time: animLength, value: { x: 0, y: -0.02, z: 0 } }
			]
		}, {
			target: MRE.ActorPath("numbers").transform.local.position,
			easing: MRE.AnimationEaseCurves.EaseOutCubic,
			keyframes: [
				{ time: 0,          value: { x: -0.99, y: 0, z: 0 } },
				{ time: animLength, value: { x: 0, y: -0.03, z: 0 } }
			]
		}, {
			target: MRE.ActorPath("badges").transform.local.position,
			easing: MRE.AnimationEaseCurves.EaseOutCubic,
			keyframes: [
				{ time: 0,          value: { x: -1.32, y: 0, z: 0 } },
				{ time: animLength, value: { x: 0, y: -0.04, z: 0 } }
			]
		}, {
			target: MRE.ActorPath("adjustFit").transform.local.position,
			easing: MRE.AnimationEaseCurves.EaseOutCubic,
			keyframes: [
				{ time: 0,          value: { x: -0.66, y: 0, z: 0.44 } },
				{ time: animLength, value: { x: 0, y: -0.05, z: 0 } }
			]
		}]});
	}

	public async attachToUser(userId: MRE.Guid, dbUser: DbUser) {
		await this.ready;

		// spawn the menu
		const menuRoot = MRE.Actor.CreateFromPrefab(this.app.context, {
			prefab: this.menuPrefab,
			actor: {
				name: 'menu',
				exclusiveToUser: userId,
				attachment: {
					userId,
					attachPoint: 'spine-bottom'
				},
				transform: { local: {
					position: { y: -0.5, z: 1.75 },
					rotation: MRE.Quaternion.FromEulerAngles(-Math.PI / 4, Math.PI, 0)
				}}
			}
		});
		await menuRoot.created();

		// find buttons
		const menu = menuRoot.findChildrenByName("Menu", false)[0];
		const participate = menu.findChildrenByName("Participate", false)[0];
		const noDisplay = menu.findChildrenByName("NoDisplay", false)[0];
		const numbers = menu.findChildrenByName("Numbers", false)[0];
		const badges = menu.findChildrenByName("Badges", false)[0];
		const adjustFit = menu.findChildrenByName("AdjustFit", false)[0];
		const adjustFitLooser = adjustFit.findChildrenByName("Looser", false)[0];
		const adjustFitTighter = adjustFit.findChildrenByName("Tighter", false)[0];

		// set initial state from DB
		menu.appearance.material = this.deselectedMat;
		participate.appearance.material = this.deselectedMat;
		noDisplay.appearance.material = this.deselectedMat;
		numbers.appearance.material = this.deselectedMat;
		badges.appearance.material = this.deselectedMat;
		if (dbUser) {
			participate.appearance.material = this.selectedMat;
			if (dbUser.presentation_mode === PresentationMode.None) {
				noDisplay.appearance.material = this.selectedMat;
			} else if (dbUser.presentation_mode === PresentationMode.Count) {
				numbers.appearance.material = this.selectedMat;
			} else if (dbUser.presentation_mode === PresentationMode.Badges) {
				badges.appearance.material = this.selectedMat;
			}
		}

		// create animations
		const menuOpen = await this.menuOpenAnimData.bind({
			menuRoot, menu, participate, noDisplay, numbers, badges, adjustFit
		});
		const menuClose = await this.menuCloseAnimData.bind({
			menuRoot, menu, participate, noDisplay, numbers, badges, adjustFit
		});

		// create hover labels
		const labelTemplate: Partial<MRE.TextLike> = {
			height: 0.06,
			anchor: MRE.TextAnchorLocation.MiddleCenter,
			justify: MRE.TextJustify.Center,
			color: MRE.Color3.FromHexString("#dbadba")
		};
		const menuLabel = menu.findChildrenByName("Label", false)[0];
		const participateLabel = participate.findChildrenByName("Label.001", false)[0];
		const noDisplayLabel = noDisplay.findChildrenByName("Label.002", false)[0];
		const numbersLabel = numbers.findChildrenByName("Label.003", false)[0];
		const badgesLabel = badges.findChildrenByName("Label.004", false)[0];
		const adjustFitLabel = adjustFit.findChildrenByName("Label.005", false)[0];
		menuLabel.enableText(labelTemplate);
		participateLabel.enableText(labelTemplate);
		noDisplayLabel.enableText(labelTemplate);
		numbersLabel.enableText(labelTemplate);
		badgesLabel.enableText(labelTemplate);
		adjustFitLabel.enableText(labelTemplate);

		// save out important references
		const menuState: MenuState = {
			dbUser,
			showing: false,
			menuActor: menu,
			participateActor: participate,
			noDisplayActor: noDisplay,
			numbersActor: numbers,
			badgesActor: badges,
			menuOpenAnim: menuOpen,
			menuCloseAnim: menuClose
		};
		this.menuStates.set(userId, menuState);

		// add colliders
		menu.setCollider(MRE.ColliderType.Box, false, { x: 0.27, y: 0.01, z: 0.27 });
		participate.setCollider(MRE.ColliderType.Box, false, { x: 0.27, y: 0.01, z: 0.27 });
		noDisplay.setCollider(MRE.ColliderType.Box, false, { x: 0.27, y: 0.01, z: 0.27 });
		numbers.setCollider(MRE.ColliderType.Box, false, { x: 0.27, y: 0.01, z: 0.27 });
		badges.setCollider(MRE.ColliderType.Box, false, { x: 0.27, y: 0.01, z: 0.27 });
		adjustFitTighter.setCollider(MRE.ColliderType.Box, false,
			{ x: 0.27, y: 0.01, z: 0.135 }, { x: 0, y: 0, z: 0.0675 });
		adjustFitLooser.setCollider(MRE.ColliderType.Box, false,
			{ x: 0.27, y: 0.01, z: 0.135 }, { x: 0, y: 0, z: -0.0675 });

		// add button behaviors
		const menuBehavior = menu.setBehavior(MRE.ButtonBehavior);
		const participateBehavior = participate.setBehavior(MRE.ButtonBehavior);
		const noDisplayBehavior = noDisplay.setBehavior(MRE.ButtonBehavior);
		const numbersBehavior = numbers.setBehavior(MRE.ButtonBehavior);
		const badgesBehavior = badges.setBehavior(MRE.ButtonBehavior);
		const adjustFitTighterBehavior = adjustFitTighter.setBehavior(MRE.ButtonBehavior);
		const adjustFitLooserBehavior = adjustFitLooser.setBehavior(MRE.ButtonBehavior);

		// add hover states
		menuBehavior
			.onHover('enter', () => menuLabel.text.contents = "RP Menu")
			.onHover('exit', () => menuLabel.text.contents = "");
		participateBehavior
			.onHover('enter', () => {
				if (menuState.showing) { participateLabel.text.contents = "Participate"; } })
			.onHover('exit', () => {
				if (menuState.showing) { participateLabel.text.contents = ""; } });
		noDisplayBehavior
			.onHover('enter', () => {
				if (menuState.showing) { noDisplayLabel.text.contents = "Show: None"; } })
			.onHover('exit', () => {
				if (menuState.showing) { noDisplayLabel.text.contents = ""; } });
		numbersBehavior
			.onHover('enter', () => {
				if (menuState.showing) { numbersLabel.text.contents = "Show: Events"; } })
			.onHover('exit', () => {
				if (menuState.showing) { numbersLabel.text.contents = ""; } });
		badgesBehavior
			.onHover('enter', () => {
				if (menuState.showing) { badgesLabel.text.contents = "Show: Badges"; } })
			.onHover('exit', () => {
				if (menuState.showing) { badgesLabel.text.contents = ""; } });
		adjustFitTighterBehavior
			.onHover('enter', () => {
				if (menuState.showing) { adjustFitLabel.text.contents = "Adjust Fit:\nTighter"; }})
			.onHover('exit', () => {
				if (menuState.showing) { adjustFitLabel.text.contents = ""; } });
		adjustFitLooserBehavior
			.onHover('enter', () => {
				if (menuState.showing) { adjustFitLabel.text.contents = "Adjust Fit:\nLooser"; }})
			.onHover('exit', () => {
				if (menuState.showing) { adjustFitLabel.text.contents = ""; } });

		// add click handlers
		const logError = (err: string) => MRE.log.error('app', err);
		menuBehavior.onClick(user => this.onMenuClick(user));
		participateBehavior.onClick(user => this.onParticipateClick(user).catch(logError));
		noDisplayBehavior.onClick(user => this.onNoDisplayClick(user).catch(logError));
		numbersBehavior.onClick(user => this.onNumbersClick(user).catch(logError));
		badgesBehavior.onClick(user => this.onBadgesClick(user).catch(logError));
		adjustFitLooserBehavior.onClick(user => this.onAdjustFit(user, 1).catch(logError));
		adjustFitTighterBehavior.onClick(user => this.onAdjustFit(user, -1).catch(logError));
	}

	private onMenuClick(user: MRE.User) {
		const menuState = this.menuStates.get(user.id);
		if (!menuState.showing) {
			menuState.showing = true;
			menuState.menuActor.appearance.material = this.selectedMat;
			menuState.menuActor.targetingAnimationsByName.get("menuOpen").play();
		} else {
			menuState.showing = false;
			menuState.menuActor.appearance.material = this.deselectedMat;
			menuState.menuActor.targetingAnimationsByName.get("menuClose").play();
		}
	}

	private async onParticipateClick(user: MRE.User) {
		const menuState = this.menuStates.get(user.id);
		if (!menuState.dbUser) {
			const confirm = await user.prompt(
				"You are opting into attendance tracking. Unlock rewards for coming to lots of Rocket Party events!");
			if (!confirm.submitted) { return; }

			menuState.dbUser = new DbUser(user.id, user.name, PresentationMode.Badges, 0);
			menuState.participateActor.appearance.material = this.selectedMat;
			menuState.badgesActor.appearance.material = this.selectedMat;
			await this.app.db.updateUser(menuState.dbUser);
			await this.app.awardBadge(user);
		} else {
			const confirm = await user.prompt(
				"You are opting out of attendance tracking. You will lose any rewards you've unlocked!");
			if (!confirm.submitted) { return; }

			menuState.dbUser = null;
			menuState.participateActor.appearance.material = this.deselectedMat;
			menuState.noDisplayActor.appearance.material = this.deselectedMat;
			menuState.numbersActor.appearance.material = this.deselectedMat;
			menuState.badgesActor.appearance.material = this.deselectedMat;
			await this.app.db.deleteUser(user.id);
		}

		await this.app.displayBadges(user.id, menuState.dbUser);
	}

	private async onNoDisplayClick(user: MRE.User) {
		const menuState = this.menuStates.get(user.id);
		if (!menuState.dbUser) { return; }

		menuState.noDisplayActor.appearance.material = this.selectedMat;
		menuState.numbersActor.appearance.material = this.deselectedMat;
		menuState.badgesActor.appearance.material = this.deselectedMat;
		menuState.dbUser.name = user.name;
		menuState.dbUser.presentation_mode = PresentationMode.None;
		await this.app.db.updateUser(menuState.dbUser);
		await this.app.displayBadges(user.id, menuState.dbUser);
	}

	private async onNumbersClick(user: MRE.User) {
		const menuState = this.menuStates.get(user.id);
		if (!menuState.dbUser) { return; }

		menuState.noDisplayActor.appearance.material = this.deselectedMat;
		menuState.numbersActor.appearance.material = this.selectedMat;
		menuState.badgesActor.appearance.material = this.deselectedMat;
		menuState.dbUser.name = user.name;
		menuState.dbUser.presentation_mode = PresentationMode.Count;
		await this.app.db.updateUser(menuState.dbUser);
		await this.app.displayBadges(user.id, menuState.dbUser);
	}

	private async onBadgesClick(user: MRE.User) {
		const menuState = this.menuStates.get(user.id);
		if (!menuState.dbUser) { return; }

		menuState.noDisplayActor.appearance.material = this.deselectedMat;
		menuState.numbersActor.appearance.material = this.deselectedMat;
		menuState.badgesActor.appearance.material = this.selectedMat;
		menuState.dbUser.name = user.name;
		menuState.dbUser.presentation_mode = PresentationMode.Badges;
		await this.app.db.updateUser(menuState.dbUser);
		await this.app.displayBadges(user.id, menuState.dbUser);
	}

	private async onAdjustFit(user: MRE.User, increment: number) {
		const menuState = this.menuStates.get(user.id);
		if (!menuState.dbUser) { return; }

		menuState.dbUser.name = user.name;
		menuState.dbUser.fit = Math.max(-10, Math.min(10, menuState.dbUser.fit + increment));
		await this.app.db.updateUser(menuState.dbUser);
		await this.app.displayBadges(user.id, menuState.dbUser);
	}

	public detachFromUser(user: MRE.User) {
		const menuState = this.menuStates.get(user.id);
		menuState.menuActor.destroy();
		this.menuStates.delete(user.id);
	}
}

import { getWowheadLanguagePrefix } from '../constants/lang.js';
import { MAX_CHARACTER_LEVEL } from '../constants/mechanics.js';
import { ResourceType } from '../proto/api.js';
import { ActionID as ActionIdProto, ItemRandomSuffix, OtherAction } from '../proto/common.js';
import { IconData, UIItem as Item } from '../proto/ui.js';
import { Database } from './database.js';

// Used to filter action IDs by level
export interface ActionIdConfig {
	id: number;
	minLevel?: number;
	maxLevel?: number;
}

// Uniquely identifies a specific item / spell / thing in WoW. This object is immutable.
export class ActionId {
	readonly itemId: number;
	readonly randomSuffixId: number;
	readonly spellId: number;
	readonly otherId: OtherAction;
	readonly tag: number;
	readonly rank: number;

	readonly baseName: string; // The name without any tag additions.
	readonly name: string;
	readonly iconUrl: string;

	private constructor(
		itemId: number,
		spellId: number,
		otherId: OtherAction,
		tag: number,
		baseName: string,
		name: string,
		iconUrl: string,
		rank: number,
		randomSuffixId?: number,
	) {
		this.itemId = itemId;
		this.randomSuffixId = randomSuffixId || 0;
		this.spellId = spellId;
		this.otherId = otherId;
		(this.rank = rank), (this.tag = tag);

		switch (otherId) {
			case OtherAction.OtherActionNone:
				break;
			case OtherAction.OtherActionWait:
				baseName = 'Wait';
				iconUrl = 'https://wow.zamimg.com/images/wow/icons/large/inv_misc_pocketwatch_01.jpg';
				break;
			case OtherAction.OtherActionManaRegen:
				name = 'Mana Tick';
				iconUrl = resourceTypeToIcon[ResourceType.ResourceTypeMana];
				if (tag == 1) {
					name += ' (Casting)';
				} else if (tag == 2) {
					name += ' (Not Casting)';
				}
				break;
			case OtherAction.OtherActionEnergyRegen:
				baseName = 'Energy Tick';
				iconUrl = resourceTypeToIcon[ResourceType.ResourceTypeEnergy];
				break;
			case OtherAction.OtherActionFocusRegen:
				baseName = 'Focus Tick';
				iconUrl = resourceTypeToIcon[ResourceType.ResourceTypeFocus];
				break;
			case OtherAction.OtherActionManaGain:
				baseName = 'Mana Gain';
				iconUrl = resourceTypeToIcon[ResourceType.ResourceTypeMana];
				break;
			case OtherAction.OtherActionRageGain:
				baseName = 'Rage Gain';
				iconUrl = resourceTypeToIcon[ResourceType.ResourceTypeRage];
				break;
			case OtherAction.OtherActionAttack:
				name = 'Attack';
				iconUrl = 'https://wow.zamimg.com/images/wow/icons/large/inv_sword_04.jpg';
				if (tag == 1) {
					name += ' (Main Hand)';
				} else if (tag == 2) {
					name += ' (Off Hand)';
				}
				break;
			case OtherAction.OtherActionShoot:
				name = 'Shoot';
				iconUrl = 'https://wow.zamimg.com/images/wow/icons/large/ability_marksmanship.jpg';
				break;
			case OtherAction.OtherActionMove:
				name = 'Move';
				iconUrl = 'https://wow.zamimg.com/images/wow/icons/large/inv_boots_02.jpg';
				break;
			case OtherAction.OtherActionPet:
				break;
			case OtherAction.OtherActionRefund:
				baseName = 'Refund';
				iconUrl = 'https://wow.zamimg.com/images/wow/icons/large/inv_misc_coin_01.jpg';
				break;
			case OtherAction.OtherActionDamageTaken:
				baseName = 'Damage Taken';
				iconUrl = 'https://wow.zamimg.com/images/wow/icons/large/inv_sword_04.jpg';
				break;
			case OtherAction.OtherActionHealingModel:
				baseName = 'Incoming HPS';
				iconUrl = 'https://wow.zamimg.com/images/wow/icons/large/spell_holy_renew.jpg';
				break;
			case OtherAction.OtherActionPotion:
				baseName = 'Potion';
				iconUrl = 'https://wow.zamimg.com/images/wow/icons/large/inv_alchemy_elixir_04.jpg';
				break;
		}
		this.baseName = baseName;
		this.name = name || baseName;
		this.iconUrl = iconUrl;
		this.name += rank ? ` (Rank ${rank})` : '';
	}

	anyId(): number {
		return this.itemId || this.spellId || this.otherId;
	}

	equals(other: ActionId): boolean {
		return this.equalsIgnoringTag(other) && this.tag == other.tag;
	}

	equalsIgnoringTag(other: ActionId): boolean {
		return this.itemId == other.itemId && this.randomSuffixId == other.randomSuffixId && this.spellId == other.spellId && this.otherId == other.otherId;
	}

	setBackground(elem: HTMLElement) {
		if (this.iconUrl) {
			elem.style.backgroundImage = `url('${this.iconUrl}')`;
		}
	}

	static makeItemUrl(id: number, randomSuffixId?: number): string {
		const langPrefix = getWowheadLanguagePrefix();
		return `https://wowhead.com/classic/${langPrefix}item=${id}?lvl=${MAX_CHARACTER_LEVEL}?rand=${randomSuffixId || 0}`;
	}
	static makeSpellUrl(id: number): string {
		const langPrefix = getWowheadLanguagePrefix();
		return `https://wowhead.com/classic/${langPrefix}spell=${id}`;
	}
	static makeQuestUrl(id: number): string {
		const langPrefix = getWowheadLanguagePrefix();
		return `https://wowhead.com/classic/${langPrefix}quest=${id}`;
	}
	static makeNpcUrl(id: number): string {
		const langPrefix = getWowheadLanguagePrefix();
		return `https://wowhead.com/classic/${langPrefix}npc=${id}`;
	}
	static makeZoneUrl(id: number): string {
		const langPrefix = getWowheadLanguagePrefix();
		return `https://wowhead.com/classic/${langPrefix}zone=${id}`;
	}

	setWowheadHref(elem: HTMLAnchorElement) {
		if (this.itemId) {
			elem.href = ActionId.makeItemUrl(this.itemId, this.randomSuffixId);
		} else if (this.spellId) {
			elem.href = ActionId.makeSpellUrl(this.spellId);
		}
	}

	setBackgroundAndHref(elem: HTMLAnchorElement) {
		this.setBackground(elem);
		this.setWowheadHref(elem);
	}

	async fillAndSet(elem: HTMLAnchorElement, setHref: boolean, setBackground: boolean): Promise<ActionId> {
		const filled = await this.fill();
		if (setHref) {
			filled.setWowheadHref(elem);
		}
		if (setBackground) {
			filled.setBackground(elem);
		}
		return filled;
	}

	// Returns an ActionId with the name and iconUrl fields filled.
	// playerIndex is the optional index of the player to whom this ID corresponds.
	async fill(playerIndex?: number): Promise<ActionId> {
		if (this.name || this.iconUrl) {
			return this;
		}

		if (this.otherId) {
			return this;
		}

		const tooltipData = await ActionId.getTooltipData(this);

		const baseName = tooltipData['name'];
		let name = baseName;
		switch (baseName) {
			case 'Arcane Blast':
				if (this.tag == 1) {
					name += ' (No Stacks)';
				} else if (this.tag == 2) {
					name += ` (1 Stack)`;
				} else if (this.tag > 2) {
					name += ` (${this.tag - 1} Stacks)`;
				}
				break;
			// Arcane Missiles hits are a separate spell and have to use a tag to differentiate from the cast
			case 'Arcane Missiles':
			// Balefire Bolt's aura uses the same spell ID as the cast
			case 'Balefire Bolt':
				break;
			case 'Berserking':
				if (this.tag != 0) name = `${name} (${this.tag * 5}%)`;
				break;
			case 'Explosive Trap':
				if (this.tag == 1) {
					name += ' (Weaving)';
				}
				break;
			case 'Hot Streak':
				if (this.tag) name = 'Heating Up';
				break;
			// DoT then Explode Spells
			case 'Living Bomb':
			case 'Seed of Corruption':
				if (this.tag == 0) name = `${name} (DoT)`;
				else if (this.tag == 1) name = `${name} (Explosion)`;
				break;
			// Burn Spells
			case 'Fireball':
			case 'Frostfire Bolt':
			case 'Pyroblast':
				if (this.tag == 1) name = `${name} (DoT)`;
				break;
			// Channeled Tick Spells
			case 'Evocation':
			case 'Mind Flay':
			case 'Mind Sear':
				if (this.tag > 0) name = `${name} (${this.tag} Tick)`;
				break;
			case 'Shattering Throw':
				if (this.tag === playerIndex) {
					name += ` (self)`;
				}
				break;
			// Combo Point Spenders
			case 'Envenom':
			case 'Eviscerate':
			case 'Expose Armor':
			case 'Rupture':
			case 'Slice and Dice':
				if (this.tag) name += ` (${this.tag} CP)`;
				break;
			case 'Deadly Poison':
			case 'Deadly Poison II':
			case 'Deadly Poison III':
			case 'Deadly Poison IV':
			case 'Deadly Poison V':
			case 'Instant Poison':
			case 'Instant Poison II':
			case 'Instant Poison III':
			case 'Instant Poison IV':
			case 'Instant Poison V':
			case 'Instant Poison VI':
			case 'Wound Poison':
				if (this.tag == 1) {
					name += ' (Shiv)';
				} else if (this.tag == 2) {
					name += ' (Deadly Brew)';
				} else if (this.tag == 100) {
					name += ' (Tick)';
				}
				break;
			case 'Saber Slash':
				if (this.tag == 100) {
					name += ' (Tick)';
				}
				break;
			// Dual-hit MH/OH spells
			case 'Mutilate':
			case 'Stormstrike':
				if (this.tag == 1) {
					name = `${name} (Main Hand)`;
				} else if (this.tag == 2) {
					name = `${name} (Off Hand)`;
				}
				break;
			// Shaman Overload + Maelstrom Weapon
			case 'Chain Lightning':
			case 'Lava Burst':
			case 'Lightning Bolt':
				if (this.tag == 6) {
					name = `${name} (Overload)`;
				} else if (this.tag) {
					name = `${name} (${this.tag} MW)`;
				}
				break;
			case 'Holy Shield':
				if (this.tag == 1) {
					name += ' (Proc)';
				}
				break;
			case 'Righteous Vengeance':
				if (this.tag == 1) {
					name += ' (Application)';
				} else if (this.tag == 2) {
					name += ' (DoT)';
				}
				break;
			case 'Holy Vengeance':
				if (this.tag == 1) {
					name += ' (Application)';
				} else if (this.tag == 2) {
					name += ' (DoT)';
				}
				break;
			// For targetted buffs, tag is the source player's raid index or -1 if none.
			case 'Bloodlust':
			case 'Ferocious Inspiration':
			case 'Innervate':
			case 'Focus Magic':
			case 'Mana Tide Totem':
			case 'Power Infusion':
				if (this.tag != -1) {
					if (this.tag === playerIndex || playerIndex == undefined) {
						name += ` (self)`;
					} else {
						name += ` (from #${this.tag + 1})`;
					}
				} else {
					name += ' (raid)';
				}
				break;
			case 'Darkmoon Card: Crusade':
				if (this.tag == 1) {
					name += ' (Melee)';
				} else if (this.tag == 2) {
					name += ' (Spell)';
				}
				break;
			case 'Lightning Speed':
			case 'Windfury Weapon':
			case 'Berserk':
				if (this.tag == 1) {
					name += ' (Main Hand)';
				} else if (this.tag == 2) {
					name += ' (Off Hand)';
				}
				break;
			case 'Battle Shout':
				if (this.tag == 1) {
					name += ' (Snapshot)';
				}
				break;
			case 'Heroic Strike':
			case 'Cleave':
			case 'Maul':
				if (this.tag == 1) {
					name += ' (Queue)';
				}
				break;
			case 'Raptor Strike':
				if (this.tag == 0) {
					name += ' (Main Hand)';
				} else if (this.tag == 1) {
					name += ' (Queue)';
				} else if (this.tag == 2) {
					name += ' (Off Hand)';
				}
				break;
			case 'Carve':
			case 'Whirlwind':
				if (this.tag == 1) {
					name += ' (OH)';
				}
				break;
			case 'Thunderfury':
				if (this.tag == 1) {
					name += ' (ST)';
				} else if (this.tag == 2) {
					name += ' (MT)';
				}
				break;
			default:
				if (this.tag) {
					name += ' (??)';
				}
				break;
		}

		const idString = this.toProtoString();
		const iconOverrideId = idOverrides[idString] || null;

		let iconUrl = ActionId.makeIconUrl(tooltipData['icon']);
		if (iconOverrideId) {
			const overrideTooltipData = await ActionId.getTooltipData(iconOverrideId);
			iconUrl = ActionId.makeIconUrl(overrideTooltipData['icon']);
		}

		return new ActionId(this.itemId, this.spellId, this.otherId, this.tag, baseName, name, iconUrl, this.rank || tooltipData['rank'], this.randomSuffixId);
	}

	toString(): string {
		return this.toStringIgnoringTag() + (this.tag ? '-' + this.tag : '');
	}

	toStringIgnoringTag(): string {
		if (this.itemId) {
			return 'item-' + this.itemId;
		} else if (this.spellId) {
			return 'spell-' + this.spellId;
		} else if (this.otherId) {
			return 'other-' + this.otherId;
		} else {
			throw new Error('Empty action id!');
		}
	}

	toProto(): ActionIdProto {
		const protoId = ActionIdProto.create({
			tag: this.tag,
		});

		if (this.itemId) {
			protoId.rawId = {
				oneofKind: 'itemId',
				itemId: this.itemId,
			};
		} else if (this.spellId) {
			protoId.rawId = {
				oneofKind: 'spellId',
				spellId: this.spellId,
			};
			protoId.rank = this.rank;
		} else if (this.otherId) {
			protoId.rawId = {
				oneofKind: 'otherId',
				otherId: this.otherId,
			};
		}

		return protoId;
	}

	toProtoString(): string {
		return ActionIdProto.toJsonString(this.toProto());
	}

	withoutTag(): ActionId {
		return new ActionId(this.itemId, this.spellId, this.otherId, 0, this.baseName, this.baseName, this.iconUrl, this.rank, this.randomSuffixId);
	}

	static fromEmpty(): ActionId {
		return new ActionId(0, 0, OtherAction.OtherActionNone, 0, '', '', '', 0);
	}

	static fromItemId(itemId: number, tag?: number, randomSuffixId?: number): ActionId {
		return new ActionId(itemId, 0, OtherAction.OtherActionNone, tag || 0, '', '', '', 0, randomSuffixId || 0);
	}

	static fromSpellId(spellId: number, rank = 0, tag?: number): ActionId {
		return new ActionId(0, spellId, OtherAction.OtherActionNone, tag || 0, '', '', '', rank);
	}

	static fromOtherId(otherId: OtherAction, tag?: number): ActionId {
		return new ActionId(0, 0, otherId, tag || 0, '', '', '', 0);
	}

	static fromPetName(petName: string): ActionId {
		return petNameToActionId[petName] || new ActionId(0, 0, OtherAction.OtherActionPet, 0, petName, petName, petNameToIcon[petName] || '', 0);
	}

	static fromItem(item: Item): ActionId {
		return ActionId.fromItemId(item.id);
	}

	static fromRandomSuffix(item: Item, randomSuffix: ItemRandomSuffix): ActionId {
		return ActionId.fromItemId(item.id, 0, randomSuffix.id);
	}

	static fromProto(protoId: ActionIdProto): ActionId {
		if (protoId.rawId.oneofKind == 'spellId') {
			return ActionId.fromSpellId(protoId.rawId.spellId, protoId.rank, protoId.tag);
		} else if (protoId.rawId.oneofKind == 'itemId') {
			return ActionId.fromItemId(protoId.rawId.itemId, protoId.tag);
		} else if (protoId.rawId.oneofKind == 'otherId') {
			return ActionId.fromOtherId(protoId.rawId.otherId, protoId.tag);
		} else {
			return ActionId.fromEmpty();
		}
	}

	private static readonly logRegex = /{((SpellID)|(ItemID)|(OtherID)): (\d+)(, Tag: (-?\d+))?}/;
	private static readonly logRegexGlobal = new RegExp(ActionId.logRegex, 'g');
	private static fromMatch(match: RegExpMatchArray): ActionId {
		const idType = match[1];
		const id = parseInt(match[5]);
		return new ActionId(
			idType == 'ItemID' ? id : 0,
			idType == 'SpellID' ? id : 0,
			idType == 'OtherID' ? id : 0,
			match[7] ? parseInt(match[7]) : 0,
			'',
			'',
			'',
			0,
		);
	}
	static fromLogString(str: string): ActionId {
		const match = str.match(ActionId.logRegex);
		if (match) {
			return ActionId.fromMatch(match);
		} else {
			console.warn('Failed to parse action id from log: ' + str);
			return ActionId.fromEmpty();
		}
	}

	static async replaceAllInString(str: string): Promise<string> {
		const matches = [...str.matchAll(ActionId.logRegexGlobal)];

		const replaceData = await Promise.all(
			matches.map(async match => {
				const actionId = ActionId.fromMatch(match);
				const filledId = await actionId.fill();
				return {
					firstIndex: match.index || 0,
					len: match[0].length,
					actionId: filledId,
				};
			}),
		);

		// Loop in reverse order so we can greedily apply the string replacements.
		for (let i = replaceData.length - 1; i >= 0; i--) {
			const data = replaceData[i];
			str = str.substring(0, data.firstIndex) + data.actionId.name + str.substring(data.firstIndex + data.len);
		}

		return str;
	}

	private static makeIconUrl(iconLabel: string): string {
		return `https://wow.zamimg.com/images/wow/icons/large/${iconLabel}.jpg`;
	}

	static async getTooltipData(actionId: ActionId): Promise<IconData> {
		if (actionId.itemId) {
			return await Database.getItemIconData(actionId.itemId);
		} else {
			return await Database.getSpellIconData(actionId.spellId);
		}
	}
}

// Some items/spells have weird icons, so use this to show a different icon instead.
const idOverrides: Record<string, ActionId> = {};
idOverrides[ActionId.fromSpellId(37212).toProtoString()] = ActionId.fromItemId(29035); // Improved Wrath of Air Totem
idOverrides[ActionId.fromSpellId(37223).toProtoString()] = ActionId.fromItemId(29040); // Improved Strength of Earth Totem
idOverrides[ActionId.fromSpellId(37447).toProtoString()] = ActionId.fromItemId(30720); // Serpent-Coil Braid
idOverrides[ActionId.fromSpellId(37443).toProtoString()] = ActionId.fromItemId(30196); // Robes of Tirisfal (4pc bonus)

export const defaultTargetIcon = 'https://wow.zamimg.com/images/wow/icons/large/spell_shadow_metamorphosis.jpg';

const petNameToActionId: Record<string, ActionId> = {
	'Gnomish Flame Turret': ActionId.fromItemId(23841),
	'Mirror Image': ActionId.fromSpellId(55342),
	'Water Elemental': ActionId.fromSpellId(31687),
	'Greater Fire Elemental': ActionId.fromSpellId(2894),
	Shadowfiend: ActionId.fromSpellId(401977),
	Homunculi: ActionId.fromSpellId(402799),
	'Spirit Wolf 1': ActionId.fromSpellId(51533),
	'Spirit Wolf 2': ActionId.fromSpellId(51533),
	'Rune Weapon': ActionId.fromSpellId(49028),
	Bloodworm: ActionId.fromSpellId(50452),
	Gargoyle: ActionId.fromSpellId(49206),
	Ghoul: ActionId.fromSpellId(46584),
	'Army of the Dead': ActionId.fromSpellId(42650),
	Valkyr: ActionId.fromSpellId(71844),
};

// https://wowhead.com/classic/hunter-pets
const petNameToIcon: Record<string, string> = {
	Bat: 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_bat.jpg',
	Bear: 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_bear.jpg',
	'Bird of Prey': 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_owl.jpg',
	Boar: 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_boar.jpg',
	'Carrion Bird': 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_vulture.jpg',
	Cat: 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_cat.jpg',
	Chimaera: 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_chimera.jpg',
	'Core Hound': 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_corehound.jpg',
	Crab: 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_crab.jpg',
	Crocolisk: 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_crocolisk.jpg',
	Devilsaur: 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_devilsaur.jpg',
	Dragonhawk: 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_dragonhawk.jpg',
	Felguard: 'https://wow.zamimg.com/images/wow/icons/large/spell_shadow_summonfelguard.jpg',
	Felhunter: 'https://wow.zamimg.com/images/wow/icons/large/spell_shadow_summonfelhunter.jpg',
	Infernal: 'https://wow.zamimg.com/images/wow/icons/large/spell_shadow_summoninfernal.jpg',
	Gorilla: 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_gorilla.jpg',
	Hyena: 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_hyena.jpg',
	Imp: 'https://wow.zamimg.com/images/wow/icons/large/spell_shadow_summonimp.jpg',
	'Mirror Image': 'https://wow.zamimg.com/images/wow/icons/large/spell_magic_lesserinvisibilty.jpg',
	Moth: 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_moth.jpg',
	'Nether Ray': 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_netherray.jpg',
	Owl: 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_owl.jpg',
	Raptor: 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_raptor.jpg',
	Ravager: 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_ravager.jpg',
	Rhino: 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_rhino.jpg',
	Scorpid: 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_scorpid.jpg',
	Serpent: 'https://wow.zamimg.com/images/wow/icons/medium/spell_nature_guardianward.jpg',
	Silithid: 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_silithid.jpg',
	Spider: 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_spider.jpg',
	'Spirit Beast': 'https://wow.zamimg.com/images/wow/icons/medium/ability_druid_primalprecision.jpg',
	'Spore Bat': 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_sporebat.jpg',
	Succubus: 'https://wow.zamimg.com/images/wow/icons/large/spell_shadow_summonsuccubus.jpg',
	Tallstrider: 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_tallstrider.jpg',
	Turtle: 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_turtle.jpg',
	'Warp Stalker': 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_warpstalker.jpg',
	Wasp: 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_wasp.jpg',
	'Wind Serpent': 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_windserpent.jpg',
	Wolf: 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_wolf.jpg',
	Worm: 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_pet_worm.jpg',
};

export function getPetIconFromName(name: string): string | ActionId | undefined {
	return petNameToActionId[name] || petNameToIcon[name];
}

export const resourceTypeToIcon: Record<ResourceType, string> = {
	[ResourceType.ResourceTypeNone]: '',
	[ResourceType.ResourceTypeHealth]: 'https://wow.zamimg.com/images/wow/icons/medium/inv_elemental_mote_life01.jpg',
	[ResourceType.ResourceTypeMana]: 'https://wow.zamimg.com/images/wow/icons/medium/inv_elemental_mote_mana.jpg',
	[ResourceType.ResourceTypeEnergy]: 'https://wow.zamimg.com/images/wow/icons/medium/spell_shadow_shadowworddominate.jpg',
	[ResourceType.ResourceTypeRage]: 'https://wow.zamimg.com/images/wow/icons/medium/spell_misc_emotionangry.jpg',
	[ResourceType.ResourceTypeComboPoints]: 'https://wow.zamimg.com/images/wow/icons/medium/inv_mace_2h_pvp410_c_01.jpg',
	[ResourceType.ResourceTypeFocus]: 'https://wow.zamimg.com/images/wow/icons/medium/ability_hunter_focusfire.jpg',
};

import { Player } from '../../player';
import {
	AgilityElixir,
	AtalAi,
	Class,
	Conjured,
	Consumes,
	EnchantedSigil,
	Explosive,
	FirePowerBuff,
	Flask,
	Food,
	FrostPowerBuff,
	ItemSlot,
	Potions,
	Profession,
	ShadowPowerBuff,
	Spec,
	SpellPowerBuff,
	Stat,
	StrengthBuff,
	WeaponImbue,
	WeaponType,
} from '../../proto/common';
import { ActionId } from '../../proto_utils/action_id';
import { isBluntWeaponType, isSharpWeaponType } from '../../proto_utils/utils';
import { EventID, TypedEvent } from '../../typed_event';
import { IconEnumPickerDirection, IconEnumValueConfig } from '../icon_enum_picker';
import { makeBooleanConsumeInput, makeEnumConsumeInput } from '../icon_inputs';
import * as InputHelpers from '../input_helpers';
import { DeadlyPoisonWeaponImbue, InstantPoisonWeaponImbue, WoundPoisonWeaponImbue } from './rogue_imbues';
import { FlametongueWeaponImbue, FrostbrandWeaponImbue, RockbiterWeaponImbue, WindfuryWeaponImbue } from './shaman_imbues';
import { ActionInputConfig, ItemStatOption } from './stat_options';

export interface ConsumableInputConfig<T> extends ActionInputConfig<T> {
	value: T;
}

export interface ConsumableStatOption<T> extends ItemStatOption<T> {
	config: ConsumableInputConfig<T>;
}

export interface ConsumeInputFactoryArgs<T extends number> {
	consumesFieldName: keyof Consumes;
	// Additional callback if logic besides syncing consumes is required
	onSet?: (eventactionId: EventID, player: Player<any>, newValue: T) => void;
	showWhen?: (player: Player<any>) => boolean;
}

function makeConsumeInputFactory<T extends number>(
	args: ConsumeInputFactoryArgs<T>,
): (options: ConsumableStatOption<T>[], tooltip?: string) => InputHelpers.TypedIconEnumPickerConfig<Player<any>, T> {
	return (options: ConsumableStatOption<T>[], tooltip?: string) => {
		return {
			type: 'iconEnum',
			tooltip: tooltip,
			numColumns: options.length > 11 ? 4 : options.length > 8 ? 3 : options.length > 5 ? 2 : 1,
			values: [{ value: 0 } as unknown as IconEnumValueConfig<Player<any>, T>].concat(
				options.map(option => {
					return {
						actionId: option.config.actionId,
						value: option.config.value,
						showWhen: (player: Player<any>) => !option.config.showWhen || option.config.showWhen(player),
					} as IconEnumValueConfig<Player<any>, T>;
				}),
			),
			equals: (a: T, b: T) => a == b,
			zeroValue: 0 as T,
			changedEvent: (player: Player<any>) =>
				TypedEvent.onAny([player.consumesChangeEmitter, player.levelChangeEmitter, player.gearChangeEmitter, player.professionChangeEmitter]),
			showWhen: (player: Player<any>) => !args.showWhen || args.showWhen(player),
			getValue: (player: Player<any>) => player.getConsumes()[args.consumesFieldName] as T,
			setValue: (eventID: EventID, player: Player<any>, newValue: number) => {
				const newConsumes = player.getConsumes();

				if (newConsumes[args.consumesFieldName] === newValue) {
					return;
				}

				(newConsumes[args.consumesFieldName] as number) = newValue;
				TypedEvent.freezeAllAndDo(() => {
					player.setConsumes(eventID, newConsumes);
					if (args.onSet) {
						args.onSet(eventID, player, newValue as T);
					}
				});
			},
		};
	};
}

///////////////////////////////////////////////////////////////////////////
//                                 CONJURED
///////////////////////////////////////////////////////////////////////////

export const ConjuredMinorRecombobulator: ConsumableInputConfig<Conjured> = {
	actionId: () => ActionId.fromItemId(4381),
	value: Conjured.ConjuredMinorRecombobulator,
	showWhen: (player: Player<any>) => player.getGear().hasTrinket(4381),
};
export const ConjuredDemonicRune: ConsumableInputConfig<Conjured> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 12662, minLevel: 40 }]),
	value: Conjured.ConjuredDemonicRune,
};
export const ConjuredRogueThistleTea: ConsumableInputConfig<Conjured> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 7676, minLevel: 25 }]),
	value: Conjured.ConjuredRogueThistleTea,
	showWhen: player => player.getClass() == Class.ClassRogue,
};
export const ConjuredDruidCatnip: ConsumableInputConfig<Conjured> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 213407, minLevel: 20 }]),
	value: Conjured.ConjuredDruidCatnip,
	showWhen: player => player.getClass() == Class.ClassDruid,
};

export const CONJURED_CONFIG: ConsumableStatOption<Conjured>[] = [
	{ config: ConjuredMinorRecombobulator, stats: [Stat.StatIntellect] },
	{ config: ConjuredDemonicRune, stats: [Stat.StatIntellect] },
	{ config: ConjuredRogueThistleTea, stats: [] },
	{ config: ConjuredDruidCatnip, stats: [] },
];

export const makeConjuredInput = makeConsumeInputFactory({ consumesFieldName: 'defaultConjured' });

///////////////////////////////////////////////////////////////////////////
//                        ATAL'AI POTIONS
///////////////////////////////////////////////////////////////////////////

export const AtalAiMojoOfWar: ConsumableInputConfig<AtalAi> = {
	actionId: () => ActionId.fromItemId(221196),
	value: AtalAi.AtalAiWar,
	showWhen: (player: Player<any>) => player.getLevel() == 50,
};

export const AtalAiMojoOfForbiddenMagic: ConsumableInputConfig<AtalAi> = {
	actionId: () => ActionId.fromItemId(221030),
	value: AtalAi.AtalAiForbiddenMagic,
	showWhen: (player: Player<any>) => player.getLevel() == 50,
};

export const AtalAiMojoOfLife: ConsumableInputConfig<AtalAi> = {
	actionId: () => ActionId.fromItemId(221311),
	value: AtalAi.AtalAiLife,
	showWhen: (player: Player<any>) => player.getLevel() == 50,
};

export const ATALAI_CONFIG: ConsumableStatOption<AtalAi>[] = [
	{ config: AtalAiMojoOfWar, stats: [Stat.StatAttackPower] },
	{ config: AtalAiMojoOfForbiddenMagic, stats: [Stat.StatSpellPower] },
	{ config: AtalAiMojoOfLife, stats: [Stat.StatHealingPower] },
];

export const makeAtalaiInput = makeConsumeInputFactory({ consumesFieldName: 'defaultAtalAi' });

///////////////////////////////////////////////////////////////////////////
//                             ENCHANTING SIGIL
///////////////////////////////////////////////////////////////////////////

export const EnchantedSigilInnovation: ConsumableInputConfig<EnchantedSigil> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 217308, minLevel: 40 }]),
	value: EnchantedSigil.InnovationSigil,
};

export const EnchantedSigilLivingDreams: ConsumableInputConfig<EnchantedSigil> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 221028, minLevel: 50 }]),
	value: EnchantedSigil.LivingDreamsSigil,
};

export const ENCHANTED_SIGIL_CONFIG: ConsumableStatOption<EnchantedSigil>[] = [
	{ config: EnchantedSigilLivingDreams, stats: [] },
	{ config: EnchantedSigilInnovation, stats: [] },
];

export const makeEncanthedSigilInput = makeConsumeInputFactory({
	consumesFieldName: 'enchantedSigil',
	showWhen: player => player.hasProfession(Profession.Enchanting),
});

///////////////////////////////////////////////////////////////////////////
//                                 EXPLOSIVES
///////////////////////////////////////////////////////////////////////////

export const ExplosiveSolidDynamite: ConsumableInputConfig<Explosive> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 10507, minLevel: 40 }]),
	showWhen: player => player.hasProfession(Profession.Engineering),
	value: Explosive.ExplosiveSolidDynamite,
};

export const ExplosiveGoblinLandMine: ConsumableInputConfig<Explosive> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 4395, minLevel: 40 }]),
	showWhen: player => player.hasProfession(Profession.Engineering),
	value: Explosive.ExplosiveGoblinLandMine,
};

export const ExplosiveDenseDynamite: ConsumableInputConfig<Explosive> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 18641, minLevel: 50 }]),
	showWhen: player => player.hasProfession(Profession.Engineering),
	value: Explosive.ExplosiveDenseDynamite,
};

export const ExplosiveThoriumGrenade: ConsumableInputConfig<Explosive> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 15993, minLevel: 50 }]),
	showWhen: player => player.hasProfession(Profession.Engineering),
	value: Explosive.ExplosiveThoriumGrenade,
};

export const ExplosiveEzThroRadiationBomb: ConsumableInputConfig<Explosive> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 215168, minLevel: 40 }]),
	value: Explosive.ExplosiveEzThroRadiationBomb,
};

export const ExplosiveHighYieldRadiationBomb: ConsumableInputConfig<Explosive> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 215127, minLevel: 40 }]),
	showWhen: player => player.hasProfession(Profession.Engineering),
	value: Explosive.ExplosiveHighYieldRadiationBomb,
};

export const EXPLOSIVES_CONFIG: ConsumableStatOption<Explosive>[] = [
	{ config: ExplosiveEzThroRadiationBomb, stats: [] },
	{ config: ExplosiveHighYieldRadiationBomb, stats: [] },
	{ config: ExplosiveSolidDynamite, stats: [] },
	{ config: ExplosiveDenseDynamite, stats: [] },
	{ config: ExplosiveThoriumGrenade, stats: [] },
	{ config: ExplosiveGoblinLandMine, stats: [] },
];

export const makeExplosivesInput = makeConsumeInputFactory({
	consumesFieldName: 'fillerExplosive',
	//showWhen: (player) => !!player.getProfessions().find(p => p == Profession.Engineering),
});

export const Sapper = makeBooleanConsumeInput({
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 10646, minLevel: 50 }]),
	fieldName: 'sapper',
	showWhen: player => player.hasProfession(Profession.Engineering),
});

///////////////////////////////////////////////////////////////////////////
//                                 FLASKS
///////////////////////////////////////////////////////////////////////////

// Original lvl 50 not obtainable in Phase 3
export const FlaskOfTheTitans: ConsumableInputConfig<Flask> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 13510, minLevel: 51 }]),
	value: Flask.FlaskOfTheTitans,
};
// Original lvl 50 not obtainable in Phase 3
export const FlaskOfDistilledWisdom: ConsumableInputConfig<Flask> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 13511, minLevel: 51 }]),
	value: Flask.FlaskOfDistilledWisdom,
};
// Original lvl 50 not obtainable in Phase 3
export const FlaskOfSupremePower: ConsumableInputConfig<Flask> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 13512, minLevel: 51 }]),
	value: Flask.FlaskOfSupremePower,
};
// Original lvl 50 not obtainable in Phase 3
export const FlaskOfChromaticResistance: ConsumableInputConfig<Flask> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 13513, minLevel: 51 }]),
	value: Flask.FlaskOfChromaticResistance,
};
export const FlaskOfRestlessDreams: ConsumableInputConfig<Flask> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 222952, minLevel: 50, maxLevel: 59 }]),
	value: Flask.FlaskOfRestlessDreams,
	showWhen: player => player.hasProfession(Profession.Alchemy),
};
export const FlaskOfEverlastingNightmares: ConsumableInputConfig<Flask> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 221024, minLevel: 50, maxLevel: 59 }]),
	value: Flask.FlaskOfEverlastingNightmares,
	showWhen: player => player.hasProfession(Profession.Alchemy),
};

export const FLASKS_CONFIG: ConsumableStatOption<Flask>[] = [
	{ config: FlaskOfTheTitans, stats: [Stat.StatStamina] },
	{ config: FlaskOfDistilledWisdom, stats: [Stat.StatMP5, Stat.StatSpellPower] },
	{ config: FlaskOfSupremePower, stats: [Stat.StatMP5, Stat.StatSpellPower] },
	{ config: FlaskOfChromaticResistance, stats: [Stat.StatStamina] },
	{ config: FlaskOfRestlessDreams, stats: [Stat.StatSpellPower] },
	{ config: FlaskOfEverlastingNightmares, stats: [Stat.StatAttackPower] },
];

export const makeFlasksInput = makeConsumeInputFactory({ consumesFieldName: 'flask' });

///////////////////////////////////////////////////////////////////////////
//                                 FOOD
///////////////////////////////////////////////////////////////////////////

export const DirgesKickChimaerokChops: ConsumableInputConfig<Food> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 21023, minLevel: 55 }]),
	value: Food.FoodDirgesKickChimaerokChops,
};
export const GrilledSquid: ConsumableInputConfig<Food> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 13928, minLevel: 50 }]),
	value: Food.FoodGrilledSquid,
};
// Original lvl 50 not obtainable in Phase 3
export const SmokedDesertDumpling: ConsumableInputConfig<Food> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 20452, minLevel: 51 }]),
	value: Food.FoodSmokedDesertDumpling,
};
// Original lvl 45 not obtainable in Phase 3
export const RunnTumTuberSurprise: ConsumableInputConfig<Food> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 18254, minLevel: 51 }]),
	value: Food.FoodRunnTumTuberSurprise,
};
export const BlessSunfruit: ConsumableInputConfig<Food> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 13810, minLevel: 45 }]),
	value: Food.FoodBlessSunfruit,
};
export const BlessedSunfruitJuice: ConsumableInputConfig<Food> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 13813, minLevel: 45 }]),
	value: Food.FoodBlessedSunfruitJuice,
};
export const NightfinSoup: ConsumableInputConfig<Food> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 13931, minLevel: 35 }]),
	value: Food.FoodNightfinSoup,
};
export const TenderWolfSteak: ConsumableInputConfig<Food> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 18045, minLevel: 40 }]),
	value: Food.FoodTenderWolfSteak,
};
export const SagefishDelight: ConsumableInputConfig<Food> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 21217, minLevel: 30 }]),
	value: Food.FoodSagefishDelight,
};
export const HotWolfRibs: ConsumableInputConfig<Food> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 13851, minLevel: 25 }]),
	value: Food.FoodHotWolfRibs,
};
export const SmokedSagefish: ConsumableInputConfig<Food> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 21072, minLevel: 10 }]),
	value: Food.FoodSmokedSagefish,
};

// Ordered by level
export const FOOD_CONFIG: ConsumableStatOption<Food>[] = [
	{ config: DirgesKickChimaerokChops, stats: [Stat.StatStamina] },
	{ config: GrilledSquid, stats: [Stat.StatAgility] },
	{ config: SmokedDesertDumpling, stats: [Stat.StatStrength] },
	{ config: RunnTumTuberSurprise, stats: [Stat.StatIntellect] },
	{ config: BlessSunfruit, stats: [Stat.StatStrength] },
	{ config: BlessedSunfruitJuice, stats: [Stat.StatSpirit] },
	{ config: NightfinSoup, stats: [Stat.StatMP5] },
	{ config: TenderWolfSteak, stats: [Stat.StatStamina, Stat.StatSpirit] },
	{ config: SagefishDelight, stats: [Stat.StatMP5] },
	{ config: HotWolfRibs, stats: [Stat.StatSpirit] },
	{ config: SmokedSagefish, stats: [Stat.StatMP5] },
];

export const makeFoodInput = makeConsumeInputFactory({ consumesFieldName: 'food' });

export const DragonBreathChili = makeBooleanConsumeInput({
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 12217, minLevel: 35 }]),
	fieldName: 'dragonBreathChili',
});

///////////////////////////////////////////////////////////////////////////
//                                 PHYSICAL DAMAGE CONSUMES
///////////////////////////////////////////////////////////////////////////

// Agility
export const ElixirOfTheMongoose: ConsumableInputConfig<AgilityElixir> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 13452, minLevel: 46 }]),
	value: AgilityElixir.ElixirOfTheMongoose,
};
export const ElixirOfGreaterAgility: ConsumableInputConfig<AgilityElixir> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 9187, minLevel: 38 }]),
	value: AgilityElixir.ElixirOfGreaterAgility,
};
export const ElixirOfAgility: ConsumableInputConfig<AgilityElixir> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 8949, minLevel: 27 }]),
	value: AgilityElixir.ElixirOfAgility,
};
export const ElixirOfLesserAgility: ConsumableInputConfig<AgilityElixir> = {
	actionId: (player: Player<Spec>) => player.getMatchingItemActionId([{ id: 3390, minLevel: 18 }]),
	value: AgilityElixir.ElixirOfLesserAgility,
};
export const ScrollOfAgility: ConsumableInputConfig<AgilityElixir> = {
	actionId: player =>
		player.getMatchingItemActionId([
			{ id: 3012, minLevel: 10, maxLevel: 24 },
			{ id: 1477, minLevel: 25, maxLevel: 39 },
			{ id: 4425, minLevel: 40, maxLevel: 54 },
			{ id: 10309, minLevel: 55 },
		]),
	value: AgilityElixir.ScrollOfAgility,
};

export const AGILITY_CONSUMES_CONFIG: ConsumableStatOption<AgilityElixir>[] = [
	{ config: ElixirOfTheMongoose, stats: [Stat.StatAgility, Stat.StatMeleeCrit] },
	{ config: ElixirOfGreaterAgility, stats: [Stat.StatAgility] },
	{ config: ElixirOfAgility, stats: [Stat.StatAgility] },
	{ config: ElixirOfLesserAgility, stats: [Stat.StatAgility] },
	{ config: ScrollOfAgility, stats: [Stat.StatAgility] },
];

export const makeAgilityConsumeInput = makeConsumeInputFactory({ consumesFieldName: 'agilityElixir' });

// Strength
export const JujuPower: ConsumableInputConfig<StrengthBuff> = {
	actionId: player => player.getMatchingItemActionId([{ id: 12451, minLevel: 55 }]),
	value: StrengthBuff.JujuPower,
};
export const ElixirOfGiants: ConsumableInputConfig<StrengthBuff> = {
	actionId: player => player.getMatchingItemActionId([{ id: 9206, minLevel: 46 }]),
	value: StrengthBuff.ElixirOfGiants,
};
export const ElixirOfOgresStrength: ConsumableInputConfig<StrengthBuff> = {
	actionId: player => player.getMatchingItemActionId([{ id: 3391, minLevel: 20 }]),
	value: StrengthBuff.ElixirOfOgresStrength,
};
export const ScrollOfStrength: ConsumableInputConfig<StrengthBuff> = {
	actionId: player =>
		player.getMatchingItemActionId([
			{ id: 954, minLevel: 10, maxLevel: 24 },
			{ id: 2289, minLevel: 25, maxLevel: 39 },
			{ id: 4426, minLevel: 40, maxLevel: 54 },
			{ id: 10310, minLevel: 55 },
		]),
	value: StrengthBuff.ScrollOfStrength,
};

export const STRENGTH_CONSUMES_CONFIG: ConsumableStatOption<StrengthBuff>[] = [
	{ config: JujuPower, stats: [Stat.StatStrength] },
	{ config: ElixirOfGiants, stats: [Stat.StatStrength] },
	{ config: ElixirOfOgresStrength, stats: [Stat.StatStrength] },
	{ config: ScrollOfStrength, stats: [Stat.StatStrength] },
];

export const makeStrengthConsumeInput = makeConsumeInputFactory({ consumesFieldName: 'strengthBuff' });

// Other
export const BoglingRootBuff = makeBooleanConsumeInput({ actionId: () => ActionId.fromItemId(5206), fieldName: 'boglingRoot' });

///////////////////////////////////////////////////////////////////////////
//                                 PET
///////////////////////////////////////////////////////////////////////////

export const PetScrollOfAgility = makeEnumConsumeInput({
	direction: IconEnumPickerDirection.Vertical,
	values: [
		{ value: 0, tooltip: 'None' },
		{ actionId: () => ActionId.fromItemId(3012), value: 1, showWhen: player => player.getLevel() >= 10 },
		{ actionId: () => ActionId.fromItemId(1477), value: 2, showWhen: player => player.getLevel() >= 25 },
		{ actionId: () => ActionId.fromItemId(4425), value: 3, showWhen: player => player.getLevel() >= 40 },
		{ actionId: () => ActionId.fromItemId(10309), value: 4, showWhen: player => player.getLevel() >= 55 },
	],
	fieldName: 'petScrollOfAgility',
});

export const PetScrollOfStrength = makeEnumConsumeInput({
	direction: IconEnumPickerDirection.Vertical,
	values: [
		{ value: 0, tooltip: 'None' },
		{ actionId: () => ActionId.fromItemId(954), value: 1, showWhen: player => player.getLevel() >= 10 },
		{ actionId: () => ActionId.fromItemId(2289), value: 2, showWhen: player => player.getLevel() >= 25 },
		{ actionId: () => ActionId.fromItemId(4426), value: 3, showWhen: player => player.getLevel() >= 40 },
		{ actionId: () => ActionId.fromItemId(10310), value: 4, showWhen: player => player.getLevel() >= 55 },
	],
	fieldName: 'petScrollOfStrength',
});

///////////////////////////////////////////////////////////////////////////
//                                 POTIONS
///////////////////////////////////////////////////////////////////////////

export const LesserManaPotion: ConsumableInputConfig<Potions> = {
	actionId: () => ActionId.fromItemId(3385),
	value: Potions.LesserManaPotion,
};
export const ManaPotion: ConsumableInputConfig<Potions> = {
	actionId: player => player.getMatchingItemActionId([{ id: 3827, minLevel: 22 }]),
	value: Potions.ManaPotion,
};
export const GreaterManaPotion: ConsumableInputConfig<Potions> = {
	actionId: player => player.getMatchingItemActionId([{ id: 6149, minLevel: 31 }]),
	value: Potions.GreaterManaPotion,
};
export const SuperiorManaPotion: ConsumableInputConfig<Potions> = {
	actionId: player => player.getMatchingItemActionId([{ id: 13443, minLevel: 41 }]),
	value: Potions.SuperiorManaPotion,
};
export const MajorManaPotion: ConsumableInputConfig<Potions> = {
	actionId: player => player.getMatchingItemActionId([{ id: 13444, minLevel: 49 }]),
	value: Potions.MajorManaPotion,
};

export const POTIONS_CONFIG: ConsumableStatOption<Potions>[] = [
	{ config: MajorManaPotion, stats: [Stat.StatIntellect] },
	{ config: SuperiorManaPotion, stats: [Stat.StatIntellect] },
	{ config: GreaterManaPotion, stats: [Stat.StatIntellect] },
	{ config: ManaPotion, stats: [Stat.StatIntellect] },
	{ config: LesserManaPotion, stats: [Stat.StatIntellect] },
];

export const makePotionsInput = makeConsumeInputFactory({ consumesFieldName: 'defaultPotion' });

export const MildlyIrradiatedRejuvPotion = makeBooleanConsumeInput({
	actionId: player => player.getMatchingItemActionId([{ id: 215162, minLevel: 35 }]),
	fieldName: 'mildlyIrradiatedRejuvPot',
	showWhen: player => player.hasProfession(Profession.Alchemy),
});

///////////////////////////////////////////////////////////////////////////
//                                 SPELL DAMAGE CONSUMES
///////////////////////////////////////////////////////////////////////////

// Arcane
export const GreaterArcaneElixir: ConsumableInputConfig<SpellPowerBuff> = {
	actionId: player => player.getMatchingItemActionId([{ id: 13454, minLevel: 46 }]),
	value: SpellPowerBuff.GreaterArcaneElixir,
};
export const ArcaneElixir: ConsumableInputConfig<SpellPowerBuff> = {
	actionId: player => player.getMatchingItemActionId([{ id: 9155, minLevel: 37 }]),
	value: SpellPowerBuff.ArcaneElixir,
};
export const LesserArcaneElixir: ConsumableInputConfig<SpellPowerBuff> = {
	actionId: player => player.getMatchingItemActionId([{ id: 217398, minLevel: 28 }]),
	value: SpellPowerBuff.LesserArcaneElixir,
};

export const SPELL_POWER_CONFIG: ConsumableStatOption<SpellPowerBuff>[] = [
	{ config: GreaterArcaneElixir, stats: [Stat.StatSpellPower] },
	{ config: ArcaneElixir, stats: [Stat.StatSpellPower] },
	{ config: LesserArcaneElixir, stats: [Stat.StatSpellPower] },
];

export const makeSpellPowerConsumeInput = makeConsumeInputFactory({ consumesFieldName: 'spellPowerBuff' });

// Fire
// Original lvl 40 not obtainable in Phase 3
export const ElixirOfGreaterFirepower: ConsumableInputConfig<FirePowerBuff> = {
	actionId: player => player.getMatchingItemActionId([{ id: 21546, minLevel: 51 }]),
	value: FirePowerBuff.ElixirOfGreaterFirepower,
};
export const ElixirOfFirepower: ConsumableInputConfig<FirePowerBuff> = {
	actionId: player => player.getMatchingItemActionId([{ id: 6373, minLevel: 18 }]),
	value: FirePowerBuff.ElixirOfFirepower,
};

export const FIRE_POWER_CONFIG: ConsumableStatOption<FirePowerBuff>[] = [
	{ config: ElixirOfGreaterFirepower, stats: [Stat.StatFirePower] },
	{ config: ElixirOfFirepower, stats: [Stat.StatFirePower] },
];

export const makeFirePowerConsumeInput = makeConsumeInputFactory({ consumesFieldName: 'firePowerBuff' });

// Frost
export const ElixirOfFrostPower: ConsumableInputConfig<FrostPowerBuff> = {
	actionId: player => player.getMatchingItemActionId([{ id: 17708, minLevel: 40 }]),
	value: FrostPowerBuff.ElixirOfFrostPower,
};

export const FROST_POWER_CONFIG: ConsumableStatOption<FrostPowerBuff>[] = [{ config: ElixirOfFrostPower, stats: [Stat.StatFrostPower] }];

export const makeFrostPowerConsumeInput = makeConsumeInputFactory({ consumesFieldName: 'frostPowerBuff' });

// Shadow
export const ElixirOfShadowPower: ConsumableInputConfig<ShadowPowerBuff> = {
	actionId: player => player.getMatchingItemActionId([{ id: 9264, minLevel: 40 }]),
	value: ShadowPowerBuff.ElixirOfShadowPower,
};

export const SHADOW_POWER_CONFIG: ConsumableStatOption<ShadowPowerBuff>[] = [{ config: ElixirOfShadowPower, stats: [Stat.StatShadowPower] }];

export const makeshadowPowerConsumeInput = makeConsumeInputFactory({ consumesFieldName: 'shadowPowerBuff' });

///////////////////////////////////////////////////////////////////////////
//                                 Weapon Imbues
///////////////////////////////////////////////////////////////////////////

// Windfury (Buff)
export const Windfury: ConsumableInputConfig<WeaponImbue> = {
	actionId: player =>
		player.getMatchingSpellActionId([
			{ id: 8516, minLevel: 32, maxLevel: 41 },
			{ id: 10608, minLevel: 42, maxLevel: 51 },
			{ id: 10610, minLevel: 52 },
		]),
	value: WeaponImbue.Windfury,
};

// Wild Strikes
export const WildStrikes: ConsumableInputConfig<WeaponImbue> = {
	actionId: () => ActionId.fromSpellId(407975),
	value: WeaponImbue.WildStrikes,
};

// Other Imbues

// Wizard Oils
// Original lvl 45 but not obtainable in Phase 3
export const BrillianWizardOil: ConsumableInputConfig<WeaponImbue> = {
	actionId: player => player.getMatchingItemActionId([{ id: 20749, minLevel: 51 }]),
	value: WeaponImbue.BrillianWizardOil,
};
// Original lvl 45 but not obtainable in Phase 3
export const WizardOil: ConsumableInputConfig<WeaponImbue> = {
	actionId: player => player.getMatchingItemActionId([{ id: 20750, minLevel: 51 }]),
	value: WeaponImbue.WizardOil,
};
export const LesserWizardOil: ConsumableInputConfig<WeaponImbue> = {
	actionId: player => player.getMatchingItemActionId([{ id: 20746, minLevel: 30 }]),
	value: WeaponImbue.LesserWizardOil,
};
export const MinorWizardOil: ConsumableInputConfig<WeaponImbue> = {
	actionId: player => player.getMatchingItemActionId([{ id: 20744, minLevel: 5 }]),
	value: WeaponImbue.MinorWizardOil,
};

// Mana Oils
// Original lvl 45 but not obtainable in Phase 3
export const BrilliantManaOil: ConsumableInputConfig<WeaponImbue> = {
	actionId: player => player.getMatchingItemActionId([{ id: 20748, minLevel: 51 }]),
	value: WeaponImbue.BrilliantManaOil,
};
export const LesserManaOil: ConsumableInputConfig<WeaponImbue> = {
	actionId: player => player.getMatchingItemActionId([{ id: 20747, minLevel: 40 }]),
	value: WeaponImbue.LesserManaOil,
};
export const MinorManaOil: ConsumableInputConfig<WeaponImbue> = {
	actionId: player => player.getMatchingItemActionId([{ id: 20745, minLevel: 20 }]),
	value: WeaponImbue.MinorManaOil,
};
export const BlackfathomManaOil: ConsumableInputConfig<WeaponImbue> = {
	actionId: player => player.getMatchingItemActionId([{ id: 211848, minLevel: 25 }]),
	value: WeaponImbue.BlackfathomManaOil,
};

// Sharpening Stones
// Original lvl 50 but not obtainable in Phase 3
export const ElementalSharpeningStone = (slot: ItemSlot): ConsumableInputConfig<WeaponImbue> => {
	return {
		actionId: player => player.getMatchingItemActionId([{ id: 18262, minLevel: 51 }]),
		value: WeaponImbue.ElementalSharpeningStone,
		showWhen: player => isSharpWeaponType(player.getEquippedItem(slot)?.item.weaponType ?? WeaponType.WeaponTypeUnknown),
	};
};
export const DenseSharpeningStone = (slot: ItemSlot): ConsumableInputConfig<WeaponImbue> => {
	return {
		actionId: player => player.getMatchingItemActionId([{ id: 12404, minLevel: 35 }]),
		value: WeaponImbue.DenseSharpeningStone,
		showWhen: player => isSharpWeaponType(player.getEquippedItem(slot)?.item.weaponType ?? WeaponType.WeaponTypeUnknown),
	};
};
export const SolidSharpeningStone = (slot: ItemSlot): ConsumableInputConfig<WeaponImbue> => {
	return {
		actionId: player => player.getMatchingItemActionId([{ id: 7964, minLevel: 35 }]),
		value: WeaponImbue.SolidSharpeningStone,
		showWhen: player => isSharpWeaponType(player.getEquippedItem(slot)?.item.weaponType ?? WeaponType.WeaponTypeUnknown),
	};
};
export const BlackfathomSharpeningStone = (slot: ItemSlot): ConsumableInputConfig<WeaponImbue> => {
	return {
		actionId: () => ActionId.fromItemId(211845),
		value: WeaponImbue.BlackfathomSharpeningStone,
		showWhen: player => isSharpWeaponType(player.getEquippedItem(slot)?.item.weaponType ?? WeaponType.WeaponTypeUnknown),
	};
};

// Weightstones
export const DenseWeightstone = (slot: ItemSlot): ConsumableInputConfig<WeaponImbue> => {
	return {
		actionId: player => player.getMatchingItemActionId([{ id: 12643, minLevel: 35 }]),
		value: WeaponImbue.DenseWeightstone,
		showWhen: player => isBluntWeaponType(player.getEquippedItem(slot)?.item.weaponType ?? WeaponType.WeaponTypeUnknown),
	};
};
export const SolidWeightstone = (slot: ItemSlot): ConsumableInputConfig<WeaponImbue> => {
	return {
		actionId: player => player.getMatchingItemActionId([{ id: 7965, minLevel: 35 }]),
		value: WeaponImbue.SolidWeightstone,
		showWhen: player => isBluntWeaponType(player.getEquippedItem(slot)?.item.weaponType ?? WeaponType.WeaponTypeUnknown),
	};
};

// Spell Oils
export const ShadowOil: ConsumableInputConfig<WeaponImbue> = {
	actionId: player => player.getMatchingItemActionId([{ id: 3824, minLevel: 25 }]),
	value: WeaponImbue.ShadowOil,
};
export const FrostOil: ConsumableInputConfig<WeaponImbue> = {
	actionId: player => player.getMatchingItemActionId([{ id: 3829, minLevel: 40 }]),
	value: WeaponImbue.FrostOil,
};

const SHAMAN_IMBUES: ConsumableStatOption<WeaponImbue>[] = [
	{ config: RockbiterWeaponImbue, stats: [] },
	{ config: FlametongueWeaponImbue, stats: [] },
	{ config: FrostbrandWeaponImbue, stats: [] },
	{ config: WindfuryWeaponImbue, stats: [] },
];

const ROGUE_IMBUES: ConsumableStatOption<WeaponImbue>[] = [
	{ config: InstantPoisonWeaponImbue, stats: [] },
	{ config: DeadlyPoisonWeaponImbue, stats: [] },
	{ config: WoundPoisonWeaponImbue, stats: [] },
];

const CONSUMABLES_IMBUES = (slot: ItemSlot): ConsumableStatOption<WeaponImbue>[] => [
	{ config: BrillianWizardOil, stats: [Stat.StatSpellPower] },
	{ config: WizardOil, stats: [Stat.StatSpellPower] },
	{ config: LesserWizardOil, stats: [Stat.StatSpellPower] },
	{ config: MinorWizardOil, stats: [Stat.StatSpellPower] },

	{ config: BrilliantManaOil, stats: [Stat.StatHealingPower, Stat.StatSpellPower] },
	{ config: LesserManaOil, stats: [Stat.StatHealingPower, Stat.StatSpellPower] },
	{ config: MinorManaOil, stats: [Stat.StatHealingPower, Stat.StatSpellPower] },
	{ config: BlackfathomManaOil, stats: [Stat.StatSpellPower, Stat.StatMP5] },

	{ config: ElementalSharpeningStone(slot), stats: [Stat.StatAttackPower] },
	{ config: DenseSharpeningStone(slot), stats: [Stat.StatAttackPower] },
	{ config: SolidSharpeningStone(slot), stats: [Stat.StatAttackPower] },
	{ config: BlackfathomSharpeningStone(slot), stats: [Stat.StatMeleeHit] },

	{ config: DenseWeightstone(slot), stats: [Stat.StatAttackPower] },
	{ config: SolidWeightstone(slot), stats: [Stat.StatAttackPower] },

	{ config: ShadowOil, stats: [Stat.StatAttackPower] },
	{ config: FrostOil, stats: [Stat.StatAttackPower] },
];

export const WEAPON_IMBUES_OH_CONFIG: ConsumableStatOption<WeaponImbue>[] = [
	...ROGUE_IMBUES,
	...SHAMAN_IMBUES,
	...CONSUMABLES_IMBUES(ItemSlot.ItemSlotOffHand),
];

export const WEAPON_IMBUES_MH_CONFIG: ConsumableStatOption<WeaponImbue>[] = [
	...ROGUE_IMBUES,
	...SHAMAN_IMBUES,
	{ config: Windfury, stats: [Stat.StatMeleeHit] },
	{ config: WildStrikes, stats: [Stat.StatMeleeHit] },
	...CONSUMABLES_IMBUES(ItemSlot.ItemSlotMainHand),
];

export const makeMainHandImbuesInput = makeConsumeInputFactory({
	consumesFieldName: 'mainHandImbue',
	showWhen: player => !!player.getGear().getEquippedItem(ItemSlot.ItemSlotMainHand),
});
export const makeOffHandImbuesInput = makeConsumeInputFactory({
	consumesFieldName: 'offHandImbue',
	showWhen: player => {
		return ![WeaponType.WeaponTypeUnknown, WeaponType.WeaponTypeOffHand, WeaponType.WeaponTypeShield].includes(
			player.getGear().getEquippedItem(ItemSlot.ItemSlotOffHand)?.item.weaponType ?? WeaponType.WeaponTypeUnknown,
		);
	},
});

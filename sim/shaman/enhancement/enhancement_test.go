package enhancement

import (
	"testing"

	_ "github.com/wowsims/sod/sim/common" // imported to get item effects included.
	"github.com/wowsims/sod/sim/core"
	"github.com/wowsims/sod/sim/core/proto"
)

func init() {
	RegisterEnhancementShaman()
}

func TestEnhancement(t *testing.T) {
	core.RunTestSuite(t, t.Name(), core.FullCharacterTestSuiteGenerator([]core.CharacterSuiteConfig{
		{
			Class:      proto.Class_ClassShaman,
			Level:      25,
			Race:       proto.Race_RaceTroll,
			OtherRaces: []proto.Race{proto.Race_RaceOrc},

			Talents:     Phase1Talents,
			GearSet:     core.GetGearSet("../../../ui/enhancement_shaman/gear_sets", "phase_1"),
			Rotation:    core.GetAplRotation("../../../ui/enhancement_shaman/apls", "phase_1"),
			Buffs:       core.FullBuffsPhase1,
			Consumes:    Phase1Consumes,
			SpecOptions: core.SpecOptionsCombo{Label: "Sync Auto", SpecOptions: PlayerOptionsSyncAuto},
			OtherSpecOptions: []core.SpecOptionsCombo{
				{Label: "Sync Delay OH", SpecOptions: PlayerOptionsSyncDelayOH},
			},

			ItemFilter:      ItemFilters,
			EPReferenceStat: proto.Stat_StatAttackPower,
			StatsToWeigh:    Stats,
		},
		{
			Class:      proto.Class_ClassShaman,
			Level:      40,
			Race:       proto.Race_RaceTroll,
			OtherRaces: []proto.Race{proto.Race_RaceOrc},

			Talents:  Phase2Talents,
			GearSet:  core.GetGearSet("../../../ui/enhancement_shaman/gear_sets", "phase_2"),
			Rotation: core.GetAplRotation("../../../ui/enhancement_shaman/apls", "phase_2"),
			Buffs:    core.FullBuffsPhase2,
			Consumes: Phase2ConsumesWFWF,
			OtherConsumes: []core.ConsumesCombo{
				Phase2ConsumesWFRB,
				Phase2ConsumesWFFT,
			},
			SpecOptions: core.SpecOptionsCombo{Label: "Sync Auto", SpecOptions: PlayerOptionsSyncAuto},
			OtherSpecOptions: []core.SpecOptionsCombo{
				{Label: "Sync Delay OH", SpecOptions: PlayerOptionsSyncDelayOH},
			},

			ItemFilter:      ItemFilters,
			EPReferenceStat: proto.Stat_StatAttackPower,
			StatsToWeigh:    Stats,
		},
		{
			Class:      proto.Class_ClassShaman,
			Level:      50,
			Race:       proto.Race_RaceTroll,
			OtherRaces: []proto.Race{proto.Race_RaceOrc},

			Talents:  Phase3Talents,
			GearSet:  core.GetGearSet("../../../ui/enhancement_shaman/gear_sets", "phase_3"),
			Rotation: core.GetAplRotation("../../../ui/enhancement_shaman/apls", "phase_3"),
			Buffs:    core.FullBuffsPhase3,
			Consumes: Phase3ConsumesWFWF,
			OtherConsumes: []core.ConsumesCombo{
				Phase3ConsumesWFRB,
				Phase3ConsumesWFFT,
			},
			SpecOptions: core.SpecOptionsCombo{Label: "Sync Auto", SpecOptions: PlayerOptionsSyncAuto},
			OtherSpecOptions: []core.SpecOptionsCombo{
				{Label: "Sync Delay OH", SpecOptions: PlayerOptionsSyncDelayOH},
			},

			ItemFilter:      ItemFilters,
			EPReferenceStat: proto.Stat_StatAttackPower,
			StatsToWeigh:    Stats,
		},
	}))
}

func BenchmarkSimulate(b *testing.B) {
	core.Each([]*proto.RaidSimRequest{
		{
			Raid: core.SinglePlayerRaidProto(
				&proto.Player{
					Race:          proto.Race_RaceOrc,
					Class:         proto.Class_ClassShaman,
					Level:         25,
					TalentsString: Phase1Talents,
					Equipment:     core.GetGearSet("../../../ui/enhancement_shaman/gear_sets", "phase_1").GearSet,
					Rotation:      core.GetAplRotation("../../../ui/enhancement_shaman/apls", "phase_1").Rotation,
					Consumes:      Phase1Consumes.Consumes,
					Spec:          PlayerOptionsSyncAuto,
					Buffs:         core.FullIndividualBuffsPhase1,
				},
				core.FullPartyBuffs,
				core.FullRaidBuffsPhase1,
				core.FullDebuffsPhase1,
			),
			Encounter: &proto.Encounter{
				Duration: 120,
				Targets: []*proto.Target{
					core.NewDefaultTarget(25),
				},
			},
			SimOptions: core.AverageDefaultSimTestOptions,
		},
		{
			Raid: core.SinglePlayerRaidProto(
				&proto.Player{
					Race:          proto.Race_RaceOrc,
					Class:         proto.Class_ClassShaman,
					Level:         40,
					TalentsString: Phase2Talents,
					Equipment:     core.GetGearSet("../../../ui/enhancement_shaman/gear_sets", "phase_2").GearSet,
					Rotation:      core.GetAplRotation("../../../ui/enhancement_shaman/apls", "phase_2").Rotation,
					Consumes:      Phase2ConsumesWFWF.Consumes,
					Spec:          PlayerOptionsSyncAuto,
					Buffs:         core.FullIndividualBuffsPhase2,
				},
				core.FullPartyBuffs,
				core.FullRaidBuffsPhase2,
				core.FullDebuffsPhase2,
			),
			Encounter: &proto.Encounter{
				Duration: 120,
				Targets: []*proto.Target{
					core.NewDefaultTarget(40),
				},
			},
			SimOptions: core.AverageDefaultSimTestOptions,
		},
		{
			Raid: core.SinglePlayerRaidProto(
				&proto.Player{
					Race:          proto.Race_RaceOrc,
					Class:         proto.Class_ClassShaman,
					Level:         50,
					TalentsString: Phase3Talents,
					Equipment:     core.GetGearSet("../../../ui/enhancement_shaman/gear_sets", "phase_2").GearSet,
					Rotation:      core.GetAplRotation("../../../ui/enhancement_shaman/apls", "phase_3").Rotation,
					Consumes:      Phase3ConsumesWFWF.Consumes,
					Spec:          PlayerOptionsSyncAuto,
					Buffs:         core.FullIndividualBuffsPhase2,
				},
				core.FullPartyBuffs,
				core.FullRaidBuffsPhase3,
				core.FullDebuffsPhase3,
			),
			Encounter: &proto.Encounter{
				Duration: 120,
				Targets: []*proto.Target{
					core.NewDefaultTarget(50),
				},
			},
			SimOptions: core.AverageDefaultSimTestOptions,
		},
	}, func(rsr *proto.RaidSimRequest) { core.RaidBenchmark(b, rsr) })
}

var Phase1Talents = "-5005202101"
var Phase2Talents = "-5005202105023051"
var Phase3Talents = "05003-5005132105023051"

var PlayerOptionsSyncDelayOH = &proto.Player_EnhancementShaman{
	EnhancementShaman: &proto.EnhancementShaman{
		Options: optionsSyncDelayOffhand,
	},
}

var PlayerOptionsSyncAuto = &proto.Player_EnhancementShaman{
	EnhancementShaman: &proto.EnhancementShaman{
		Options: optionsSyncAuto,
	},
}

var optionsSyncDelayOffhand = &proto.EnhancementShaman_Options{
	Shield:   proto.ShamanShield_WaterShield,
	SyncType: proto.ShamanSyncType_DelayOffhandSwings,
}

var optionsSyncAuto = &proto.EnhancementShaman_Options{
	Shield:   proto.ShamanShield_LightningShield,
	SyncType: proto.ShamanSyncType_Auto,
}

var Phase1Consumes = core.ConsumesCombo{
	Label: "Phase 1 Consumes",
	Consumes: &proto.Consumes{
		AgilityElixir: proto.AgilityElixir_ElixirOfLesserAgility,
		DefaultPotion: proto.Potions_ManaPotion,
		FirePowerBuff: proto.FirePowerBuff_ElixirOfFirepower,
		MainHandImbue: proto.WeaponImbue_RockbiterWeapon,
		OffHandImbue:  proto.WeaponImbue_RockbiterWeapon,
		StrengthBuff:  proto.StrengthBuff_ElixirOfOgresStrength,
	},
}

var Phase2ConsumesWFWF = core.ConsumesCombo{
	Label: "Phase 2 Consumes WF/WF",
	Consumes: &proto.Consumes{
		AgilityElixir:     proto.AgilityElixir_ElixirOfAgility,
		DefaultPotion:     proto.Potions_ManaPotion,
		DragonBreathChili: true,
		FirePowerBuff:     proto.FirePowerBuff_ElixirOfFirepower,
		Food:              proto.Food_FoodSagefishDelight,
		MainHandImbue:     proto.WeaponImbue_WindfuryWeapon,
		OffHandImbue:      proto.WeaponImbue_WindfuryWeapon,
		SpellPowerBuff:    proto.SpellPowerBuff_LesserArcaneElixir,
		StrengthBuff:      proto.StrengthBuff_ElixirOfOgresStrength,
	},
}

var Phase2ConsumesWFRB = core.ConsumesCombo{
	Label: "Phase 2 Consumes WF/RB",
	Consumes: &proto.Consumes{
		AgilityElixir:     proto.AgilityElixir_ElixirOfAgility,
		DefaultPotion:     proto.Potions_ManaPotion,
		DragonBreathChili: true,
		FirePowerBuff:     proto.FirePowerBuff_ElixirOfFirepower,
		Food:              proto.Food_FoodSagefishDelight,
		MainHandImbue:     proto.WeaponImbue_WindfuryWeapon,
		OffHandImbue:      proto.WeaponImbue_RockbiterWeapon,
		SpellPowerBuff:    proto.SpellPowerBuff_LesserArcaneElixir,
		StrengthBuff:      proto.StrengthBuff_ScrollOfStrength,
	},
}

var Phase2ConsumesWFFT = core.ConsumesCombo{
	Label: "Phase 2 Consumes WF/FT",
	Consumes: &proto.Consumes{
		AgilityElixir:     proto.AgilityElixir_ElixirOfAgility,
		DefaultPotion:     proto.Potions_ManaPotion,
		DragonBreathChili: true,
		FirePowerBuff:     proto.FirePowerBuff_ElixirOfFirepower,
		Food:              proto.Food_FoodSagefishDelight,
		MainHandImbue:     proto.WeaponImbue_WindfuryWeapon,
		OffHandImbue:      proto.WeaponImbue_FlametongueWeapon,
		SpellPowerBuff:    proto.SpellPowerBuff_LesserArcaneElixir,
		StrengthBuff:      proto.StrengthBuff_ScrollOfStrength,
	},
}

var Phase3ConsumesWFWF = core.ConsumesCombo{
	Label: "Phase 3 Consumes WF/WF",
	Consumes: &proto.Consumes{
		AgilityElixir:     proto.AgilityElixir_ElixirOfAgility,
		DefaultPotion:     proto.Potions_ManaPotion,
		DragonBreathChili: true,
		FirePowerBuff:     proto.FirePowerBuff_ElixirOfFirepower,
		Food:              proto.Food_FoodSagefishDelight,
		MainHandImbue:     proto.WeaponImbue_WindfuryWeapon,
		OffHandImbue:      proto.WeaponImbue_WindfuryWeapon,
		SpellPowerBuff:    proto.SpellPowerBuff_LesserArcaneElixir,
		StrengthBuff:      proto.StrengthBuff_ElixirOfOgresStrength,
	},
}

var Phase3ConsumesWFRB = core.ConsumesCombo{
	Label: "Phase 3 Consumes WF/RB",
	Consumes: &proto.Consumes{
		AgilityElixir:     proto.AgilityElixir_ElixirOfAgility,
		DefaultPotion:     proto.Potions_ManaPotion,
		DragonBreathChili: true,
		FirePowerBuff:     proto.FirePowerBuff_ElixirOfFirepower,
		Food:              proto.Food_FoodSagefishDelight,
		MainHandImbue:     proto.WeaponImbue_WindfuryWeapon,
		OffHandImbue:      proto.WeaponImbue_RockbiterWeapon,
		SpellPowerBuff:    proto.SpellPowerBuff_LesserArcaneElixir,
		StrengthBuff:      proto.StrengthBuff_ScrollOfStrength,
	},
}

var Phase3ConsumesWFFT = core.ConsumesCombo{
	Label: "Phase 3 Consumes WF/FT",
	Consumes: &proto.Consumes{
		AgilityElixir:     proto.AgilityElixir_ElixirOfAgility,
		DefaultPotion:     proto.Potions_ManaPotion,
		DragonBreathChili: true,
		FirePowerBuff:     proto.FirePowerBuff_ElixirOfFirepower,
		Food:              proto.Food_FoodSagefishDelight,
		MainHandImbue:     proto.WeaponImbue_WindfuryWeapon,
		OffHandImbue:      proto.WeaponImbue_FlametongueWeapon,
		SpellPowerBuff:    proto.SpellPowerBuff_LesserArcaneElixir,
		StrengthBuff:      proto.StrengthBuff_ScrollOfStrength,
	},
}

var ItemFilters = core.ItemFilter{
	WeaponTypes: []proto.WeaponType{
		proto.WeaponType_WeaponTypeAxe,
		proto.WeaponType_WeaponTypeDagger,
		proto.WeaponType_WeaponTypeFist,
		proto.WeaponType_WeaponTypeMace,
		proto.WeaponType_WeaponTypeOffHand,
		proto.WeaponType_WeaponTypeShield,
		proto.WeaponType_WeaponTypeStaff,
	},
	ArmorType: proto.ArmorType_ArmorTypeMail,
	RangedWeaponTypes: []proto.RangedWeaponType{
		proto.RangedWeaponType_RangedWeaponTypeTotem,
	},
}

var Stats = []proto.Stat{
	proto.Stat_StatStrength,
	proto.Stat_StatAgility,
	proto.Stat_StatAttackPower,
	proto.Stat_StatMeleeHit,
	proto.Stat_StatMeleeCrit,
	proto.Stat_StatSpellPower,
}

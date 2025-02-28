package shaman

import (
	"time"

	"github.com/wowsims/sod/sim/core"
	"github.com/wowsims/sod/sim/core/proto"
)

const ChainHealRanks = 3
const ChainHealTargetCount = 3

// 50% reduction per bounce
const ChainHealBounceCoeff = .5

var ChainHealSpellId = [ChainHealRanks + 1]int32{0, 1064, 10622, 10623}
var ChainHealBaseHealing = [ChainHealRanks + 1][]float64{{0}, {332, 381}, {416, 477}, {567, 646}}
var ChainHealSpellCoef = [ChainHealRanks + 1]float64{0, .714, .714, .714}
var ChainHealCastTime = [ChainHealRanks + 1]int32{0, 2500, 2500, 2500}
var ChainHealManaCost = [ChainHealRanks + 1]float64{0, 260, 315, 405}
var ChainHealLevel = [ChainHealRanks + 1]int{0, 40, 46, 54}

func (shaman *Shaman) registerChainHealSpell() {
	overloadRuneEquipped := shaman.HasRune(proto.ShamanRune_RuneChestOverload)

	shaman.ChainHeal = make([]*core.Spell, ChainHealRanks+1)

	if overloadRuneEquipped {
		shaman.ChainHealOverload = make([]*core.Spell, ChainHealRanks+1)
	}

	for rank := 1; rank <= ChainHealRanks; rank++ {
		config := shaman.newChainHealSpellConfig(rank, false)

		if config.RequiredLevel <= int(shaman.Level) {
			shaman.ChainHeal[rank] = shaman.RegisterSpell(config)

			if overloadRuneEquipped {
				shaman.ChainHealOverload[rank] = shaman.RegisterSpell(shaman.newChainHealSpellConfig(rank, true))
			}
		}
	}
}

func (shaman *Shaman) newChainHealSpellConfig(rank int, isOverload bool) core.SpellConfig {
	spellId := ChainHealSpellId[rank]
	baseHealingLow := ChainHealBaseHealing[rank][0]
	baseHealingHigh := ChainHealBaseHealing[rank][1]
	spellCoeff := ChainHealSpellCoef[rank]
	castTime := ChainHealCastTime[rank]
	manaCost := ChainHealManaCost[rank]
	level := ChainHealLevel[rank]

	flags := core.SpellFlagHelpful
	if !isOverload {
		flags |= core.SpellFlagAPL
	}

	canOverload := !isOverload && shaman.HasRune(proto.ShamanRune_RuneChestOverload)

	spell := core.SpellConfig{
		ActionID:    core.ActionID{SpellID: spellId},
		SpellCode:   SpellCode_ShamanChainHeal,
		DefenseType: core.DefenseTypeMagic,
		SpellSchool: core.SpellSchoolNature,
		ProcMask:    core.ProcMaskSpellHealing,
		Flags:       flags,

		RequiredLevel: level,
		Rank:          rank,

		ManaCost: core.ManaCostOptions{
			FlatCost: manaCost,
			Multiplier: 1 *
				(1 - .01*float64(shaman.Talents.TidalFocus)),
		},

		Cast: core.CastConfig{
			DefaultCast: core.Cast{
				GCD:      core.GCDDefault,
				CastTime: time.Millisecond * time.Duration(castTime),
			},
			ModifyCast: func(sim *core.Simulation, spell *core.Spell, cast *core.Cast) {
				castTime := shaman.ApplyCastSpeedForSpell(cast.CastTime, spell)
				if castTime > 0 {
					shaman.AutoAttacks.StopMeleeUntil(sim, sim.CurrentTime+castTime, false)
				}
			},
		},

		BonusCritRating: float64(shaman.Talents.TidalMastery) * core.CritRatingPerCritChance,

		DamageMultiplier: 1 + .02*float64(shaman.Talents.Purification),
		ThreatMultiplier: 1,
		BonusCoefficient: spellCoeff,

		ApplyEffects: func(sim *core.Simulation, target *core.Unit, spell *core.Spell) {
			targets := sim.Environment.Raid.GetFirstNPlayersOrPets(ChainHealTargetCount)
			curTarget := targets[0]
			origMult := spell.DamageMultiplier
			// TODO: This bounces to most hurt friendly...
			for hitIndex := int32(0); hitIndex < ChainHealTargetCount; hitIndex++ {
				baseHealing := sim.Roll(baseHealingLow, baseHealingHigh)

				result := spell.CalcAndDealHealing(sim, curTarget, baseHealing, spell.OutcomeHealingCrit)

				if canOverload && result.Landed() && sim.RandomFloat("CH Overload") < ShamanOverloadChance {
					shaman.ChainHealOverload[rank].Cast(sim, target)
				}

				spell.DamageMultiplier *= ChainHealBounceCoeff
				curTarget = targets[hitIndex]
			}
			spell.DamageMultiplier = origMult
		},
	}

	if isOverload {
		shaman.applyOverloadModifiers(&spell)
	}

	return spell
}

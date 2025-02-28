package priest

import (
	"strconv"
	"time"

	"github.com/wowsims/sod/sim/core"
	"github.com/wowsims/sod/sim/core/proto"
)

// https://www.wowhead.com/classic/spell=425204/void-plague
// https://www.wowhead.com/classic/news/patch-1-15-build-52124-ptr-datamining-season-of-discovery-runes-336044
func (priest *Priest) registerVoidPlagueSpell() {
	if !priest.HasRune(proto.PriestRune_RuneChestVoidPlague) {
		return
	}

	ticks := int32(6)
	tickLength := time.Second * 3

	// 2024-02-22 tuning 10% buff
	baseTickDamage := priest.baseRuneAbilityDamage() * 1.17 * 1.1
	spellCoeff := .166
	manaCost := .13
	cooldown := time.Second * 6

	hasDespairRune := priest.HasRune(proto.PriestRune_RuneBracersDespair)

	priest.VoidPlague = priest.GetOrRegisterSpell(core.SpellConfig{
		ActionID:    core.ActionID{SpellID: int32(proto.PriestRune_RuneChestVoidPlague)},
		SpellSchool: core.SpellSchoolShadow,
		DefenseType: core.DefenseTypeMagic,
		ProcMask:    core.ProcMaskSpellDamage,
		Flags:       core.SpellFlagAPL | core.SpellFlagDisease | core.SpellFlagPureDot,

		ManaCost: core.ManaCostOptions{
			BaseCost: manaCost,
		},
		Cast: core.CastConfig{
			DefaultCast: core.Cast{
				GCD: core.GCDDefault,
			},
			CD: core.Cooldown{
				Timer:    priest.NewTimer(),
				Duration: cooldown,
			},
		},

		BonusCritRating: priest.forceOfWillCritRating(),
		BonusHitRating:  priest.shadowHitModifier(),

		CritDamageBonus: core.TernaryFloat64(hasDespairRune, 1, 0),

		DamageMultiplier: priest.forceOfWillDamageModifier() * priest.darknessDamageModifier(),
		ThreatMultiplier: priest.shadowThreatModifier(),

		Dot: core.DotConfig{
			Aura: core.Aura{
				Label: "VoidPlague-" + strconv.Itoa(1),
			},

			NumberOfTicks:    ticks,
			TickLength:       tickLength,
			BonusCoefficient: spellCoeff,

			OnSnapshot: func(sim *core.Simulation, target *core.Unit, dot *core.Dot, isRollover bool) {
				dot.Snapshot(target, baseTickDamage, isRollover)
			},
			OnTick: func(sim *core.Simulation, target *core.Unit, dot *core.Dot) {
				if hasDespairRune {
					dot.CalcAndDealPeriodicSnapshotDamage(sim, target, dot.OutcomeTickSnapshotCritCounted)
				} else {
					dot.CalcAndDealPeriodicSnapshotDamage(sim, target, dot.OutcomeTickCounted)
				}
			},
		},

		ApplyEffects: func(sim *core.Simulation, target *core.Unit, spell *core.Spell) {
			result := spell.CalcOutcome(sim, target, spell.OutcomeMagicHit)
			if result.Landed() {
				spell.SpellMetrics[target.UnitIndex].Hits--
				priest.AddShadowWeavingStack(sim, target)
				spell.Dot(target).Apply(sim)
			}
			spell.DealOutcome(sim, result)
		},

		ExpectedTickDamage: func(sim *core.Simulation, target *core.Unit, spell *core.Spell, useSnapshot bool) *core.SpellResult {
			if useSnapshot {
				dot := spell.Dot(target)
				return dot.CalcSnapshotDamage(sim, target, dot.Spell.OutcomeExpectedMagicAlwaysHit)
			} else {
				return spell.CalcPeriodicDamage(sim, target, baseTickDamage, spell.OutcomeExpectedMagicAlwaysHit)
			}
		},
	})
}

package paladin

import (
	"strconv"
	"time"

	"github.com/wowsims/sod/sim/core"
)

const sorRanks = 8
const sor1hModifier = 0.85
const sor2hModifier = 1.2

var sorLevels = [sorRanks + 1]int{0, 1, 10, 18, 26, 34, 42, 50, 58}
var sorManaCosts = [sorRanks + 1]float64{0, 20, 40, 60, 90, 120, 140, 170, 200}
var sorAuraSpellIds = [sorRanks + 1]int32{0, 20154, 20287, 20288, 20289, 20290, 20291, 20292, 20293}
var sorProcSpellIds = [sorRanks + 1]int32{0, 25742, 25740, 25739, 25738, 25737, 25736, 25735, 25713}
var sorEffectBasePoints = [sorRanks + 1]float64{0, 107, 215, 351, 540, 784, 1081, 1406, 1785}
var sorEffectRealPointsPerLevel = [sorRanks + 1]float64{0, 18, 17, 23, 31, 37, 41, 47, 47}
var sorLevelMinMaxEffects = [sorRanks + 1][]int32{{0}, {1, 7}, {10, 16}, {18, 24}, {26, 32}, {34, 40}, {42, 48}, {50, 56}, {58, 60}}

// SoR Rank 3 has approximately double the seemingly-intended spellpower scaling
// Changed 15/02/24 on a hotfix, now all ranks beyond rank 3 benefit from the rank 3 coefficient
var sorEffectBonusCoefficient = [sorRanks + 1]float64{0, 0.029, 0.063, 0.184, 0.184, 0.184, 0.184, 0.184, 0.184}

// The DB values are as follows:
//var sorEffectBonusCoefficient = [sorRanks + 1]float64{0, 0.029, 0.063, 0.093, 0.1, 0.1, 0.1, 0.1, 0.1}
// these coefficients are very like used for the "damage taken" scaling
// ... but the judgement spells also have a spell with same EffectBasePoints and EffectBasePointsPerLevel, but ~double the coefficient:
//var jorSorEffectBonusCoefficient = [sorRanks + 1]float64{0, 0.058, 0.125, 0.185, 0.2, 0.2, 0.2, 0.2, 0.2}

var jorSpellIDs = [sorRanks + 1]int32{0, 20187, 20280, 20281, 20282, 20283, 20284, 20285, 20286}
var jorEffectBasePoints = [sorRanks + 1]float64{0, 14, 24, 38, 56, 77, 101, 130, 161}
var jorEffectRealPointsPerLevel = [sorRanks + 1]float64{0, 1.8, 1.9, 2.4, 2.8, 3.1, 3.8, 4.1, 4.1}
var jorEffectDieSides = [sorRanks + 1]float64{0, 1, 3, 5, 7, 9, 11, 13, 17}
var jorEffectBonusCoefficient = [sorRanks + 1]float64{0, 0.144, 0.312, 0.462, 0.5, 0.5, 0.5, 0.5, 0.5}

func (paladin *Paladin) applySealOfRighteousnessSpellAndAuraBaseConfig(rank int) {
	spellIdAura := sorAuraSpellIds[rank]
	spellIdProc := sorProcSpellIds[rank]
	basePoints := sorEffectBasePoints[rank]
	pointsPerLevel := sorEffectRealPointsPerLevel[rank]
	scalingLevelMin := sorLevelMinMaxEffects[rank][0]
	scalingLevelMax := sorLevelMinMaxEffects[rank][1]
	effectBonusCoefficient := sorEffectBonusCoefficient[rank]

	jorSpellID := jorSpellIDs[rank]
	jorBasePoints := jorEffectBasePoints[rank]
	jorPointsPerLevel := jorEffectRealPointsPerLevel[rank]
	jorDieSides := jorEffectDieSides[rank]
	jorBonusCoefficient := jorEffectBonusCoefficient[rank]

	manaCost := sorManaCosts[rank]
	level := sorLevels[rank]

	levelsToScale := min(paladin.Level, scalingLevelMax) - scalingLevelMin
	baseCoefficientFinal := basePoints + 1 + float64(levelsToScale)*pointsPerLevel

	handednessModifier := sor1hModifier
	if paladin.Has2hEquipped() {
		handednessModifier = sor2hModifier
	}
	weaponSpeed := 0.0
	if paladin.HasMHWeapon() {
		weaponSpeed = paladin.GetMHWeapon().SwingSpeed
	}

	baseSoRDamage := baseCoefficientFinal / 100 * handednessModifier * weaponSpeed

	baseJoRMinDamage := jorBasePoints + 1 + float64(levelsToScale)*jorPointsPerLevel // rolls 1..jorDieSides
	baseJoRMaxDamage := baseJoRMinDamage + jorDieSides

	impSoRModifier := 1 + 0.03*float64(paladin.Talents.ImprovedSealOfRighteousness)

	/*
	 * Seal of Righteousness is a Spell/Aura that when active makes the paladin capable of procing
	 * two different SpellIDs depending on a paladin's casted spell or melee swing.
	 *
	 * (Judgement of Righteousness):
	 *   - Deals flat damage that is affected by Improved SoR talent, and
	 *     has a spellpower scaling that is unaffected by that talent.
	 *   - Targets magic defense and rolls to hit and crit.
	 *
	 * (Seal of Righteousness):
	 *   - Procs from white hits.
	 *   - Cannot miss or be dodged/parried/blocked if the underlying white hit lands.
	 *   - Deals damage that is a function of weapon speed, and spellpower.
	 *   - Has 0.85 scale factor on base damage if using 1h, 1.2 if using 2h.
	 *   - CANNOT CRIT.
	 */

	onJudgementProc := paladin.RegisterSpell(core.SpellConfig{
		ActionID:    core.ActionID{SpellID: jorSpellID},
		SpellSchool: core.SpellSchoolHoly,
		DefenseType: core.DefenseTypeMagic,
		ProcMask:    core.ProcMaskEmpty,
		Flags:       core.SpellFlagMeleeMetrics,

		BonusCritRating: paladin.holyPowerCritChance() + paladin.fanaticismCritChance(),

		DamageMultiplier: 1,
		ThreatMultiplier: 1,
		BonusCoefficient: jorBonusCoefficient,

		ApplyEffects: func(sim *core.Simulation, target *core.Unit, spell *core.Spell) {
			baseDamage := sim.Roll(baseJoRMinDamage, baseJoRMaxDamage) * impSoRModifier
			spell.CalcAndDealDamage(sim, target, baseDamage, spell.OutcomeMagicHitAndCrit)
		},
	})

	onSwingProc := paladin.RegisterSpell(core.SpellConfig{
		ActionID:      core.ActionID{SpellID: spellIdProc},
		SpellSchool:   core.SpellSchoolHoly,
		DefenseType:   core.DefenseTypeMagic,
		ProcMask:      core.ProcMaskEmpty,
		Flags:         core.SpellFlagMeleeMetrics,
		RequiredLevel: level,

		DamageMultiplier: 1 * paladin.getWeaponSpecializationModifier(), // This sounds quite unlikely, as specializations only affect physical damage
		ThreatMultiplier: 1,
		// Testing seems to show 2h benefits from spellpower about 12% more than 1h weapons.
		BonusCoefficient: effectBonusCoefficient * core.TernaryFloat64(paladin.Has2hEquipped(), 1.12, 1.0),

		ApplyEffects: func(sim *core.Simulation, target *core.Unit, spell *core.Spell) {
			baseDamage := baseSoRDamage * impSoRModifier
			spell.CalcAndDealDamage(sim, target, baseDamage, spell.OutcomeAlwaysHit)
		},
	})

	// Seal of Righteousness aura.
	paladin.SealOfRighteousnessAura[rank] = paladin.RegisterAura(core.Aura{
		Label:    "Seal of Righteousness" + paladin.Label + strconv.Itoa(rank),
		ActionID: core.ActionID{SpellID: spellIdAura},
		Duration: time.Second * 30,

		OnSpellHitDealt: func(_ *core.Aura, sim *core.Simulation, spell *core.Spell, result *core.SpellResult) {
			if !result.Landed() {
				return
			}
			if spell.ProcMask.Matches(core.ProcMaskMeleeWhiteHit) {
				onSwingProc.Cast(sim, result.Target)
			}
		},
	})

	aura := paladin.SealOfRighteousnessAura[rank]

	paladin.SealOfRighteousness[rank] = paladin.RegisterSpell(core.SpellConfig{
		ActionID:    aura.ActionID,
		SpellSchool: core.SpellSchoolHoly,
		Flags:       core.SpellFlagAPL,

		ManaCost: core.ManaCostOptions{
			FlatCost:   manaCost - paladin.GetLibramSealCostReduction(),
			Multiplier: 1 - 0.03*float64(paladin.Talents.Benediction),
		},
		Cast: core.CastConfig{
			DefaultCast: core.Cast{
				GCD: core.GCDDefault,
			},
		},

		ApplyEffects: func(sim *core.Simulation, _ *core.Unit, _ *core.Spell) {
			paladin.ApplySeal(aura, onJudgementProc, sim)
		},
	})
}

func (paladin *Paladin) registerSealOfRighteousnessSpellAndAura() {
	paladin.SealOfRighteousness = make([]*core.Spell, sorRanks+1)
	paladin.SealOfRighteousnessAura = make([]*core.Aura, sorRanks+1)

	for rank := 1; rank <= sorRanks; rank++ {
		if int(paladin.Level) >= sorLevels[rank] {
			paladin.MaxRankRighteousness = rank
			paladin.applySealOfRighteousnessSpellAndAuraBaseConfig(rank)
		}
	}
}

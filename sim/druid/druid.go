package druid

import (
	"time"

	"github.com/wowsims/sod/sim/core"
	"github.com/wowsims/sod/sim/core/proto"
	"github.com/wowsims/sod/sim/core/stats"
)

const (
	SpellFlagOmen = core.SpellFlagAgentReserved1
)

var TalentTreeSizes = [3]int{16, 16, 15}

const (
	SpellCode_DruidNone int32 = iota
	SpellCode_DruidMoonfire
	SpellCode_DruidShred
	SpellCode_DruidStarfire
	SpellCode_DruidStarsurge
	SpellCode_DruidWrath
)

type Druid struct {
	core.Character
	SelfBuffs
	Talents *proto.DruidTalents

	StartingForm DruidForm

	RebirthTiming     float64
	BleedsActive      int
	AssumeBleedActive bool

	ReplaceBearMHFunc core.ReplaceMHSwing

	Barkskin             *DruidSpell
	DemoralizingRoar     *DruidSpell
	Enrage               *DruidSpell
	FaerieFire           *DruidSpell
	FerociousBite        *DruidSpell
	ForceOfNature        *DruidSpell
	FrenziedRegeneration *DruidSpell
	Hurricane            []*DruidSpell
	InsectSwarm          *DruidSpell
	GiftOfTheWild        *DruidSpell
	Lacerate             *DruidSpell
	Languish             *DruidSpell
	MangleBear           *DruidSpell
	MangleCat            *DruidSpell
	Berserk              *DruidSpell
	Maul                 *DruidSpell
	MaulQueueSpell       *DruidSpell
	Moonfire             []*DruidSpell
	Rebirth              *DruidSpell
	Rake                 *DruidSpell
	Rip                  *DruidSpell
	SavageRoar           *DruidSpell
	Shred                *DruidSpell
	Starfire             []*DruidSpell
	Starfall             *DruidSpell
	StarfallSplash       *DruidSpell
	Starsurge            *DruidSpell
	Sunfire              *DruidSpell
	SurvivalInstincts    *DruidSpell
	SwipeBear            *DruidSpell
	SwipeCat             *DruidSpell
	TigersFury           *DruidSpell
	Typhoon              *DruidSpell
	Wrath                []*DruidSpell

	BearForm    *DruidSpell
	CatForm     *DruidSpell
	MoonkinForm *DruidSpell

	BarkskinAura             *core.Aura
	BearFormAura             *core.Aura
	BerserkAura              *core.Aura
	CatFormAura              *core.Aura
	ClearcastingAura         *core.Aura
	DemoralizingRoarAuras    core.AuraArray
	DreamstateManaRegenAura  *core.Aura
	EnrageAura               *core.Aura
	EclipseAura              *core.Aura
	FaerieFireAuras          core.AuraArray
	FrenziedRegenerationAura *core.Aura
	FurorAura                *core.Aura
	FuryOfStormrageAura      *core.Aura
	MaulQueueAura            *core.Aura
	MoonkinFormAura          *core.Aura
	NaturesGraceProcAura     *core.Aura
	PredatoryInstinctsAura   *core.Aura
	SurvivalInstinctsAura    *core.Aura
	TigersFuryAura           *core.Aura
	SavageRoarAura           *core.Aura
	SolarEclipseProcAura     *core.Aura
	LunarEclipseProcAura     *core.Aura
	WildStrikesBuffAura      *core.Aura

	BleedCategories core.ExclusiveCategoryArray

	PrimalPrecisionRecoveryMetrics *core.ResourceMetrics
	SavageRoarDurationTable        [6]time.Duration

	MoonfireDotMultiplier float64
	SunfireDotMultiplier  float64

	form         DruidForm
	disabledMCDs []*core.MajorCooldown
}

type SelfBuffs struct {
	InnervateTarget *proto.UnitReference
}

func (druid *Druid) GetCharacter() *core.Character {
	return &druid.Character
}

func (druid *Druid) AddRaidBuffs(raidBuffs *proto.RaidBuffs) {
	raidBuffs.GiftOfTheWild = max(raidBuffs.GiftOfTheWild, proto.TristateEffect_TristateEffectRegular)

	if (raidBuffs.GiftOfTheWild == proto.TristateEffect_TristateEffectRegular) && (druid.Talents.ImprovedMarkOfTheWild > 0) {
		druid.AddStats(core.BuffSpellByLevel[core.MarkOfTheWild][druid.Level].Multiply(0.07 * float64(druid.Talents.ImprovedMarkOfTheWild)))
	}

	// TODO: These should really be aura attached to the actual forms
	if druid.InForm(Moonkin) {
		raidBuffs.MoonkinAura = true
	}

	if druid.InForm(Cat|Bear) && druid.Talents.LeaderOfThePack {
		raidBuffs.LeaderOfThePack = true
	}
}

func (druid *Druid) NaturesGraceCastTime() func(spell *core.Spell) time.Duration {
	return func(spell *core.Spell) time.Duration {
		baseTime := core.TernaryDuration(druid.NaturesGraceProcAura.IsActive(),
			spell.DefaultCast.CastTime-(time.Millisecond*500),
			spell.DefaultCast.CastTime,
		)
		return spell.Unit.ApplyCastSpeedForSpell(baseTime, spell)
	}
}

// func (druid *Druid) TryMaul(sim *core.Simulation, mhSwingSpell *core.Spell) *core.Spell {
// 	return druid.MaulReplaceMH(sim, mhSwingSpell)
// }

func (druid *Druid) RegisterSpell(formMask DruidForm, config core.SpellConfig) *DruidSpell {
	prev := config.ExtraCastCondition
	prevModify := config.Cast.ModifyCast

	ds := &DruidSpell{FormMask: formMask}
	config.ExtraCastCondition = func(sim *core.Simulation, target *core.Unit) bool {
		// Check if we're in allowed form to cast
		// Allow 'humanoid' auto unshift casts
		if (ds.FormMask != Any && !druid.InForm(ds.FormMask)) && !ds.FormMask.Matches(Humanoid) {
			if sim.Log != nil {
				sim.Log("Failed cast to spell %s, wrong form", ds.ActionID)
			}
			return false
		}
		return prev == nil || prev(sim, target)
	}
	config.Cast.ModifyCast = func(sim *core.Simulation, s *core.Spell, c *core.Cast) {
		if !druid.InForm(ds.FormMask) && ds.FormMask.Matches(Humanoid) {
			druid.CancelShapeshift(sim)
		}
		if prevModify != nil {
			prevModify(sim, s, c)
		}
	}

	ds.Spell = druid.Unit.RegisterSpell(config)

	return ds
}

func (druid *Druid) Initialize() {
	druid.BleedCategories = druid.GetEnemyExclusiveCategories(core.BleedEffectCategory)

	druid.registerFaerieFireSpell()
	druid.registerInnervateCD()
	druid.registerCatnipCD()
}

func (druid *Druid) RegisterBalanceSpells() {
	druid.registerHurricaneSpell()
	// druid.registerInsectSwarmSpell()
	druid.registerMoonfireSpell()
	druid.registerStarfireSpell()
	druid.registerWrathSpell()
}

// TODO: Classic feral
func (druid *Druid) RegisterFeralCatSpells() {
	druid.registerCatFormSpell()
	// druid.registerBearFormSpell()
	// druid.registerEnrageSpell()
	druid.registerFerociousBiteSpell()
	// druid.registerMangleBearSpell()
	// druid.registerMaulSpell()
	// druid.registerLacerateSpell()
	druid.registerRakeSpell()
	druid.registerRipSpell()
	druid.registerShredSpell()
	// druid.registerSwipeBearSpell()
	// druid.registerSwipeCatSpell()
	druid.registerTigersFurySpell()
}

// TODO: Classic feral tank
func (druid *Druid) RegisterFeralTankSpells() {
	// druid.registerBarkskinCD()
	// druid.registerBerserkCD()
	// druid.registerBearFormSpell()
	// druid.registerDemoralizingRoarSpell()
	// druid.registerEnrageSpell()
	// druid.registerFrenziedRegenerationCD()
	// druid.registerMangleBearSpell()
	// druid.registerMaulSpell()
	// druid.registerLacerateSpell()
	// druid.registerRakeSpell()
	// druid.registerRipSpell()
	// druid.registerSurvivalInstinctsCD()
	// druid.registerSwipeBearSpell()
}

func (druid *Druid) Reset(_ *core.Simulation) {
	druid.BleedsActive = 0
	druid.form = druid.StartingForm
	druid.disabledMCDs = []*core.MajorCooldown{}
}

func New(char *core.Character, form DruidForm, selfBuffs SelfBuffs, talents string) *Druid {
	druid := &Druid{
		Character:    *char,
		SelfBuffs:    selfBuffs,
		Talents:      &proto.DruidTalents{},
		StartingForm: form,
		form:         form,
	}
	core.FillTalentsProto(druid.Talents.ProtoReflect(), talents, TalentTreeSizes)
	druid.EnableManaBar()

	// TODO: Class druid physical stats
	druid.AddStatDependency(stats.Strength, stats.AttackPower, 2)
	druid.AddStatDependency(stats.BonusArmor, stats.Armor, 1)
	druid.AddStatDependency(stats.Agility, stats.MeleeCrit, core.CritPerAgiAtLevel[char.Class][int(druid.Level)]*core.CritRatingPerCritChance)
	druid.AddStatDependency(stats.Intellect, stats.SpellCrit, core.CritPerIntAtLevel[char.Class][int(druid.Level)]*core.SpellCritRatingPerCritChance)
	// TODO: Update DodgePerAgiAtLevel with the appropriate value for each level
	druid.AddStatDependency(stats.Agility, stats.Dodge, core.DodgePerAgiAtLevel[char.Class][int(druid.Level)])

	// Druids get extra melee haste
	// druid.PseudoStats.MeleeHasteRatingPerHastePercent /= 1.3

	// Switch to using AddStat as PseudoStat is being removed
	// druid.PseudoStats.BaseDodge += 0.056097

	return druid
}

type DruidSpell struct {
	*core.Spell
	FormMask DruidForm
}

func (ds *DruidSpell) IsReady(sim *core.Simulation) bool {
	if ds == nil {
		return false
	}
	return ds.Spell.IsReady(sim)
}

func (ds *DruidSpell) CanCast(sim *core.Simulation, target *core.Unit) bool {
	if ds == nil {
		return false
	}
	return ds.Spell.CanCast(sim, target)
}

func (ds *DruidSpell) IsEqual(s *core.Spell) bool {
	if ds == nil || s == nil {
		return false
	}
	return ds.Spell == s
}

func (druid *Druid) HasRune(rune proto.DruidRune) bool {
	return druid.HasRuneById(int32(rune))
}

func (druid *Druid) baseRuneAbilityDamage() float64 {
	return 9.183105 + 0.616405*float64(druid.Level) + 0.028608*float64(druid.Level*druid.Level)
}

// Agent is a generic way to access underlying druid on any of the agents (for example balance druid.)
type DruidAgent interface {
	GetDruid() *Druid
}

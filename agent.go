package sim1

import "image/color"

type Agent struct {
	X, Y  int
	Genes uint64
}

func (a *Agent) Color() color.Color {
	return color.RGBA{
		R: uint8(a.Genes&GeneMaskColor&0xF00>>8) * 16,
		G: uint8(a.Genes&GeneMaskColor&0xF0>>4) * 16,
		B: uint8(a.Genes&GeneMaskColor&0xF) * 16,
		A: 255,
	}
}

func (a *Agent) Mate(b *Agent, matingType MatingMaskType) *Agent {
	if _, ok := matingMaskPairs[matingType]; !ok {
		panic("unknown mating type")
	}

	return &Agent{
		Genes: (a.Genes & matingMaskPairs[matingType][0]) |
			(b.Genes & matingMaskPairs[matingType][1]),
	}
}

func (a *Agent) Mutate(pattern uint64) {
	a.Genes ^= pattern
}

//func (a *Agent) NextAction(obs Observation)

const (
	GeneMaskColor = 0xFFF
	GeneMaskSight = 0xF << 12
	GeneMaskBrain = 0xFFFF << 16
)

type MatingMaskType string

const (
	MatingMaskHalf MatingMaskType = "half"
	MatingMaskByte MatingMaskType = "byte"
	MatingMaskBit  MatingMaskType = "bit"
)

var matingMaskPairs = map[MatingMaskType][2]uint64{
	MatingMaskHalf: {
		0xFFFFFFFF00000000,
		0x00000000FFFFFFFF,
	},
	MatingMaskByte: {
		0xFF00FF00FF00FF00,
		0x00FF00FF00FF00FF,
	},
	MatingMaskBit: {
		0x5555555555555555,
		0xAAAAAAAAAAAAAAAA,
	},
}

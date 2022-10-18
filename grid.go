package sim1

import (
	"image"
	"image/color"
	"math"
	"math/rand"
	"time"
)

type Grid struct {
	size        int
	PPC         int
	BorderWidth int
	BorderColor color.Color
	Background  color.Color
	Cells       [][]*Agent
	Population  []*Agent
}

func NewGrid(size int, pixelsPerCell int) *Grid {
	if pixelsPerCell < 1 || !isPerfectSquare(pixelsPerCell) {
		panic("PPC must be a positive perfect square")
	}

	cells := make([][]*Agent, size)
	for i := range cells {
		cells[i] = make([]*Agent, size)
	}

	return &Grid{
		size:        size,
		PPC:         int(math.Sqrt(float64(pixelsPerCell))),
		BorderWidth: 1,
		BorderColor: color.Black,
		Background:  color.White,

		Cells:      cells,
		Population: make([]*Agent, size),
	}
}

func (g *Grid) PopulateRandom(population int) {
	rand.Seed(time.Now().UnixNano())

	for i := 0; i < population; i++ {
		g.AddAgent(
			rand.Intn(g.size),
			rand.Intn(g.size),
			&Agent{
				Genes: rand.Uint64(),
			},
		)
	}
}

func (g *Grid) AddAgent(x, y int, agent *Agent) {
	if x < 0 || y < 0 || x >= g.size || y >= g.size {
		panic("agent location out of range")
	}

	agent.X, agent.Y = x, y
	g.Cells[agent.X][agent.Y] = agent
	g.Population = append(g.Population, agent)
}

func (g *Grid) ColorModel() color.Model {
	return color.RGBAModel
}

func (g *Grid) Bounds() image.Rectangle {
	return image.Rectangle{
		Max: image.Point{
			X: g.size*g.PPC + g.BorderWidth*2,
			Y: g.size*g.PPC + g.BorderWidth*2,
		},
	}
}

func (g *Grid) At(x, y int) color.Color {
	if x < g.BorderWidth || y < g.BorderWidth ||
		x >= g.size*g.PPC+g.BorderWidth || y >= g.size*g.PPC+g.BorderWidth {
		return g.BorderColor
	}

	x = (x - g.BorderWidth) / g.PPC
	y = (y - g.BorderWidth) / g.PPC

	if g.Cells[x][y] == nil {
		return g.Background
	}

	return g.Cells[x][y].Color()
}

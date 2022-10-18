package main

import (
	"math/rand"
	"sim1"
	"time"
)

const SimSize = 128
const SimPopulation = 200
const SimEpochsPerGen = 200
const SimGens = 10
const PlotRes = 9

var grid *sim1.Grid

func init() {
	rand.Seed(time.Now().UnixNano())
	grid = sim1.NewGrid(SimSize, PlotRes)
	grid.PopulateRandom(SimPopulation)
	grid.BorderWidth = 2
}

func main() {
	for gen := 0; gen < SimGens; gen++ {
		for epoch := 0; epoch < SimEpochsPerGen; epoch++ {

		}
	}

	sim1.PlotPNG(grid, `Gen#0 Epoch#0`, "out.png")
}

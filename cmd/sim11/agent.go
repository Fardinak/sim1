package main

import (
	"fmt"
	"image/color"
	"math"
)

const (
	ActionMove = "move"
	ActionEat  = "eat"
	ActionMate = "mate"
)

type Agent struct {
	X       uint      `json:"x"`
	Y       uint      `json:"y"`
	Gen     uint      `json:"gen"`
	DNA     uint32    `json:"dna"`
	ID      string    `json:"id"`
	Parents [2]string `json:"parents,omitempty"`
}

type AgentObservation struct {
	ID    string
	Color color.RGBA
}

type AgentIntent struct {
	Action    string `json:"action,omitempty"`
	Direction string `json:"direction,omitempty"`
	MateID    string `json:"mate_id,omitempty"`
}

func NewRandomAgent() *Agent {
	return &Agent{
		ID:  fmt.Sprintf("0x%08X", rrand[uint32](0, 0xFFFFFFFF)),
		DNA: rrand[uint32](0, 0xFFFFFFFF),
		X:   rrand[uint](0, SimSize),
		Y:   rrand[uint](0, SimSize),
		Gen: 1,
	}
}

func NewOffspringAgent(agent1, agent2 *Agent) *Agent {
	return &Agent{
		ID:      fmt.Sprintf("0x%08X", rrand[uint32](0, 0xFFFFFFFF)),
		DNA:     UniformCrossover(agent1.DNA, agent2.DNA, 0x55555555),
		Gen:     max(agent1.Gen, agent2.Gen) + 1,
		Parents: [2]string{agent1.ID, agent2.ID},
	}
}

func (a *Agent) Observe() *AgentObservation {
	return &AgentObservation{
		ID: a.ID,
		Color: color.RGBA{
			R: uint8(a.DNA&GeneMaskColor&0xF00>>8) * 16,
			G: uint8(a.DNA&GeneMaskColor&0x0F0>>4) * 16,
			B: uint8(a.DNA&GeneMaskColor&0x00F) * 16,
			A: 255,
		},
	}
}

func (a *Agent) Action(o []*GridObservation) *AgentIntent {
	var max float64
	var observation *GridObservation
	var fitness float64

	ownColor := a.Observe().Color
	for _, obs := range o {
		fitness = colorCloseness(ownColor, obs.Agent.Color)
		if fitness > max {
			max = fitness
			observation = obs
		}
	}

	if observation == nil {
		return &AgentIntent{
			Action:    ActionMove,
			Direction: ([]string{"left", "right", "up", "down"})[rrand[int](0, 4)],
		}
	}

	if observation.Distance == 0 {
		return &AgentIntent{
			Action: ActionMate,
			MateID: observation.Agent.ID,
		}
	}

	return &AgentIntent{
		Action:    ActionMove,
		Direction: observation.Direction,
	}
}

func colorCloseness(c1, c2 color.RGBA) float64 {
	return 1 / (math.Abs(float64(c1.R-c2.R)) +
		math.Abs(float64(c1.G-c2.G)) +
		math.Abs(float64(c1.B-c2.B)) +
		1)
}

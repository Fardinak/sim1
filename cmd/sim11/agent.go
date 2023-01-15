package main

import (
	"fmt"
	"image/color"
	"math"
)

const (
	GeneMaskSight  = 0x0000000F
	GeneMaskSpeed  = 0x000000F0
	GeneMaskEnergy = 0x00000F00
	GeneMaskBrain  = 0xFFFF0000
)

const (
	ActionMove = "move"
	ActionEat  = "eat"
	ActionMate = "mate"
)

const (
	EnergyCostBase = 1
	EnergyCostMove = 1
	EnergyCostMate = 3
)

type Agent struct {
	X       uint      `json:"x"`
	Y       uint      `json:"y"`
	Gen     uint      `json:"gen"`
	Energy  uint      `json:"energy"`
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
	dna := rrand[uint32](0, 0xFFFFFFFF)

	return &Agent{
		ID:     fmt.Sprintf("0x%08X", rrand[uint32](0, 0xFFFFFFFF)),
		DNA:    dna,
		Energy: uint(dna & GeneMaskEnergy >> 8),
		X:      rrand[uint](0, SimSize),
		Y:      rrand[uint](0, SimSize),
		Gen:    1,
	}
}

func NewOffspringAgent(agent1, agent2 *Agent) *Agent {
	dna := UniformCrossover(agent1.DNA, agent2.DNA, 0x55555555)

	return &Agent{
		ID:      fmt.Sprintf("0x%08X", rrand[uint32](0, 0xFFFFFFFF)),
		DNA:     dna,
		Energy:  uint(dna & GeneMaskEnergy >> 8),
		Gen:     max(agent1.Gen, agent2.Gen) + 1,
		Parents: [2]string{agent1.ID, agent2.ID},
	}
}

func (a *Agent) Observe() *AgentObservation {
	return &AgentObservation{
		ID: a.ID,
		Color: color.RGBA{
			R: uint8((a.DNA & 0xFFFF0000 >> 16) / 256),
			G: uint8(a.DNA & 0x000000FF),
			B: uint8(a.DNA&0x00000F00>>8) * 16,
			A: 255,
		},
	}
}

func (a *Agent) Action(o []*GridObservation) *AgentIntent {
	var ownColor = a.Observe().Color
	var max float64
	var observation *GridObservation
	var fitness float64
	var priority = ([]string{"mate", "eat"})[rrand[int](0, 2)]

	for _, obs := range o {
		switch obs.ContentType {
		case "agent":
			if priority != "mate" && observation != nil {
				continue
			}
			fitness = colorCloseness(ownColor, obs.Agent.Color)
			if fitness > max {
				max = fitness
				observation = obs
			}
		case "food":
			if priority != "eat" && observation != nil {
				continue
			}
			observation = obs
		default:
			panic("unknown grid cell contents: " + obs.ContentType)
		}
	}

	if observation == nil {
		return &AgentIntent{
			Action:    ActionMove,
			Direction: ([]string{"left", "right", "up", "down"})[rrand[int](0, 4)],
		}
	}

	if observation.Distance == 0 {
		if observation.ContentType == "agent" {
			return &AgentIntent{
				Action: ActionMate,
				MateID: observation.Agent.ID,
			}
		} else if observation.ContentType == "food" {
			return &AgentIntent{
				Action:    ActionEat,
				Direction: observation.Direction,
			}
		}
	}

	return &AgentIntent{
		Action:    ActionMove,
		Direction: observation.Direction,
	}
}

func (a *Agent) Eat(addedEnergy uint) {
	a.Energy += addedEnergy
}

func (a *Agent) IncurActionCost(action string) (died bool) {
	var cost uint
	switch action {
	case ActionMove:
		cost = EnergyCostMove
	case ActionMate:
		cost = EnergyCostMate
	case ActionEat:
		panic("not implemented")
	default:
		panic("unknown action: " + action)
	}

	if cost >= a.Energy {
		a.Energy = 0
		return true
	}

	a.Energy -= cost
	return false
}

func (a *Agent) IncurBaseEnergyCost() (died bool) {
	if EnergyCostBase >= a.Energy {
		a.Energy = 0
		return true
	}

	a.Energy -= EnergyCostBase
	return false
}

func colorCloseness(c1, c2 color.RGBA) float64 {
	return 1 / (math.Abs(float64(c1.R-c2.R)) +
		math.Abs(float64(c1.G-c2.G)) +
		math.Abs(float64(c1.B-c2.B)) +
		1)
}

package main

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"os"
	"time"
)

const SimSize = 150
const SimPopulation = 50
const SimEpochs = 100

const (
	GeneMaskColor = 0x00000FFF
	GeneMaskSight = 0x0000F000
	GeneMaskSpeed = 0x000F0000
	GeneMaskBrain = 0xFFF00000
)

type GridObservation struct {
	Direction string
	Distance  uint
	Agent     *AgentObservation
}

type EpochLog struct {
	Time       int64                   `json:"time"`
	Population []*Agent                `json:"population"`
	Actions    map[string]*AgentIntent `json:"actions"`
}

var population []*Agent
var grid [SimSize][SimSize]*Agent
var matingRequests map[string]string

func init() {
	rand.Seed(time.Now().UnixNano())

	population = make([]*Agent, SimPopulation, SimPopulation*2)
	matingRequests = make(map[string]string)
}

func populateGrid() {
	for i := 0; i < SimPopulation; i++ {
		a := NewRandomAgent()
		for grid[a.X][a.Y] != nil {
			a = NewRandomAgent()
		}

		population[i] = a
		grid[a.X][a.Y] = a
	}
}

func observe(a *Agent) (o []*GridObservation) {
	sight := uint(a.DNA & GeneMaskSight >> 12)
	if sight < 1 {
		return
	}

	o = make([]*GridObservation, 0, 9)

	// Look East
	for i := uint(1); i <= min(sight, SimSize-1-a.X); i++ {
		cell := grid[a.X+i][a.Y]
		if cell != nil {
			o = append(o, &GridObservation{
				Direction: "right",
				Distance:  i - 1,
				Agent:     cell.Observe(),
			})
			break
		}
	}

	// Look West
	for i := uint(1); i <= min(sight, a.X); i++ {
		cell := grid[a.X-i][a.Y]
		if cell != nil {
			o = append(o, &GridObservation{
				Direction: "left",
				Distance:  i - 1,
				Agent:     cell.Observe(),
			})
			break
		}
	}

	// Look South
	for i := uint(1); i <= min(sight, SimSize-1-a.Y); i++ {
		cell := grid[a.X][a.Y+i]
		if cell != nil {
			o = append(o, &GridObservation{
				Direction: "down",
				Distance:  i - 1,
				Agent:     cell.Observe(),
			})
			break
		}
	}

	// Look North
	for i := uint(1); i <= min(sight, a.Y); i++ {
		cell := grid[a.X][a.Y-i]
		if cell != nil {
			o = append(o, &GridObservation{
				Direction: "up",
				Distance:  i - 1,
				Agent:     cell.Observe(),
			})
			break
		}
	}

	return
}

func agentMove(a *Agent, direction string) {
	length := uint((a.DNA & GeneMaskSpeed) >> 16)

	grid[a.X][a.Y] = nil
	switch direction {
	case "left":
		a.X = max(a.X-length, 0)
		for grid[a.X][a.Y] != nil {
			a.X += 1
		}
	case "right":
		a.X = min(a.X+length, SimSize-1)
		for grid[a.X][a.Y] != nil {
			a.X -= 1
		}
	case "up":
		a.Y = uint(max[int](int(a.Y-length), 0))
		for grid[a.X][a.Y] != nil {
			a.Y += 1
		}
	case "down":
		a.Y = min(a.Y+length, SimSize-1)
		for grid[a.X][a.Y] != nil {
			a.Y -= 1
		}
	default:
		panic("unknown direction: " + direction)
	}
	grid[a.X][a.Y] = a
}

func requestMating(a *Agent, mateID string) {
	if matingRequests[mateID] == a.ID {
		delete(matingRequests, mateID)
		mate(a, findAgentByID(mateID))
	}

	matingRequests[a.ID] = mateID
}

func mate(agent1, agent2 *Agent) (offspring *Agent) {
	offspring = NewOffspringAgent(agent1, agent2)

	// Available Positions
	aPos := make([][2]uint, 0, 8)

	// Positioning
	for ox := -1; ox <= 1; ox++ {
		for oy := -1; oy <= 1; oy++ {
			if ox == 0 && oy == 0 {
				continue
			}

			x, y := int(agent1.X)+ox, int(agent1.Y)+oy

			if x < 0 || x >= SimSize || y < 0 || y >= SimSize {
				continue
			}

			if grid[x][y] == nil {
				aPos = append(aPos, [2]uint{uint(x), uint(y)})
			}
		}
	}

	if len(aPos) == 0 {
		return nil
	}

	// Choose an available position at random
	pos := aPos[rrand[int](0, len(aPos))]
	offspring.X = pos[0]
	offspring.Y = pos[1]

	population = append(population, offspring)
	grid[offspring.X][offspring.Y] = offspring

	return
}

func performAction(a *Agent, i *AgentIntent) {
	switch i.Action {
	case ActionMove:
		agentMove(a, i.Direction)
	case ActionEat:
		panic("not implemented")
	case ActionMate:
		requestMating(a, i.MateID)
	default:
		panic("unknown action: " + i.Action)
	}
}

func findAgentByID(id string) *Agent {
	for _, a := range population {
		if a.ID == id {
			return a
		}
	}

	return nil
}

func main() {
	populateGrid()

	var simLog = map[string]any{
		"size":         SimSize,
		"population":   SimPopulation,
		"total_epochs": SimEpochs,
		"started_at":   time.Now().Unix(),
	}
	var epochLog = []EpochLog{
		{0, population, map[string]*AgentIntent{}},
	}

	for e := 1; e <= SimEpochs; e++ {
		start := time.Now()
		actionLog := make(map[string]*AgentIntent, len(population))
		matingRequests = make(map[string]string)

		fmt.Printf("Epoch #%d started at %s\n", e, start)
		for _, agent := range population {
			observation := observe(agent)
			intent := agent.Action(observation)
			performAction(agent, intent)

			actionLog[agent.ID] = intent
		}

		epochLog = append(epochLog, EpochLog{
			Time:       time.Since(start).Milliseconds(),
			Population: cloneSlice(population),
			Actions:    actionLog,
		})
	}

	simLog["epoch"] = epochLog

	out, err := json.Marshal(simLog)
	if err != nil {
		panic(err)
	}

	err = os.WriteFile(
		fmt.Sprintf("%d.json", simLog["started_at"].(int64)),
		out,
		0666,
	)
	if err != nil {
		panic(err)
	}
}

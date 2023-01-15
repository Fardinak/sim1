package main

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"os"
	"time"
)

const SimSize = 150
const SimEpochs = 200
const SimPopulation = 200
const SimFoodUnits = 800

type EpochLog struct {
	Time       int64                   `json:"time"`
	Population []*Agent                `json:"population"`
	Actions    map[string]*AgentIntent `json:"actions"`
}

var population []*Agent
var grid [SimSize][SimSize]*GridContent
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
		grid[a.X][a.Y] = NewAgentCell(a)
	}

	for i := 0; i < SimFoodUnits; i++ {
		x, y := rrand[uint](0, SimSize), rrand[uint](0, SimSize)
		for grid[x][y] != nil {
			x, y = rrand[uint](0, SimSize), rrand[uint](0, SimSize)
		}

		grid[x][y] = NewFoodCell()
	}
}

func observe(a *Agent) (obs []*GridObservation) {
	sight := uint(a.DNA & GeneMaskSight >> 12)
	if sight < 1 {
		return
	}

	obs = make([]*GridObservation, 0, 9)

	// Look East
	for i := uint(1); i <= min(sight, SimSize-1-a.X); i++ {
		cell := grid[a.X+i][a.Y]
		if cell != nil {
			o := &GridObservation{
				Direction:   "right",
				Distance:    i - 1,
				ContentType: cell.ContentType,
			}

			if cell.ContentType == GridContentAgent {
				o.Agent = cell.Agent.Observe()
			}

			obs = append(obs, o)
			break
		}
	}

	// Look West
	for i := uint(1); i <= min(sight, a.X); i++ {
		cell := grid[a.X-i][a.Y]
		if cell != nil {
			o := &GridObservation{
				Direction:   "left",
				Distance:    i - 1,
				ContentType: cell.ContentType,
			}

			if cell.ContentType == GridContentAgent {
				o.Agent = cell.Agent.Observe()
			}

			obs = append(obs, o)
			break
		}
	}

	// Look South
	for i := uint(1); i <= min(sight, SimSize-1-a.Y); i++ {
		cell := grid[a.X][a.Y+i]
		if cell != nil {
			o := &GridObservation{
				Direction:   "down",
				Distance:    i - 1,
				ContentType: cell.ContentType,
			}

			if cell.ContentType == GridContentAgent {
				o.Agent = cell.Agent.Observe()
			}

			obs = append(obs, o)
			break
		}
	}

	// Look North
	for i := uint(1); i <= min(sight, a.Y); i++ {
		cell := grid[a.X][a.Y-i]
		if cell != nil {
			o := &GridObservation{
				Direction:   "up",
				Distance:    i - 1,
				ContentType: cell.ContentType,
			}

			if cell.ContentType == GridContentAgent {
				o.Agent = cell.Agent.Observe()
			}

			obs = append(obs, o)
			break
		}
	}

	// Randomize observations
	rand.Shuffle(len(obs), func(i, j int) {
		obs[i], obs[j] = obs[j], obs[i]
	})

	return
}

func agentMove(a *Agent, direction string) {
	length := uint(a.DNA & GeneMaskSpeed >> 16)

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
	grid[a.X][a.Y] = NewAgentCell(a)

	a.IncurActionCost(ActionMove)
}

func agentEat(a *Agent, direction string) {
	x, y := a.X, a.Y
	switch direction {
	case "left":
		x--
	case "right":
		x++
	case "up":
		y--
	case "down":
		y++
	}

	a.Eat(2)
	grid[x][y] = nil
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

	// Custody battle
	guardian := ([2]*Agent{agent1, agent2})[rrand[int](0, 2)]

	// Available Positions
	aPos := make([][2]uint, 0, 8)

	// Positioning
	for ox := -1; ox <= 1; ox++ {
		for oy := -1; oy <= 1; oy++ {
			if ox == 0 && oy == 0 {
				continue
			}

			x, y := int(guardian.X)+ox, int(guardian.Y)+oy

			if x < 0 || x >= SimSize || y < 0 || y >= SimSize {
				continue
			}

			if grid[x][y] == nil {
				aPos = append(aPos, [2]uint{uint(x), uint(y)})
			}
		}
	}

	// Discard if there is no space
	if len(aPos) == 0 {
		return nil
	}

	// Choose an available position at random
	pos := aPos[rrand[int](0, len(aPos))]
	offspring.X = pos[0]
	offspring.Y = pos[1]

	population = append(population, offspring)
	grid[offspring.X][offspring.Y] = NewAgentCell(offspring)

	agent1.IncurActionCost(ActionMate)
	agent2.IncurActionCost(ActionMate)

	return
}

func performAction(a *Agent, i *AgentIntent) {
	switch i.Action {
	case ActionMove:
		agentMove(a, i.Direction)
	case ActionEat:
		agentEat(a, i.Direction)
	case ActionMate:
		requestMating(a, i.MateID)
	default:
		panic("unknown action: " + i.Action)
	}

	a.IncurBaseEnergyCost()
}

func findAgentByID(id string) *Agent {
	for _, agent := range population {
		if agent.ID == id {
			return agent
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
		{0, cloneSlice(population), map[string]*AgentIntent{}},
	}

	for e := 1; e <= SimEpochs; e++ {
		start := time.Now()
		actionLog := make(map[string]*AgentIntent, len(population))
		matingRequests = make(map[string]string)

		fmt.Printf("Epoch #%d started at %s\n", e, start)

		// GC
		for i := 0; i < len(population); i++ {
			agent := population[i]

			if agent.Energy == 0 {
				grid[agent.X][agent.Y] = nil
				population = append(population[:i], population[i+1:]...)
				continue
			}
		}

		// Action Cycle
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

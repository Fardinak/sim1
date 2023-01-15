package main

type GridContentType string

const (
	GridContentEmpty GridContentType = "empty"
	GridContentAgent GridContentType = "agent"
	GridContentFood  GridContentType = "food"
)

type GridContent struct {
	ContentType GridContentType
	Agent       *Agent
}

type GridObservation struct {
	Direction   string
	Distance    uint
	ContentType GridContentType
	Agent       *AgentObservation
}

func NewAgentCell(agent *Agent) *GridContent {
	return &GridContent{
		ContentType: GridContentAgent,
		Agent:       agent,
	}
}

func NewFoodCell() *GridContent {
	return &GridContent{
		ContentType: GridContentFood,
	}
}

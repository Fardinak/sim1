package sim1

const (
	ActionNone = iota
	ActionMove
	ActionMate
)

type MoveDirection string

const (
	DirectionN  MoveDirection = "N"
	DirectionNN MoveDirection = "NE"
	DirectionE  MoveDirection = "E"
	DirectionSE MoveDirection = "SE"
	DirectionS  MoveDirection = "S"
	DirectionSW MoveDirection = "SW"
	DirectionW  MoveDirection = "W"
	DirectionNW MoveDirection = "NW"
)

type ActionMoveParams struct {
	Direction MoveDirection
	Distance  int
}

type ActionMateParams struct{}

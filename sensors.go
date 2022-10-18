package sim1

import "image/color"

type VisionSensor struct {
	Depth uint8
}

type VisionReading struct {
	Empty      bool
	Edge       bool
	Distance   int
	AgentColor color.Color
}

type VisionObservation struct {
	// North
	N *VisionReading
	// East
	E *VisionReading
	// South
	S *VisionReading
	// West
	W *VisionReading
}

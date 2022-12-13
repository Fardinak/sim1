package main

func UniformCrossover(dna1, dna2, pattern uint32) uint32 {
	return (dna1 & pattern) | (dna2 & (pattern ^ 0xFFFFFFFF))
}

package main

import "math/rand"

type Number interface {
	int | uint | int32 | uint32 | int64 | uint64
}

// rrand returns, as an int, a non-negative pseudo-random number in the half-closed interval [min,max)
func rrand[T Number](min, max int) T {
	return T(rand.Intn(max-min) + min)
}

func min[T Number](a, b T) T {
	if int64(b) < int64(a) {
		return b
	}
	return a
}

func max[T Number](a, b T) T {
	if int64(b) > int64(a) {
		return b
	}
	return a
}

func cloneSlice[T any](src []*T) (dst []*T) {
	dst = make([]*T, len(src))

	for i, p := range src {
		if p == nil {
			continue
		}

		v := *p
		dst[i] = &v
	}

	return
}

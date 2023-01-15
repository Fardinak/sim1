# Sim1
Sim1 is an AI experiment, intended to provide a basic environment for agents modeled to represent simple organisms.

The goal is to create a simulator that mimics natural selection to:
1. Nurture genetically diverse agents, capable of surviving in their environment
2. Implement and test different AI/ML algorithms that observe and influence the agent's actions
3. Select for algorithms that provide general problem-solving capabilities resulting in optimum decision-making

It is an effort to make way for Synthetic Intelligence to be born within a simple environment.

## Code structure
* `/` Initial attempt at creating the sim
* `/cmd/sim1` Second attempt!
* `/cmd/sim11` Current implementation (under active development)
* `/cmd/simjs` First working prototype ([read more](cmd/simjs/README.md))
* `/viewer` Visualisation tool (automatically deployed at [fardinak.github.io/sim1](https://fardinak.github.io/sim1))

## How to run
```shell
$ go run ./cmd/sim11
```
`sim11` runs a complete simulation (currently with predefined constants defined in [main.go:L11-14](cmd/sim11/main.go#L11-L14)) and dumps the logs to a json file that can then be replayed and investigated using the [viewer](https://fardinak.github.io/sim1).

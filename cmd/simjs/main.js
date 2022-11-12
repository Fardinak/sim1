const fs = require('fs');

const SimSize = 256;
const SimPopulation = 128;
const SimEpochs = 20;

const
    GeneMaskColor = 0x00000FFF, // DNA1
    GeneMaskSight = 0x0000F000, // DNA1
    GeneMaskSpeed = 0x000F0000, // DNA1
    GeneMaskBrain = 0x0000FFFF; // DNA2
const
    ActionMove = 'move',
    ActionEat  = 'eat',
    ActionMate = 'mate';

function rrand(min, max) {
    return ~~(Math.random() * max + min);
}

function NewRandomAgent() {
    return {
        X: rrand(0, SimSize),
        Y: rrand(0, SimSize),
        DNA1: rrand(0, 2**32),
        DNA2: rrand(0, 2**32),
        ID: '0x'+(rrand(0, 2**32)>>>0).toString(16).toUpperCase(),
    }
}

let grid = [];
let population = [];

function populateGrid() {
    for (let i = 0; i < SimSize; i++) {
        grid[i] = new Array(SimSize);
    }

    for (let i = 0; i < SimPopulation; i++) {
        let a = NewRandomAgent()
        while (grid[a.X][a.Y] != null) {
            a = NewRandomAgent()
        }
        grid[a.X][a.Y] = a;
        population.push(a);
    }
}

function readAgent(a) {
    return {
        Color: {
            R: ((a.DNA1&GeneMaskColor&0xF00) >> 8) * 16,
            G: ((a.DNA1&GeneMaskColor&0x0F0) >> 4) * 16,
            B:  (a.DNA1&GeneMaskColor&0x00F) * 16,
        },
    }
}

function agentAction(a, o) {
    let dir = {1: 'left', 2: 'right', 3: 'up', 4: 'down'}[rrand(1, 4)];
    return {
        Action: ActionMove,
        Direction: dir,
    }
}

function observe(a) {
    let depth = (a.DNA1&GeneMaskSight) >> 12;
    if (depth < 1) return [];

    let o = [];
    const obs = (dir, dis, x) => o.push({
        direction: dir,
        distance:  dis,
        observation: readAgent(x),
    });

    if (a.X+1 < SimSize) for (let i = a.X+1; i <= Math.min(a.X+depth, SimSize-1); i++) {
        if (grid[i][a.Y] !== undefined) {
            obs('right', i, grid[i][a.Y]);
            break;
        }
    }
    if (a.X-1 >= 0) for (let i = a.X-1; i >= Math.max(a.X-depth, 0); i--) {
        if (grid[i][a.Y] !== undefined) {
            obs('left', i, grid[i][a.Y]);
            break;
        }
    }
    if (a.Y+1 < SimSize) for (let i = a.Y+1; i <= Math.min(a.Y+depth, SimSize-1); i++) {
        if (grid[a.X][i] !== undefined) {
            obs('down', i, grid[a.X][i]);
            break;
        }
    }
    if (a.Y-1 >= 0) for (let i = a.Y-1; i >= Math.max(a.Y-depth, 0); i--) {
        if (grid[a.X][i] !== undefined) {
            obs('up', i, grid[a.X][i]);
            break;
        }
    }

    return o;
}

function agentMove(a, dir) {
    let length = (a.DNA1&GeneMaskSpeed) >> 16;

    grid[a.X][a.Y] = undefined;
    switch (dir) {
        case 'left':
            a.X = Math.max(a.X - length, 0);
            while (grid[a.X][a.Y] != null) {
                a.X += 1;
            }
            break;
        case 'right':
            a.X = Math.min(a.X + length, SimSize-1);
            while (grid[a.X][a.Y] != null) {
                a.X -= 1;
            }
            break;
        case 'up':
            a.Y = Math.max(a.Y - length, 0);
            while (grid[a.X][a.Y] != null) {
                a.Y += 1;
            }
            break;
        case 'down':
            a.Y = Math.min(a.Y + length, SimSize-1);
            while (grid[a.X][a.Y] != null) {
                a.Y -= 1;
            }
            break;
        default:
            throw new Error("unknown direction: " + dir);
    }
    grid[a.X][a.Y] = a;
}

function performAction(agent, action) {
    switch (action.Action) {
        case ActionMove:
            agentMove(agent, action.Direction);
            break;
        case ActionEat:
            break;
        case ActionMate:
            break;
        default:
            throw new Error("unknown action: " + action);
    }
}


/**
 * EXECUTION LOOP
 * Look Alive...
 */
populateGrid()

let sim_log = {
    size: SimSize,
    population: SimPopulation,
    totalEpochs: SimEpochs,
    startedAt: Date.now(),
    epoch: [
        {
            time: 0,
            state: JSON.parse(JSON.stringify(population)),
        },
    ],
};

for (let e = 1; e <= SimEpochs; e++) {
    const _start = Date.now();
    console.log(`Epoch #${e} started at ${_start}`);

    for (let i = 0; i < population.length; i++) {
        let agent = population[i];
        let observation = observe(agent);
        let action = agentAction(agent, observation);

        performAction(agent, action);
    }

    sim_log.epoch.push({
        time: Date.now() - _start,
        state: JSON.parse(JSON.stringify(population)),
    });
}

fs.writeFileSync(`${sim_log.startedAt}.json`, JSON.stringify(sim_log));

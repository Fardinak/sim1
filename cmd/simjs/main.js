const fs = require('fs');

const SimSize = 150;
const SimPopulation = 50;
const SimEpochs = 100;

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
        Gen: 1,
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
        _agent: a,
        Color: {
            R: ((a.DNA1&GeneMaskColor&0xF00) >> 8) * 16,
            G: ((a.DNA1&GeneMaskColor&0x0F0) >> 4) * 16,
            B:  (a.DNA1&GeneMaskColor&0x00F) * 16,
        },
    }
}

function agentAction(a, o) {
    const colorCloseness = (c1, c2) => {
        return 1 / (
            Math.abs(c1.R - c2.R) +
            Math.abs(c1.G - c2.G) +
            Math.abs(c1.B - c2.B) +
            1);
    }

    let max = 0, mA, mC = readAgent(a).Color;
    for (let i = 0; i < o.length; i++) {
        let c = colorCloseness(mC, o[i].observation.Color);
        if (c > max) {
            max = c;
            mA = o[i];
        }
    }

    if (mA === undefined) {
        return {
            Action: ActionMove,
            Direction: {1: 'left', 2: 'right', 3: 'up', 4: 'down'}[rrand(1, 4)],
        }
    }

    if (mA.distance === 0) {
        return {
            Action: ActionMate,
            Mate: mA.observation._agent.ID,
        }
    }

    return {
        Action: ActionMove,
        Direction: mA.direction,
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
            obs('right', i-a.X-1, grid[i][a.Y]);
            break;
        }
    }
    if (a.X-1 >= 0) for (let i = a.X-1; i >= Math.max(a.X-depth, 0); i--) {
        if (grid[i][a.Y] !== undefined) {
            obs('left', a.X-i-1, grid[i][a.Y]);
            break;
        }
    }
    if (a.Y+1 < SimSize) for (let i = a.Y+1; i <= Math.min(a.Y+depth, SimSize-1); i++) {
        if (grid[a.X][i] !== undefined) {
            obs('down', i-a.Y-1, grid[a.X][i]);
            break;
        }
    }
    if (a.Y-1 >= 0) for (let i = a.Y-1; i >= Math.max(a.Y-depth, 0); i--) {
        if (grid[a.X][i] !== undefined) {
            obs('up', a.Y-i-1, grid[a.X][i]);
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
            requestMating(agent, action.Mate);
            break;
        default:
            throw new Error("unknown action: " + action);
    }
}

let matingRequests = {};
function requestMating(agent, mateID) {
    if (matingRequests[mateID] === agent.ID) {
        matingRequests[mateID] = undefined;
        mate(agent, population.find(a => a.ID === mateID));
    }

    matingRequests[agent.ID] = mateID;
}

function mate(agent1, agent2, strategy) {
    const strategies = [
        {
            maskA1: 0x55555555,
            maskA2: 0x55555555,
            maskB1: 0xAAAAAAAA,
            maskB2: 0xAAAAAAAA,
        }
    ];

    if (strategy === undefined || strategy === null) {
        strategy = rrand(0, strategies.length);
    }

    let offspring = {
        X: -1,
        Y: -1,
        DNA1: 0x0,
        DNA2: 0x0,
        Gen: Math.max(agent1.Gen, agent2.Gen) + 1,
        ID: '0x'+(rrand(0, 2**32)>>>0).toString(16).toUpperCase(),

        _parents: [agent1.ID, agent2.ID],
    };

    // Compose the offspring's DNA
    offspring.DNA1 = agent1.DNA1 & strategies[strategy].maskA1;
    offspring.DNA1 |= agent2.DNA1 & strategies[strategy].maskB1;
    offspring.DNA2 = agent1.DNA2 & strategies[strategy].maskA2;
    offspring.DNA2 |= agent2.DNA2 & strategies[strategy].maskB2;

    // TODO: Apply random mutations

    // Locate the offspring
    const pl = [
        {oX: 0, oY: 1},   // S
        {oX: 1, oY: 0},   // E
        {oX: 0, oY: -1},  // N
        {oX: -1, oY: 0},  // W
        {oX: 1, oY: 1},   // SE
        {oX: -1, oY: -1}, // NW
        {oX: 1, oY: -1},  // NE
        {oX: -1, oY: 1},  // SW
    ];

    for (let i = 0; i < pl.length; i++) {
        let x = agent1.X + pl[i].oX;
        let y = agent1.Y + pl[i].oY;

        if (x < 0 || x >= SimSize || y < 0 || y >= SimSize) continue;

        if (grid[x][y] === undefined) {
            offspring.X = x;
            offspring.Y = y;
            break;
        }
    }

    if (offspring.X === -1) return null;

    population.push(offspring);
    grid[offspring.X][offspring.Y] = offspring;
    return offspring;
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
            actions: {},
        },
    ],
};

for (let e = 1; e <= SimEpochs; e++) {
    const _start = Date.now();
    console.log(`Epoch #${e} started at ${_start}`);

    let actions = {};

    matingRequests = {};
    for (let i = 0; i < population.length; i++) {
        let agent = population[i];
        let observation = observe(agent);
        let action = agentAction(agent, observation);

        actions[agent.ID] = action;

        performAction(agent, action);
    }

    sim_log.epoch.push({
        time: Date.now() - _start,
        state: JSON.parse(JSON.stringify(population)),
        actions,
    });
}

fs.writeFileSync(`${sim_log.startedAt}.json`, JSON.stringify(sim_log));

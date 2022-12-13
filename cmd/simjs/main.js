const fs = require('fs');

const SimSize = 150;
const SimPopulation = 50;
const SimEpochs = 100;

const
    GeneMaskColor = 0x00000FFF,
    GeneMaskSight = 0x0000F000,
    GeneMaskSpeed = 0x000F0000,
    GeneMaskBrain = 0xFFF00000;
const
    ActionMove = 'move',
    ActionEat  = 'eat',
    ActionMate = 'mate';

function rrand(min, max) {
    return ~~(Math.random() * max + min);
}

function NewRandomAgent() {
    return {
        x: rrand(0, SimSize),
        y: rrand(0, SimSize),
        dna: rrand(0, 2**32),
        gen: 1,
        id: '0x'+(rrand(0, 2**32)>>>0).toString(16).toUpperCase(),
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
        while (grid[a.x][a.y] != null) {
            a = NewRandomAgent()
        }
        grid[a.x][a.y] = a;
        population.push(a);
    }
}

function readAgent(a) {
    return {
        _agent: a,
        Color: {
            R: ((a.dna&GeneMaskColor&0xF00) >> 8) * 16,
            G: ((a.dna&GeneMaskColor&0x0F0) >> 4) * 16,
            B:  (a.dna&GeneMaskColor&0x00F) * 16,
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
            Mate: mA.observation._agent.id,
        }
    }

    return {
        Action: ActionMove,
        Direction: mA.direction,
    }
}

function observe(a) {
    let depth = (a.dna&GeneMaskSight) >> 12;
    if (depth < 1) return [];

    let o = [];
    const obs = (dir, dis, x) => o.push({
        direction: dir,
        distance:  dis,
        observation: readAgent(x),
    });

    if (a.x+1 < SimSize) for (let i = a.x+1; i <= Math.min(a.x+depth, SimSize-1); i++) {
        if (grid[i][a.y] !== undefined) {
            obs('right', i-a.x-1, grid[i][a.y]);
            break;
        }
    }
    if (a.x-1 >= 0) for (let i = a.x-1; i >= Math.max(a.x-depth, 0); i--) {
        if (grid[i][a.y] !== undefined) {
            obs('left', a.x-i-1, grid[i][a.y]);
            break;
        }
    }
    if (a.y+1 < SimSize) for (let i = a.y+1; i <= Math.min(a.y+depth, SimSize-1); i++) {
        if (grid[a.x][i] !== undefined) {
            obs('down', i-a.y-1, grid[a.x][i]);
            break;
        }
    }
    if (a.y-1 >= 0) for (let i = a.y-1; i >= Math.max(a.y-depth, 0); i--) {
        if (grid[a.x][i] !== undefined) {
            obs('up', a.y-i-1, grid[a.x][i]);
            break;
        }
    }

    return o;
}

function agentMove(a, dir) {
    let length = (a.dna&GeneMaskSpeed) >> 16;

    grid[a.x][a.y] = undefined;
    switch (dir) {
        case 'left':
            a.x = Math.max(a.x - length, 0);
            while (grid[a.x][a.y] != null) {
                a.x += 1;
            }
            break;
        case 'right':
            a.x = Math.min(a.x + length, SimSize-1);
            while (grid[a.x][a.y] != null) {
                a.x -= 1;
            }
            break;
        case 'up':
            a.y = Math.max(a.y - length, 0);
            while (grid[a.x][a.y] != null) {
                a.y += 1;
            }
            break;
        case 'down':
            a.y = Math.min(a.y + length, SimSize-1);
            while (grid[a.x][a.y] != null) {
                a.y -= 1;
            }
            break;
        default:
            throw new Error("unknown direction: " + dir);
    }
    grid[a.x][a.y] = a;
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
    if (matingRequests[mateID] === agent.id) {
        matingRequests[mateID] = undefined;
        mate(agent, population.find(a => a.id === mateID));
    }

    matingRequests[agent.id] = mateID;
}

function mate(agent1, agent2, strategy) {
    const strategies = [
        {
            mask1: 0x55555555,
            mask2: 0xAAAAAAAA,
        }
    ];

    if (strategy === undefined || strategy === null) {
        strategy = rrand(0, strategies.length);
    }

    let offspring = {
        x: -1,
        y: -1,
        dna: 0x0,
        gen: Math.max(agent1.gen, agent2.gen) + 1,
        id: '0x'+(rrand(0, 2**32)>>>0).toString(16).toUpperCase(),

        _parents: [agent1.id, agent2.id],
    };

    // Compose the offspring's DNA
    offspring.dna = agent1.dna & strategies[strategy].mask1;
    offspring.dna |= agent2.dna & strategies[strategy].mask2;

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
    let al = [];

    for (let i = 0; i < pl.length; i++) {
        let x = agent1.x + pl[i].oX;
        let y = agent1.y + pl[i].oY;

        if (x < 0 || x >= SimSize || y < 0 || y >= SimSize) continue;

        if (grid[x][y] === undefined) al.push([x, y]);
    }

    if (!al.length) return null;

    const [x, y] = al[rrand(0, al.length-1)];
    offspring.x = x;
    offspring.y = y;

    population.push(offspring);
    grid[offspring.x][offspring.y] = offspring;
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
    total_epochs: SimEpochs,
    started_at: Date.now(),
    epoch: [
        {
            time: 0,
            population: JSON.parse(JSON.stringify(population)),
            actions: {},
        },
    ],
};

for (let e = 1; e <= SimEpochs; e++) {
    const _start = Date.now();
    console.log(`Epoch #${e} started at ${_start}`);

    let actions = {};
    matingRequests = {};

    let curPop = population.length;
    for (let i = 0; i < curPop; i++) {
        let agent = population[i];
        let observation = observe(agent);
        let action = agentAction(agent, observation);

        actions[agent.id] = action;

        performAction(agent, action);
    }

    sim_log.epoch.push({
        time: Date.now() - _start,
        population: JSON.parse(JSON.stringify(population)),
        actions,
    });
}

fs.writeFileSync(`${sim_log.started_at}.json`, JSON.stringify(sim_log));

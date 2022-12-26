const SvgRectSize = 5;
const
    GeneMaskColor  = 0x00000FFF,
    GeneMaskSight  = 0x0000F000,
    GeneMaskSpeed  = 0x000F0000,
    GeneMaskEnergy = 0x00F00000;

function getAgentColor(a) {
    let r = ((a.dna&GeneMaskColor&0xF00) >> 8) * 16;
    let g = ((a.dna&GeneMaskColor&0x0F0) >> 4) * 16;
    let b = (a.dna&GeneMaskColor&0x00F) * 16;

    return `rgb(${r}, ${g}, ${b})`;
}

function svg(e) {
    if (renderCache[e] !== undefined) return renderCache[e];

    let s = `<svg xmlns="http://www.w3.org/2000/svg"
            width="${svgConf.canvas.width}px"
            height="${svgConf.canvas.height}px"
            viewBox="0 0 ${svgConf.canvas.width} ${svgConf.canvas.height}">`;

    s += `<text y="24px" font-size="24px">${label(e)}</text>`;
    s += `<rect
            width="${svgConf.borderBox.width}px"
            height="${svgConf.borderBox.height}px"
            x="${svgConf.borderBox.offsetX}" y="${svgConf.borderBox.offsetY}"
            fill="none" stroke="#000" stroke-width="${svgConf.borderBox.borderWidth}" />`;

    const xOffset = svgConf.borderBox.offsetX + svgConf.borderBox.borderWidth;
    const yOffset = svgConf.borderBox.offsetY + svgConf.borderBox.borderWidth;
    for (let agent of data.epoch[e].population) {
        s += `<rect
                x="${agent.x * SvgRectSize + xOffset}"
                y="${agent.y * SvgRectSize + yOffset}"
                width="${SvgRectSize}px"
                height="${SvgRectSize}px"
                stroke="none"
                fill="${getAgentColor(agent)}"
                data-id="${agent.id}" />`;
    }

    renderCache[e] = s + '</svg>';
    return renderCache[e];
}

function label(e) {
    const ts = data.epoch[e].time / 1000;
    return `Epoch #${e} - Population: ${data.epoch[e].population.length} (${ts < 1 ? data.epoch[e].time+'ms' : ts.toFixed(3)+'s'})`;
}

let data;
let svgConf;
let renderCache = [];
let highlightAgents = [];
let filters = {};
let currentEpoch = 0;
let playing = false;
let playerLoop = false;
let playerSpeed = 1;
let playerID; // IntervalID

function loadJSON(_data) {
    data = _data;
    renderCache = [];
    svgConf = {
        canvas: {
            width:  data.size*SvgRectSize + SvgRectSize*4,
            height: data.size*SvgRectSize + 40 + SvgRectSize*4,
        },
        borderBox: {
            width:       data.size*SvgRectSize + SvgRectSize*2,
            height:      data.size*SvgRectSize + SvgRectSize*2,
            offsetX:     SvgRectSize,
            offsetY:     SvgRectSize + 40,
            borderWidth: SvgRectSize,
        },
    };

    configureFilters();
    renderEpoch(0);
}

function configureFilters() {
    resetFilters();

    let gen = document.getElementById('filter-gen');
    gen.setAttribute('max', data.epoch.reduce(
        (max, epoch) => Math.max(max, epoch.population.reduce(
            (max, agent) => Math.max(max, agent.gen),
            0)),
        0).toString());
}

function readFilters() {
    let form    = document.getElementById('agents-filters');
    let entries = new FormData(form).entries();

    filters = {};
    for (let f of entries) {
        if (form.querySelector(`[name="${f[0]}"]`).getAttribute('type') === 'number') {
            filters[f[0]] = parseFloat(f[1]);
        } else {
            filters[f[0]] = f[1];
        }
    }

    filterAgents();
}

function resetFilters() {
    let form = document.getElementById('agents-filters');
    form.reset();

    filters = {};
    highlightAgents = [];

    renderHighlightedAgents();
}

function filterAgents() {
    if (Object.keys(filters).length === 0) return;

    data.epoch[currentEpoch].population.forEach((agent) => {
        let selected = true;
        for (let f of Object.keys(filters)) {
            if (agent[f] !== filters[f]) {
                selected = false;
                break;
            }
        }

        document.querySelector(`#agents li[data-id="${agent.id}"]`).classList.toggle('selected', selected);
    });

    highlightAgents = [].map.call(document.querySelectorAll('#agents .selected'), el => el.getAttribute('data-id'));
    renderHighlightedAgents();
}

function renderAgentList(e) {
    const aList = document.querySelector('#agents ol');
    aList.innerHTML = '';

    for (let agent of data.epoch[e].population) {
        const li = document.createElement('li');
        li.setAttribute('data-id', agent.id);
        li.innerText = agent.id;
        if (highlightAgents.indexOf(agent.id) !== -1) {
            li.classList.add('selected');
        }
        aList.append(li);
    }
}

function renderHighlightedAgents() {
    const svg = document.querySelector('#container svg');
    if (!svg) return;

    if (highlightAgents.length < 1) {
        svg.querySelectorAll('rect[data-id]').forEach(r => r.removeAttribute('fill-opacity'));
        renderMetadata(null);
    } else {
        svg.querySelectorAll('rect[data-id]').forEach(r => r.setAttribute('fill-opacity', '.15'));
        highlightAgents.forEach(id => svg.querySelector(`rect[data-id="${id}"]`).removeAttribute('fill-opacity'));
    }

    if (highlightAgents.length > 0) {
        let agent = data.epoch[currentEpoch].population.find(a => a.id === highlightAgents[highlightAgents.length-1]);

        renderMetadata({
            info: agent,
            properties: {
                Color:  getAgentColor(agent),
                Sight:  (agent.dna&GeneMaskSight) >> 12,
                Speed:  (agent.dna&GeneMaskSpeed) >> 16,
                Energy: (agent.dna&GeneMaskEnergy) >> 20,
            },
            prevAction: data.epoch[currentEpoch].actions[agent.id] || null,
            nextAction: currentEpoch+1 >= data.epoch.length ? null :
                data.epoch[currentEpoch+1].actions[agent.id],
        });
    }
}

function toAbsString(num, radix) {
    if (num < 0) {
        num += 0xFFFFFFFF+1;
    }
    return num.toString(radix).toUpperCase();
}

function renderMetadata(data) {
    if (data === null) {
        document.getElementById('meta').innerHTML = '';
        return;
    }

    document.getElementById('meta').innerHTML = '<pre>'+JSON.stringify(data, null, 2)+'</pre>' +
        (data.info && data.info.dna ?
            '<div id="gene-rep">' +
            toAbsString(data.info.dna, 2).split('').map(b => `<span x-value="${b}"></span>`).join('') +
            '</div>' : '');
}

function renderEpoch(e) {
    currentEpoch = e;
    document.getElementById('epoch').value = e;

    document.getElementById('container').innerHTML = svg(e);

    renderAgentList(e);
    filterAgents();
    renderHighlightedAgents();
}
function nextEpoch() {
    if (currentEpoch+1 <= data.total_epochs) renderEpoch(currentEpoch+1);
}
function previousEpoch() {
    if (currentEpoch-1 >= 0) renderEpoch(currentEpoch-1);
}
function playNextEpoch() {
    if (currentEpoch < data.total_epochs) {
        nextEpoch();
    } else if (playerLoop) {
        renderEpoch(0);
    } else {
        playing = false;
        document.getElementById('play').innerText = 'Play';
        clearInterval(playerID);
        playerID = null;
    }
}

document.querySelector('body').addEventListener('dragenter', () => {
    document.body.classList.add('dragging');
});
document.querySelector('body').addEventListener('dragleave', () => {
    document.body.classList.remove('dragging');
});
document.querySelector('body').addEventListener('dragover', (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
});
document.querySelector('body').addEventListener('drop', (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    document.body.classList.remove('dragging');

    if (evt.dataTransfer.files.length < 1 || evt.dataTransfer.files[0].type !== 'application/json') {
        return alert('unsupported file');
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
        loadJSON(JSON.parse(reader.result));
    });
    reader.readAsText(evt.dataTransfer.files[0]);
});

document.getElementById('epoch').addEventListener('change', (evt) => {
    renderEpoch(evt.target.value);
});
document.getElementById('next').addEventListener('click', () => {
    if (currentEpoch < data.total_epochs) {
        nextEpoch();
    } else if (confirm("Last epoch. Restart playback?")) {
        renderEpoch(0);
    }
});
document.getElementById('prev').addEventListener('click', previousEpoch);
document.getElementById('play').addEventListener('click', function() {
    playing = !playing;
    if (playing) {
        this.innerText = 'Pause';
        if (currentEpoch === data.total_epochs) renderEpoch(0);
        playerID = setInterval(playNextEpoch, 1000/playerSpeed);
    } else {
        this.innerText = 'Play';
        clearInterval(playerID);
    }
});
document.getElementById('speed').addEventListener('change', function() {
    playerSpeed = this.value;
    if (playing) {
        clearInterval(playerID);
        playerID = setInterval(playNextEpoch, 1000/playerSpeed);
    }
});
document.getElementById('loop').addEventListener('change', function() {
    playerLoop = this.checked;
});

document.querySelector('#agents ol').addEventListener('click', (evt) => {
    if (evt.target.tagName !== 'LI') return;
    evt.target.classList.toggle('selected');
    highlightAgents = [].map.call(document.querySelectorAll('#agents .selected'), el => el.getAttribute('data-id'));
    renderHighlightedAgents();
});
document.getElementById('container').addEventListener('click', (evt) => {
    if (evt.target.tagName !== 'rect') return;
    const id = evt.target.getAttribute('data-id');
    document.querySelector(`#agents li[data-id="${id}"]`).classList.toggle('selected');
    highlightAgents = [].map.call(document.querySelectorAll('#agents .selected'), el => el.getAttribute('data-id'));
    renderHighlightedAgents();
});
document.getElementById('agents-filters').addEventListener('change', readFilters);

document.getElementById('modal').addEventListener('click', (evt) => {
    if (evt.target.matches('#modal')) evt.target.classList.remove('show');
});
document.getElementById('report-pop-growth').addEventListener('click', () => {
    const modal = document.getElementById('modal');
    const container = modal.querySelector('main');
    container.innerHTML = '';

    const canvas = document.createElement('canvas');
    container.append(canvas);

    let population = data.epoch.map(epoch => epoch.population.length);
    let births = data.epoch.map((epoch, i) => i === 0 ? 0 :
        epoch.population.filter(a => !data.epoch[i-1].population.some(b => b.id === a.id)).length);
    let deaths = data.epoch.map((epoch, i) => i === 0 ? 0 :
        data.epoch[i-1].population.filter(a => !epoch.population.some(b => b.id === a.id)).length);

    new Chart(canvas, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Population',
                    data: population,
                    pointRadius: 0,
                    yAxisID: 'y2',
                },
                {
                    label: 'Births',
                    data: births,
                    pointRadius: 0,
                    tension: .1,
                },
                {
                    label: 'Deaths',
                    data: deaths,
                    pointRadius: 0,
                    tension: .1,
                },
            ],
            labels: population.map((_, i) => i),
        },
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: "Epoch" } },
                y: { title: { display: true, text: "Births & Deaths" } },
                y2: {
                    title: { display: true, text: "Population" },
                    position: 'right',
                    type: 'logarithmic',
                    grid: {
                        drawOnChartArea: false, // only want the grid lines for one axis to show up
                    },
                },
            },
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                title: {
                    display: true,
                    text: "Population Growth",
                },
            },
        },
    });

    modal.classList.add('show');
});
document.getElementById('report-gen-growth').addEventListener('click', () => {
    const modal = document.getElementById('modal');
    const container = modal.querySelector('main');
    container.innerHTML = '';

    const canvas = document.createElement('canvas');
    container.append(canvas);

    let counted = data.epoch[0].population.map(a => a.id);
    let births = [];

    data.epoch.forEach((epoch, e) => {
        if (e === 0) return;

        let gens = epoch.population.reduce(
            (gens, agent) => {
                if (counted.includes(agent.id)) return gens;

                gens[agent.gen] = gens[agent.gen] ? gens[agent.gen]+1 : 1;
                counted.push(agent.id);

                return gens;
            }, []
        );

        gens = gens.map((newBirths, gen) => {
            if (!newBirths) return null;

            return {
                x: e,
                y: gen,
                r: newBirths,
            };
        }).filter(p => p !== null);

        births = births.concat(gens);
    });

    new Chart(canvas, {
        type: 'bubble',
        data: {
            datasets: [{
                label: 'Births',
                data: births,
            }],
        },
        options: {
            responsive: true,
            scales: {
                x: { title: { display: true, text: "Epoch" } },
                y: { title: { display: true, text: "Generation" } },
            },
            plugins: {
                title: {
                    display: true,
                    text: "Generational Growth",
                },
            },
        },
    });

    modal.classList.add('show');
});

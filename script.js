// --- Functions --- 

function createDropdown(id, labelText, optionsList) {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '10px'; // small space between label and select

    const label = document.createElement('label');
    label.setAttribute('for', id);
    label.textContent = labelText;

    const select = document.createElement('select');
    select.id = id;

    optionsList.forEach(name => {
        const option = document.createElement('option');
        option.value = name.toLowerCase().replace(/ /g, '');
        option.textContent = name;
        select.appendChild(option);
    });

    wrapper.appendChild(label);
    wrapper.appendChild(select);

    return { wrapper, select }; // return both
}

function createCheckbox(id, labelText) {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = id;

    const label = document.createElement('label');
    label.setAttribute('for', id);
    label.textContent = labelText;

    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);

    return { wrapper, checkbox }; 
}


// --- Setup --- 
const app = document.getElementById('app');

const title = document.createElement('h1');
title.textContent = "CSP Visualizer";

const controls = document.createElement('div');
controls.id = "controls";

const { wrapper: cspGroup, select: selectCSP } = createDropdown(
    'cspType',
    'Choose a CSP:',
    ["Map Coloring", "N-Queens"]
);
const savedCSP = localStorage.getItem('selectedCSP');
if (savedCSP) {
    selectCSP.value = savedCSP;
}

const { wrapper: methodGroup, select: selectMethod } = createDropdown(
    'solveMethod',
    'Solving Method:',
    ["Pure Backtracking", "Backtracking + Forward Checking"]
);
const savedMethod = localStorage.getItem('selectedMethod');
if (savedMethod) {
    selectMethod.value = savedMethod;
}

const { wrapper: mrvGroup, checkbox: mrvCheckbox } = createCheckbox('mrv', 'Use MRV');
const { wrapper: lcvGroup, checkbox: lcvCheckbox } = createCheckbox('lcv', 'Use LCV');

const heuristicsDiv = document.createElement('div');
heuristicsDiv.id = 'heuristics';
heuristicsDiv.appendChild(mrvGroup);
heuristicsDiv.appendChild(lcvGroup);

const startButton = document.createElement('button');
startButton.id = "startButton";
startButton.textContent = "Start Visualization";

const resetButton = document.createElement('button');
resetButton.id = "resetButton";
resetButton.textContent = "Reset";
resetButton.style.display = 'none';  // hidden until started

const nextButton = document.createElement('button');
nextButton.id = "nextButton";
nextButton.textContent = "Next Step";
nextButton.style.display = 'none';  // hidden until started

const visualizationArea = document.createElement('div');
visualizationArea.id = "visualizationArea";

const canvas = document.createElement('canvas');
canvas.id = "canvas";
canvas.width = 600;
canvas.height = 500;
const ctx = canvas.getContext('2d');

const output = document.createElement('div');
output.id = "output";

controls.appendChild(cspGroup);
controls.appendChild(methodGroup);
controls.appendChild(heuristicsDiv);
controls.appendChild(startButton);
controls.appendChild(nextButton);
controls.appendChild(resetButton);
visualizationArea.appendChild(canvas);
visualizationArea.appendChild(output);
app.appendChild(title);
app.appendChild(controls);
app.appendChild(visualizationArea);



// --- CSP logic ---

const solver = {
    variables: [],
    domains: {},
    neighbors: {},
    assignment: {},
    unassigned: [],
    stack: [],
    selectedVariable: null,
    possibleValues: [],
    currentCSPType: '',
    method: '',
    useMRV: false,
    useLCV: false,
    finished: false
};

startButton.addEventListener('click', startVisualization);
nextButton.addEventListener('click', nextStep);
resetButton.addEventListener('click', resetVisualization);
selectCSP.addEventListener('change', () => {
    localStorage.setItem('selectedCSP', selectCSP.value);
});
selectMethod.addEventListener('change', () => {
    localStorage.setItem('selectedMethod', selectMethod.value);
});

function startVisualization() {
    readUserSelections();
    resetSolver();
    clearCanvas();
    clearOutput();
    initializeCSP();
    nextButton.style.display = 'inline-block';
    startButton.style.display = 'none';
    logMessage("Initialized CSP: " + solver.currentCSPType + " with " + selectMethod.value);
}

function readUserSelections() {
    solver.currentCSPType = selectCSP.value;
    solver.method = selectMethod.value;
    solver.useMRV = mrvCheckbox.checked;
    solver.useLCV = lcvCheckbox.checked;
}

function resetSolver() {
    solver.assignment = {};
    solver.domains = {};
    solver.neighbors = {};
    solver.variables = [];
    solver.unassigned = [];
    solver.stack = [];
    solver.selectedVariable = null;
    solver.possibleValues = [];
    solver.finished = false;
}

function initializeCSP() {
    if (solver.currentCSPType === 'mapcoloring') {
        setupMapColoring();
    } else if (solver.currentCSPType === 'n-queens') {
        setupNQueens();
    }
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function clearOutput() {
    output.innerHTML = "";
}

function logMessage(msg, extraspace = false) {  // extraspace adds a space before the message
    if (extraspace) {
        const spacer = document.createElement('div');
        spacer.style.height = '5px'; 
        output.appendChild(spacer);
    }
    const p = document.createElement('p');
    p.textContent = msg;
    output.appendChild(p);
    output.scrollTop = output.scrollHeight;
}

function nextStep() {
    if (solver.finished) {
        return;
    }

    if (!solver.selectedVariable) {
        solver.selectedVariable = selectVariable();  // pick next var to assign val to 
        if (!solver.selectedVariable) {  // all vars assigned
            solver.finished = true;
            logMessage("CSP solved! ✅", true);
            drawCurrentState();
            nextButton.style.display = 'none';
            resetButton.style.display = 'inline-block';
            return;
        }
        solver.possibleValues = orderDomainValues(solver.selectedVariable);  // pick val to assign to var
    }

    if (solver.possibleValues.length === 0) {  // no vals for this var available, need backtrack
        if (solver.stack.length === 0) {
            logMessage("No solution found ❌", true);
            solver.finished = true;
            return;
        }
        logMessage("Backtracking...");
        backtrack();
        return;
    }

    const value = solver.possibleValues.shift(); // tries value
    logMessage(`> Trying ${solver.selectedVariable} = ${value}`, true);

    if (isConsistent(solver.selectedVariable, value)) {  // save current state
        solver.stack.push({
            assignment: { ...solver.assignment },
            unassigned: [...solver.unassigned],
            domains: JSON.parse(JSON.stringify(solver.domains)), // deep copy domains
            selectedVariable: solver.selectedVariable,
            possibleValues: [...solver.possibleValues]
        });

        // update value assignment in solver
        solver.assignment[solver.selectedVariable] = value;
        solver.unassigned = solver.unassigned.filter(v => v !== solver.selectedVariable);

        // forward Checking
        if (solver.method === 'backtracking+forwardchecking') {
            if (!forwardCheck(solver.selectedVariable, value)) {
                logMessage(`Forward checking failed after assigning ${solver.selectedVariable} = ${value}`);
                logMessage("Backtracking...");
                backtrack();
                return;
            }
        }

        logMessage(`✓ Assigned ${solver.selectedVariable} = ${value}`);
        solver.selectedVariable = null; // ready for next variable next step
        drawCurrentState();
    } else {
        logMessage(`✕ ${solver.selectedVariable} = ${value} is not allowed`);

        if (solver.currentCSPType === 'n-queens') {
            const rowIndex = parseInt(solver.selectedVariable.replace('row', ''));
            const colIndex = value;
            flashBadMove(rowIndex, colIndex);
        }
    }
}

function flashBadMove(row, col) {
    const size = 4; 
    const cellSize = 100;
    const offsetX = 100;
    const offsetY = 70;

    // draw red rectangle on the bad cell
    ctx.beginPath();
    ctx.rect(offsetX + col * cellSize, offsetY + row * cellSize, cellSize, cellSize);
    ctx.fillStyle = 'rgba(255, 0, 0, 0.6)'; // semi-transparent red
    ctx.fill();
    ctx.stroke();

    // after short delay, redraw the whole board
    setTimeout(() => {
        drawCurrentState();
    }, 300); // 500ms flash
}


function selectVariable() {
    if (solver.unassigned.length === 0) return null;

    if (!solver.useMRV) {
        return solver.unassigned[0];  // pick first one in unassigned array
    } else {  // MRV: pick variable with smallest domain
        return solver.unassigned.reduce((a, b) => 
            solver.domains[a].length <= solver.domains[b].length ? a : b
        );
    }
}

function orderDomainValues(varName) {
    if (!solver.useLCV) {
        return [...solver.domains[varName]];  // makes copy of domain vals
    } else {  // LCV
        return solver.domains[varName].slice().sort((a, b) => {
            let aConflicts = 0;
            let bConflicts = 0;
            for (let neighbor of solver.neighbors[varName] || []) {  // empty array to prevent undefined error
                if (solver.domains[neighbor]?.includes(a)) aConflicts++; // counts num conflicts in neighbor domains
                if (solver.domains[neighbor]?.includes(b)) bConflicts++;
            }
            return aConflicts - bConflicts; // least conflicts first
        });
    }
}

function isConsistent(varName, value) {  // makes sure value is not assigned to neighbors already
    for (let neighbor of solver.neighbors[varName] || []) {
        if (solver.assignment.hasOwnProperty(neighbor)) {
            if (solver.currentCSPType === 'mapcoloring') {  // just check colors
                if (value === solver.assignment[neighbor]) {
                    return false;
                }
            } else if (solver.currentCSPType === 'n-queens') {  // check column and diagonal conflicts
                const row = parseInt(varName.replace('row', ''));
                const neighborRow = parseInt(neighbor.replace('row', ''));
                const neighborCol = solver.assignment[neighbor];

                if (value === neighborCol) {
                    return false; // same column
                }
                if (Math.abs(row - neighborRow) === Math.abs(value - neighborCol)) {
                    return false; // same diagonal
                }
            }
        }
    }
    return true;
}


function forwardCheck(varName, value) {
    for (let neighbor of solver.neighbors[varName] || []) {
        if (!(neighbor in solver.assignment)) {  // if neighbor not assigned
            solver.domains[neighbor] = solver.domains[neighbor].filter(v => v !== value);
            if (solver.domains[neighbor].length === 0) {
                return false; // neighbor has no legal values left
            }
        }
    }
    return true;
}

function backtrack() {
    const last = solver.stack.pop();
    solver.assignment = { ...last.assignment };
    solver.unassigned = [...last.unassigned];
    solver.domains = JSON.parse(JSON.stringify(last.domains));  
    solver.selectedVariable = last.selectedVariable;
    solver.possibleValues = [...last.possibleValues];
    if (solver.possibleValues.length > 0) {
        const failedValue = solver.possibleValues.shift();
        solver.domains[solver.selectedVariable] = solver.domains[solver.selectedVariable].filter(v => v !== failedValue);
    }
    if (solver.domains[solver.selectedVariable].length === 0) {
        logMessage(`No remaining domain values for ${solver.selectedVariable}, backtracking again...`);
        backtrack();
    }
    drawCurrentState()
}

function resetVisualization() {
    const confirmReset = confirm("Are you sure you want to reset the visualization?");
    if (confirmReset) {
        resetSolver();
        clearCanvas();
        clearOutput();
        startButton.style.display = 'inline-block'; 
        nextButton.style.display = 'none';
        resetButton.style.display = 'none';
    } 
}


function setupMapColoring() {
    solver.variables = ['A', 'B', 'C', 'D', 'E', 'F'];
    solver.domains = {};
    solver.neighbors = {};

    const colors = ['Red', 'Green', 'Blue']; 

    for (let varName of solver.variables) {
        solver.domains[varName] = [...colors];
    }

    solver.neighbors = {
        'A': ['B', 'D'],
        'B': ['A', 'C', 'D', 'E'],
        'C': ['B', 'E'],
        'D': ['A', 'B', 'E', 'F'],
        'E': ['B', 'C', 'D'],
        'F': ['D']
    };

    solver.unassigned = [...solver.variables];

    drawCurrentState();
}

function setupNQueens() {
    const size = 4;  // 4x4 board
    solver.variables = [];

    for (let i = 0; i < size; i++) {
        solver.variables.push(`row${i}`);
    }

    solver.domains = {};
    solver.neighbors = {};

    for (let varName of solver.variables) {
        solver.domains[varName] = [0, 1, 2, 3]; // columns 0-3
    }

    for (let varName of solver.variables) {
        solver.neighbors[varName] = solver.variables.filter(v => v !== varName);
    }

    solver.unassigned = [...solver.variables];

    drawCurrentState();
}



function drawCurrentState() {
    clearCanvas();

    if (solver.currentCSPType === 'mapcoloring') {
        drawMapColoring();
    } else if (solver.currentCSPType === 'n-queens') {
        drawNQueens();
    }
}

function drawMapColoring() {
    clearCanvas();

    const positions = {
        'A': { x: 100, y: 100 },
        'B': { x: 300, y: 100 },
        'C': { x: 500, y: 100 },
        'D': { x: 200, y: 250 },
        'E': { x: 400, y: 250 },
        'F': { x: 200, y: 400 }
    };

    // set global styles 
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgb(100 100 100 / 60%)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '16px Georgia';

    // draw edges (neighbors) 
    for (let varName in solver.neighbors) {
        const { x: x1, y: y1 } = positions[varName];
        for (let neighbor of solver.neighbors[varName]) {
            if (varName < neighbor) { 
                const { x: x2, y: y2 } = positions[neighbor];
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }
    }

    // draw nodes (regions) and domain text 
    for (let varName in positions) {
        const { x, y } = positions[varName];

        // draw circle 
        ctx.beginPath();
        ctx.arc(x, y, 30, 0, 2 * Math.PI);
        ctx.fillStyle = solver.assignment[varName] || 'white';
        ctx.fill();
        ctx.stroke();

        // draw node name
        ctx.fillStyle = 'black';
        ctx.font = '16px Georgia'; // Node label
        ctx.fillText(varName, x, y);

        // draw domain 
        const domain = solver.domains[varName] || [];
        ctx.font = '12px Georgia'; // Domain text smaller
        ctx.fillText(`[${domain.join(', ')}]`, x, y + 45);
    }
}

function drawNQueens() {
    const size = 4; // 4x4 board
    const cellSize = 100;
    const offsetX = 100;
    const offsetY = 70;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // draw col and row nums
    ctx.font = '18px Georgia';
    for (let col = 0; col < size; col++) {
        ctx.fillStyle = 'black';
        ctx.fillText(col, offsetX + col * cellSize + cellSize / 2, offsetY - 30);
    }
    for (let row = 0; row < size; row++) {
        ctx.fillStyle = 'black';
        ctx.fillText(row, offsetX - 30, offsetY + row * cellSize + cellSize / 2);
    }

    // Draw chessboard
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            ctx.beginPath();
            ctx.rect(offsetX + col * cellSize, offsetY + row * cellSize, cellSize, cellSize);
            ctx.fillStyle = (row + col) % 2 === 0 ? '#f0d9b5' : '#b58863'; // light and dark
            ctx.fill();
            ctx.stroke();
        }
    }

    // Draw Queens
    ctx.fillStyle = 'black';
    ctx.font = '40px Georgia';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let varName in solver.assignment) {
        const rowIndex = parseInt(varName.replace('row', ''));
        const colIndex = solver.assignment[varName];

        const x = offsetX + colIndex * cellSize + cellSize / 2;
        const y = offsetY + rowIndex * cellSize + cellSize / 2;

        ctx.fillText('X', x, y);
    }
}




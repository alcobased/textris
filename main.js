const gridContainer = document.getElementById('grid-container');
const polyominoInput = document.getElementById('polyomino-input');
const confirmBtn = document.getElementById('confirm-btn');
const confirmTemplateBtn = document.getElementById('confirm-template-btn');
const clearShapesBtn = document.getElementById('clear-shapes-btn');
const clearOverlayBtn = document.getElementById('clear-overlay-btn');
const deleteBtn = document.getElementById('delete-btn');
const saveLocalBtn = document.getElementById('save-local-btn');
const loadLocalBtn = document.getElementById('load-local-btn');
const saveFileBtn = document.getElementById('save-file-btn');
const loadFileBtn = document.getElementById('load-file-btn');
const fileInput = document.getElementById('file-input');

const GRID_WIDTH = 40;
const GRID_HEIGHT = 30;

let grid = [];
let polyominoes = [];
let nextPolyominoId = 0;
let activePolyominoId = null;
let activePolyominoHandle = null; // To store the click offset {row, col}
let templateOverlay = [];

function createGrid() {
    gridContainer.innerHTML = '';
    grid = [];
    polyominoes = [];
    nextPolyominoId = 0;
    activePolyominoId = null;
    activePolyominoHandle = null;
    clearOverlay();
    for (let i = 0; i < GRID_HEIGHT; i++) {
        const row = [];
        for (let j = 0; j < GRID_WIDTH; j++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = i;
            cell.dataset.col = j;
            gridContainer.appendChild(cell);
            row.push(null);
        }
        grid.push(row);
    }
}

function handleCellClick(e) {
    if (e.target.classList.contains('cell')) {
        const row = parseInt(e.target.dataset.row);
        const col = parseInt(e.target.dataset.col);
        const clickedPolyominoId = grid[row][col];

        if (clickedPolyominoId !== null) {
            // Clicked on a polyomino
            if (activePolyominoId === clickedPolyominoId) {
                // Deactivate if already active
                setActivePolyomino(null);
            } else {
                // Activate new polyomino
                const polyomino = polyominoes.find(p => p.id === clickedPolyominoId);
                const handle = { row: row - polyomino.row, col: col - polyomino.col };
                setActivePolyomino(clickedPolyominoId, handle);
            }
        } else {
            // Clicked on an empty cell
            if (activePolyominoId !== null) {
                // If a polyomino is active, try to move it
                moveActivePolyomino(row, col);
            } else {
                // Deactivate if clicking empty space
                setActivePolyomino(null);
            }
        }
    }
}

function moveActivePolyomino(targetRow, targetCol) {
    const polyomino = polyominoes.find(p => p.id === activePolyominoId);
    if (!polyomino || !activePolyominoHandle) return;

    const newRow = targetRow - activePolyominoHandle.row;
    const newCol = targetCol - activePolyominoHandle.col;

    // Check for collisions
    if (!isSpaceEmpty(newRow, newCol, polyomino.pattern, activePolyominoId)) {
        alert('Illegal move: The polyomino overlaps with another or is out of bounds.');
        return;
    }

    // Clear the old position
    for (let i = 0; i < polyomino.pattern.length; i++) {
        for (let j = 0; j < polyomino.pattern[i].length; j++) {
            if (polyomino.pattern[i][j] !== '.') {
                const oldGridRow = polyomino.row + i;
                const oldGridCol = polyomino.col + j;
                grid[oldGridRow][oldGridCol] = null;
                const cell = gridContainer.querySelector(`[data-row="${oldGridRow}"][data-col="${oldGridCol}"]`);
                cell.textContent = '';
                cell.classList.remove('active', 'polyomino-active');
            }
        }
    }

    // Update position
    polyomino.row = newRow;
    polyomino.col = newCol;

    // Draw in the new position
    for (let i = 0; i < polyomino.pattern.length; i++) {
        for (let j = 0; j < polyomino.pattern[i].length; j++) {
            if (polyomino.pattern[i][j] !== '.') {
                const newGridRow = polyomino.row + i;
                const newGridCol = polyomino.col + j;
                grid[newGridRow][newGridCol] = polyomino.id;
                const cell = gridContainer.querySelector(`[data-row="${newGridRow}"][data-col="${newGridCol}"]`);
                cell.textContent = polyomino.pattern[i][j];
                cell.classList.add('active');
            }
        }
    }

    // Deactivate the polyomino after moving
    setActivePolyomino(null);
}

function setActivePolyomino(polyominoId, handle = null) {
    // Deactivate previously active polyomino
    if (activePolyominoId !== null) {
        const oldActivePolyomino = polyominoes.find(p => p.id === activePolyominoId);
        if (oldActivePolyomino) {
            for (let i = 0; i < oldActivePolyomino.pattern.length; i++) {
                for (let j = 0; j < oldActivePolyomino.pattern[i].length; j++) {
                    if (oldActivePolyomino.pattern[i][j] !== '.') {
                        const gridRow = oldActivePolyomino.row + i;
                        const gridCol = oldActivePolyomino.col + j;
                        const cell = gridContainer.querySelector(`[data-row="${gridRow}"][data-col="${gridCol}"]`);
                        cell.classList.remove('polyomino-active');
                    }
                }
            }
        }
    }

    activePolyominoId = polyominoId;
    activePolyominoHandle = handle;

    // Activate new polyomino
    if (activePolyominoId !== null) {
        const newActivePolyomino = polyominoes.find(p => p.id === activePolyominoId);
        if (newActivePolyomino) {
            for (let i = 0; i < newActivePolyomino.pattern.length; i++) {
                for (let j = 0; j < newActivePolyomino.pattern[i].length; j++) {
                    if (newActivePolyomino.pattern[i][j] !== '.') {
                        const gridRow = newActivePolyomino.row + i;
                        const gridCol = newActivePolyomino.col + j;
                        const cell = gridContainer.querySelector(`[data-row="${gridRow}"][data-col="${gridCol}"]`);
                        cell.classList.add('polyomino-active');
                    }
                }
            }
        }
    }
}

function clearShapes() {
    grid = grid.map(row => row.map(() => null));
    polyominoes = [];
    nextPolyominoId = 0;
    activePolyominoId = null;
    activePolyominoHandle = null;
    redrawGrid();
}

function parseAndDraw() {
    const rawPattern = polyominoInput.value;
    const uppercasedPattern = rawPattern.toUpperCase();

    const pattern = uppercasedPattern.split('\n').filter(row => row.length > 0);
    if (pattern.length === 0) return;

    const position = findEmptySpace(pattern);

    if (position) {
        const newPolyomino = {
            id: nextPolyominoId++,
            pattern: pattern,
            row: position.row,
            col: position.col
        };
        polyominoes.push(newPolyomino);
        drawPolyomino(newPolyomino);
    } else {
        console.log("No empty space found for this polyomino.");
    }

    polyominoInput.value = '';
    polyominoInput.focus();
}

function parseAndDrawTemplate() {
    clearOverlay();
    const rawPattern = polyominoInput.value;
    const pattern = rawPattern.split('\n').filter(row => row.length > 0);
    if (pattern.length === 0) return;

    const position = { row: 0, col: 0 };

    for (let i = 0; i < pattern.length; i++) {
        for (let j = 0; j < pattern[i].length; j++) {
            if (pattern[i][j].toLowerCase() === 'x') {
                const gridRow = position.row + i;
                const gridCol = position.col + j;

                if (gridRow < GRID_HEIGHT && gridCol < GRID_WIDTH) {
                    const cell = gridContainer.querySelector(`[data-row="${gridRow}"][data-col="${gridCol}"]`);
                    if (cell) {
                        cell.classList.add('template-overlay');
                        templateOverlay.push({row: gridRow, col: gridCol});
                    }
                }
            }
        }
    }

    polyominoInput.value = '';
    polyominoInput.focus();
}

function clearOverlay() {
    templateOverlay.forEach(pos => {
        const cell = gridContainer.querySelector(`[data-row="${pos.row}"][data-col="${pos.col}"]`);
        if (cell) {
            cell.classList.remove('template-overlay');
        }
    });
    templateOverlay = [];
}

function drawPolyomino(polyomino) {
    for (let i = 0; i < polyomino.pattern.length; i++) {
        for (let j = 0; j < polyomino.pattern[i].length; j++) {
            const char = polyomino.pattern[i][j];
            if (char !== '.') {
                const gridRow = polyomino.row + i;
                const gridCol = polyomino.col + j;
                grid[gridRow][gridCol] = polyomino.id;
                const cell = gridContainer.querySelector(`[data-row="${gridRow}"][data-col="${gridCol}"]`);
                cell.textContent = char;
                cell.classList.add('active');
            }
        }
    }
}

function deleteActivePolyomino() {
    if (activePolyominoId === null) {
        alert('No polyomino selected to delete.');
        return;
    }

    const confirmation = confirm('Are you sure you want to delete the selected polyomino?');
    if (!confirmation) return;

    const polyomino = polyominoes.find(p => p.id === activePolyominoId);
    if (polyomino) {
        // Clear from grid
        for (let i = 0; i < polyomino.pattern.length; i++) {
            for (let j = 0; j < polyomino.pattern[i].length; j++) {
                if (polyomino.pattern[i][j] !== '.') {
                    const gridRow = polyomino.row + i;
                    const gridCol = polyomino.col + j;
                    grid[gridRow][gridCol] = null;
                    const cell = gridContainer.querySelector(`[data-row="${gridRow}"][data-col="${gridCol}"]`);
                    cell.textContent = '';
                    cell.classList.remove('active', 'polyomino-active');
                }
            }
        }

        // Remove from state
        polyominoes = polyominoes.filter(p => p.id !== activePolyominoId);
        setActivePolyomino(null);
    }
}

function findEmptySpace(pattern) {
    const patternHeight = pattern.length;
    const patternWidth = Math.max(...pattern.map(row => row.length));

    for (let row = 0; row <= GRID_HEIGHT - patternHeight; row++) {
        for (let col = 0; col <= GRID_WIDTH - patternWidth; col++) {
            if (isSpaceEmpty(row, col, pattern, null)) {
                return { row, col };
            }
        }
    }
    return null;
}

function isSpaceEmpty(startRow, startCol, pattern, ignoredId) {
    for (let i = 0; i < pattern.length; i++) {
        for (let j = 0; j < pattern[i].length; j++) {
            if (pattern[i][j] !== '.') {
                const checkRow = startRow + i;
                const checkCol = startCol + j;

                if (checkRow < 0 || checkRow >= GRID_HEIGHT || checkCol < 0 || checkCol >= GRID_WIDTH) {
                    return false; // Out of bounds
                }

                const polyominoId = grid[checkRow][checkCol];
                if (polyominoId !== null && polyominoId !== ignoredId) {
                    return false; // Collision
                }
            }
        }
    }
    return true;
}

function saveStateToLocal() {
    const state = {
        grid,
        polyominoes,
        nextPolyominoId,
        templateOverlay
    };
    localStorage.setItem('polyominoCreatorState', JSON.stringify(state));
    alert('State saved to local storage!');
}

function loadStateFromLocal() {
    const savedState = localStorage.getItem('polyominoCreatorState');
    if (savedState) {
        const state = JSON.parse(savedState);
        grid = state.grid;
        polyominoes = state.polyominoes;
        nextPolyominoId = state.nextPolyominoId;
        templateOverlay = state.templateOverlay || [];
        redrawGrid();
        alert('State loaded from local storage!');
    } else {
        alert('No saved state found in local storage.');
    }
}

function saveStateToFile() {
    const state = {
        grid,
        polyominoes,
        nextPolyominoId,
        templateOverlay
    };
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'polyomino-state.json';
    a.click();
    URL.revokeObjectURL(url);
}

function loadStateFromFile() {
    fileInput.click();
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const state = JSON.parse(event.target.result);
            grid = state.grid;
            polyominoes = state.polyominoes;
            nextPolyominoId = state.nextPolyominoId;
            templateOverlay = state.templateOverlay || [];
            redrawGrid();
            alert('State loaded from file!');
        } catch (error) {
            alert('Error loading file: Invalid JSON format.');
        }
    };
    reader.readAsText(file);
}

function redrawGrid() {
    // Clear visual grid
    const cells = gridContainer.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('active', 'polyomino-active', 'template-overlay');
    });

    // Redraw polyominoes
    polyominoes.forEach(polyomino => {
        drawPolyomino(polyomino);
    });

    // Redraw template
    templateOverlay.forEach(pos => {
        const cell = gridContainer.querySelector(`[data-row="${pos.row}"][data-col="${pos.col}"]`);
        if (cell) {
            cell.classList.add('template-overlay');
        }
    });
}

polyominoInput.addEventListener('input', (e) => {
    if (!e.target) return;
    const start = e.target.selectionStart;
    const end = e.target.selectionEnd;
    e.target.value = e.target.value.toUpperCase();
    e.target.setSelectionRange(start, end);
});

gridContainer.addEventListener('click', handleCellClick);
clearShapesBtn.addEventListener('click', clearShapes);
clearOverlayBtn.addEventListener('click', clearOverlay);
confirmBtn.addEventListener('click', parseAndDraw);
confirmTemplateBtn.addEventListener('click', parseAndDrawTemplate);
deleteBtn.addEventListener('click', deleteActivePolyomino);
saveLocalBtn.addEventListener('click', saveStateToLocal);
loadLocalBtn.addEventListener('click', loadStateFromLocal);
saveFileBtn.addEventListener('click', saveStateToFile);
loadFileBtn.addEventListener('click', loadStateFromFile);
fileInput.addEventListener('change', handleFileSelect);

createGrid();

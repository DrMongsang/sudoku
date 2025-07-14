const gameBoard = document.getElementById('game-board');
const newGameBtn = document.getElementById('new-game-btn');
const resetBtn = document.getElementById('reset-btn');
const solveBtn = document.getElementById('solve-btn');
const hintBtn = document.getElementById('hint-btn');
const numpad = document.getElementById('numpad');
const message = document.getElementById('message');

let initialPuzzle = [];
let currentPuzzle = [];
let solution = [];
let notes = [];
let selectedCell = { row: -1, col: -1 };

// --- 1. PUZZLE GENERATION ---
function generatePuzzle() {
    solution = Array(9).fill(0).map(() => Array(9).fill(0));
    solve(solution);
    initialPuzzle = JSON.parse(JSON.stringify(solution));
    
    let attempts = 45; // Difficulty
    while (attempts > 0) {
        const row = Math.floor(Math.random() * 9);
        const col = Math.floor(Math.random() * 9);
        if (initialPuzzle[row][col] !== 0) {
            initialPuzzle[row][col] = 0;
            attempts--;
        }
    }
    currentPuzzle = JSON.parse(JSON.stringify(initialPuzzle));
    notes = Array(9).fill(0).map(() => Array(9).fill(0).map(() => new Set()));
}

function solve(board) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] === 0) {
                const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                shuffle(nums);
                for (const num of nums) {
                    if (isValid(board, row, col, num)) {
                        board[row][col] = num;
                        if (solve(board)) return true;
                        board[row][col] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// --- 2. BOARD & UI CREATION ---
function createBoard() {
    gameBoard.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const rowDiv = document.createElement('div');
        rowDiv.classList.add('row');
        for (let j = 0; j < 9; j++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = i;
            cell.dataset.col = j;

            const boxRow = Math.floor(i / 3);
            const boxCol = Math.floor(j / 3);
            if ((boxRow + boxCol) % 2 === 0) {
                cell.classList.add('shaded-block');
            }

            if (initialPuzzle[i][j] !== 0) {
                cell.textContent = initialPuzzle[i][j];
                cell.classList.add('pre-filled');
            } else {
                const mainValueDiv = document.createElement('div');
                mainValueDiv.classList.add('main-value');
                cell.appendChild(mainValueDiv);

                const noteGrid = document.createElement('div');
                noteGrid.classList.add('note-grid');
                for (let n = 1; n <= 9; n++) {
                    const noteCell = document.createElement('div');
                    noteCell.classList.add('note-cell');
                    noteCell.dataset.note = n;
                    noteGrid.appendChild(noteCell);
                }
                cell.appendChild(noteGrid);
            }
            cell.addEventListener('click', () => selectCell(i, j));
            rowDiv.appendChild(cell);
        }
        gameBoard.appendChild(rowDiv);
    }
    updateFullBoardDisplay();
}

function createNumpad() {
    numpad.innerHTML = '';
    for (let i = 1; i <= 9; i++) {
        const btn = document.createElement('button');
        btn.textContent = i;
        btn.addEventListener('click', () => handleNumpadInput(i));
        numpad.appendChild(btn);
    }
    const eraseBtn = document.createElement('button');
    eraseBtn.textContent = 'X';
    eraseBtn.addEventListener('click', () => handleNumpadInput(0));
    numpad.appendChild(eraseBtn);
}

// --- 3. USER INTERACTION ---
function handleNumpadInput(num) {
    if (selectedCell.row === -1) return;
    const { row, col } = selectedCell;

    if (initialPuzzle[row][col] !== 0) return; // Cannot change pre-filled cells

    const mainValue = currentPuzzle[row][col];
    const noteSet = notes[row][col];

    if (num === 0) { // Erase button
        currentPuzzle[row][col] = 0;
        noteSet.clear();
    } else if (mainValue === 0 && noteSet.size === 0) {
        // Case 1: Cell is empty -> Set main number
        currentPuzzle[row][col] = num;
    } else if (mainValue !== 0) {
        // Case 2: Cell has a main number
        if (mainValue === num) {
            // Input same number -> Clear it (toggle off)
            currentPuzzle[row][col] = 0;
        } else {
            // Input different number -> Convert to notes
            noteSet.add(mainValue);
            noteSet.add(num);
            currentPuzzle[row][col] = 0;
        }
    } else if (noteSet.size > 0) {
        // Case 3: Cell has notes
        if (noteSet.has(num)) {
            // Input existing note -> Set as main number, clear others
            noteSet.clear();
            currentPuzzle[row][col] = num;
        } else {
            // Input new note -> Add to set
            noteSet.add(num);
        }
    }

    updateFullBoardDisplay();
    validateBoard();
    highlightAll();

    if (isSolved()) {
        message.textContent = 'クリア！おめでとうございます！';
    }
}

function selectCell(row, col) {
    selectedCell = { row, col };
    highlightAll();
}

function updateFullBoardDisplay() {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            updateCellDisplay(r, c);
        }
    }
}

function updateCellDisplay(row, col) {
    const cell = getCell(row, col);
    if (!cell || cell.classList.contains('pre-filled')) return;

    const mainValueDiv = cell.querySelector('.main-value');
    const noteGrid = cell.querySelector('.note-grid');

    mainValueDiv.textContent = currentPuzzle[row][col] !== 0 ? currentPuzzle[row][col] : '';

    // Add/remove user-input class
    if (initialPuzzle[row][col] === 0 && currentPuzzle[row][col] !== 0) {
        mainValueDiv.classList.add('user-input');
    } else {
        mainValueDiv.classList.remove('user-input');
    }

    const noteCells = noteGrid.querySelectorAll('.note-cell');
    for (let n = 1; n <= 9; n++) {
        noteCells[n - 1].textContent = notes[row][col].has(n) ? n : '';
    }
}

// --- 4. HIGHLIGHTING ---
function highlightAll() {
    clearHighlights();
    if (selectedCell.row === -1) return;

    highlightRowColBox();
    const selectedNumber = currentPuzzle[selectedCell.row][selectedCell.col];
    if (selectedNumber !== 0) {
        highlightNumber(selectedNumber);
    }
}

function clearHighlights() {
    document.querySelectorAll('.cell').forEach(c => {
        c.classList.remove('selected', 'highlighted', 'highlighted-number', 'hint');
    });
}

function highlightRowColBox() {
    const { row, col } = selectedCell;
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;

    for (let i = 0; i < 9; i++) {
        getCell(row, i).classList.add('highlighted');
        getCell(i, col).classList.add('highlighted');
        const boxRow = startRow + Math.floor(i / 3);
        const boxCol = startCol + (i % 3);
        getCell(boxRow, boxCol).classList.add('highlighted');
    }
    getCell(row, col).classList.add('selected');
}

function highlightNumber(num) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (currentPuzzle[r][c] === num || initialPuzzle[r][c] === num) {
                getCell(r, c).classList.add('highlighted-number');
            }
        }
    }
}

// --- 5. VALIDATION & GAME STATE ---
function validateBoard() {
    let allValid = true;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = getCell(r, c);
            const mainValueDiv = cell.querySelector('.main-value');
            if (mainValueDiv) {
                if (currentPuzzle[r][c] !== 0 && !isCellValid(r, c)) {
                    mainValueDiv.classList.add('error');
                    allValid = false;
                } else {
                    mainValueDiv.classList.remove('error');
                }
            }
        }
    }
    if (allValid && !isSolved()) message.textContent = '';
}

function isValid(board, row, col, num) {
    for (let i = 0; i < 9; i++) {
        if ((board[row][i] === num && i !== col) || (board[i][col] === num && i !== row)) {
            return false;
        }
    }
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const r = startRow + i;
            const c = startCol + j;
            if (board[r][c] === num && (r !== row || c !== col)) {
                return false;
            }
        }
    }
    return true;
}

function isCellValid(row, col) {
    const num = currentPuzzle[row][col];
    if (num === 0) return true;
    return isValid(currentPuzzle, row, col, num);
}

function isSolved() {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (currentPuzzle[i][j] === 0 || !isCellValid(i, j)) {
                return false;
            }
        }
    }
    return true;
}

// --- 6. BUTTON ACTIONS & HELPERS ---
function newGame() {
    generatePuzzle();
    createBoard();
    message.textContent = '';
    selectedCell = { row: -1, col: -1 };
    clearHighlights();
}

function resetCurrentPuzzle() {
    currentPuzzle = JSON.parse(JSON.stringify(initialPuzzle));
    notes = Array(9).fill(0).map(() => Array(9).fill(0).map(() => new Set()));
    createBoard();
    validateBoard();
    message.textContent = '盤面をリセットしました';
    selectedCell = { row: -1, col: -1 };
    clearHighlights();
}

function showSolution() {
    currentPuzzle = JSON.parse(JSON.stringify(solution));
    notes = Array(9).fill(0).map(() => Array(9).fill(0).map(() => new Set()));
    createBoard();
    validateBoard();
    message.textContent = '答えを表示しました';
    selectedCell = { row: -1, col: -1 };
    clearHighlights();
}

function getCell(row, col) {
    return gameBoard.querySelector(`[data-row="${row}"][data-col="${col}"]`);
}

// --- HINT FUNCTIONALITY (MODIFIED) ---
function getPossibleNumbers(board, row, col) {
    const possible = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (let i = 0; i < 9; i++) {
        possible.delete(board[row][i]);
        possible.delete(board[i][col]);
    }
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            possible.delete(board[startRow + i][startCol + j]);
        }
    }
    return Array.from(possible);
}

function findHint() {
    // Priority 1: Cross-hatching (basic elimination explanation)
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (currentPuzzle[r][c] === 0) {
                const possible = getPossibleNumbers(currentPuzzle, r, c);
                if (possible.length < 9) { // If there's at least one number eliminated
                    return { type: 'cross-hatching', row: r, col: c, eliminated: (9 - possible.length) };
                }
            }
        }
    }

    // Priority 2: Naked Single (Cell has only one possible number)
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (currentPuzzle[r][c] === 0) {
                const possible = getPossibleNumbers(currentPuzzle, r, c);
                if (possible.length === 1) {
                    return { type: 'naked-single', row: r, col: c, value: possible[0] };
                }
            }
        }
    }

    // Priority 3: Hidden Single (Number can only go in one cell in a row, col, or box)
    for (let num = 1; num <= 9; num++) {
        // Check rows
        for (let r = 0; r < 9; r++) {
            let possibleCols = [];
            for (let c = 0; c < 9; c++) {
                if (currentPuzzle[r][c] === 0 && isValid(currentPuzzle, r, c, num)) {
                    possibleCols.push(c);
                }
            }
            if (possibleCols.length === 1) {
                return { type: 'hidden-single-row', row: r, col: possibleCols[0], value: num };
            }
        }

        // Check columns
        for (let c = 0; c < 9; c++) {
            let possibleRows = [];
            for (let r = 0; r < 9; r++) {
                if (currentPuzzle[r][c] === 0 && isValid(currentPuzzle, r, c, num)) {
                    possibleRows.push(r);
                }
            }
            if (possibleRows.length === 1) {
                return { type: 'hidden-single-col', row: possibleRows[0], col: c, value: num };
            }
        }

        // Check 3x3 boxes
        for (let boxRow = 0; boxRow < 3; boxRow++) {
            for (let boxCol = 0; boxCol < 3; boxCol++) {
                let possibleCells = [];
                const startRow = boxRow * 3;
                const startCol = boxCol * 3;
                for (let r = 0; r < 3; r++) {
                    for (let c = 0; c < 3; c++) {
                        const curRow = startRow + r;
                        const curCol = startCol + c;
                        if (currentPuzzle[curRow][curCol] === 0 && isValid(currentPuzzle, curRow, curCol, num)) {
                            possibleCells.push({ row: curRow, col: curCol });
                        }
                    }
                }
                if (possibleCells.length === 1) {
                    return { type: 'hidden-single-box', row: possibleCells[0].row, col: possibleCells[0].col, value: num };
                }
            }
        }
    }
    return null; // No single candidate found
}

function highlightRelevantArea(type, row, col) {
    if (type === 'cross-hatching') {
        // Highlight the row, column, and box of the target cell
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;
        for (let i = 0; i < 9; i++) {
            getCell(row, i).classList.add('highlighted');
            getCell(i, col).classList.add('highlighted');
            const boxR = startRow + Math.floor(i / 3);
            const boxC = startCol + (i % 3);
            getCell(boxR, boxC).classList.add('highlighted');
        }
    } else if (type === 'hidden-single-row') {
        for (let c = 0; c < 9; c++) {
            getCell(row, c).classList.add('highlighted');
        }
    } else if (type === 'hidden-single-col') {
        for (let r = 0; r < 9; r++) {
            getCell(r, col).classList.add('highlighted');
        }
    }
    else if (type === 'hidden-single-box') {
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                getCell(startRow + r, startCol + c).classList.add('highlighted');
            }
        }
    }
}

function applyHint() {
    clearHighlights();
    const hint = findHint(); // Changed to findHint
    if (hint) {
        const { type, row, col, value } = hint;
        const targetCell = getCell(row, col);
        targetCell.classList.add('hint'); // Highlight the target cell

        let hintMessage = '';
        if (type === 'cross-hatching') {
            hintMessage = `ヒント: セル (${row + 1}, ${col + 1}) を見てください。このセルと同じ行、列、ブロックにある数字を排除すると、残りの候補が絞り込めます。`;
            highlightRelevantArea(type, row, col);
        } else if (type === 'naked-single') {
            hintMessage = `ヒント: セル (${row + 1}, ${col + 1}) に注目！このセルに入る数字は、他の数字を排除すると ${value} の1つしか残りません。これが「裸のシングル」です。`;
        } else if (type.startsWith('hidden-single')) {
            let area = '';
            if (type === 'hidden-single-row') area = `行 ${row + 1}`; 
            else if (type === 'hidden-single-col') area = `列 ${col + 1}`; 
            else if (type === 'hidden-single-box') {
                const boxNum = Math.floor(row / 3) * 3 + Math.floor(col / 3) + 1;
                area = `ブロック ${boxNum}`; 
            }
            hintMessage = `ヒント: ${area} で数字 ${value} が入る場所はセル (${row + 1}, ${col + 1}) だけです。これが「隠れたシングル」です。`;
            highlightRelevantArea(type, row, col);
        }
        message.textContent = hintMessage;

        setTimeout(() => {
            targetCell.classList.remove('hint');
            clearHighlights(); 
        }, 5000); // Increased delay for better readability
    } else {
        message.textContent = 'ヒントが見つかりませんでした。頑張って！';
    }
}

// --- 7. EVENT LISTENERS & INITIAL LOAD ---
newGameBtn.addEventListener('click', newGame);
resetBtn.addEventListener('click', resetCurrentPuzzle);
solveBtn.addEventListener('click', showSolution);
hintBtn.addEventListener('click', applyHint);

document.addEventListener('keydown', (e) => {
    if (selectedCell.row === -1) return;
    if (e.key >= '1' && e.key <= '9') {
        handleNumpadInput(parseInt(e.key));
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleNumpadInput(0);
    }
});

newGame();
createNumpad();
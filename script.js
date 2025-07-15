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
    if (selectedCell.row === -1) {
        // セルが選択されていない場合の視覚的フィードバック
        showMessage('セルを選択してください', 'warning');
        return;
    }
    
    const { row, col } = selectedCell;
    
    if (initialPuzzle[row][col] !== 0) {
        // 事前入力セルの場合の視覚的フィードバック
        showMessage('この数字は変更できません', 'info');
        return;
    }

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

    // 成功時のフィードバック
    if (num !== 0) {
        showMessage(`${num} を入力しました`, 'success');
        // 軽い振動フィードバック（対応デバイスのみ）
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }

    updateFullBoardDisplay();
    validateBoard();
    highlightAll();
    
    // AIアシスタントの分析を更新
    if (typeof updateAIAnalysis === 'function') {
        updateAIAnalysis();
    }

    if (isSolved()) {
        message.textContent = 'クリア！おめでとうございます！';
    }
}

// メッセージ表示関数を追加
function showMessage(text, type = 'info') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    
    // 3秒後に自動消去
    setTimeout(() => {
        if (messageEl.textContent === text) {
            messageEl.textContent = '';
            messageEl.className = 'message';
        }
    }, 3000);
}

function selectCell(row, col) {
    selectedCell = { row, col };
    highlightAll();
}

function updateFullBoardDisplay() {
    // パフォーマンス最適化：requestAnimationFrameを使用
    if (window.updateBoardPending) return;
    window.updateBoardPending = true;
    
    requestAnimationFrame(() => {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                updateCellDisplay(r, c);
            }
        }
        window.updateBoardPending = false;
    });
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
    
    // 完成した行、列、ブロックをハイライト
    highlightCompletedAreas();
    
    if (selectedCell.row === -1) return;

    highlightRowColBox();
    const selectedNumber = currentPuzzle[selectedCell.row][selectedCell.col];
    if (selectedNumber !== 0) {
        highlightNumber(selectedNumber);
    }
}

function clearHighlights() {
    document.querySelectorAll('.cell').forEach(c => {
        c.classList.remove('selected', 'highlighted', 'highlighted-number', 'hint', 
                          'completed-row', 'completed-col', 'completed-block');
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
    
    // 完成した行、列、ブロックをハイライト
    highlightCompletedAreas();
}

// 完成チェック関数
function isRowComplete(row) {
    const numbers = new Set();
    for (let col = 0; col < 9; col++) {
        const num = currentPuzzle[row][col];
        if (num === 0 || numbers.has(num)) {
            return false;
        }
        numbers.add(num);
    }
    return numbers.size === 9;
}

function isColComplete(col) {
    const numbers = new Set();
    for (let row = 0; row < 9; row++) {
        const num = currentPuzzle[row][col];
        if (num === 0 || numbers.has(num)) {
            return false;
        }
        numbers.add(num);
    }
    return numbers.size === 9;
}

function isBlockComplete(blockRow, blockCol) {
    const numbers = new Set();
    const startRow = blockRow * 3;
    const startCol = blockCol * 3;
    
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const num = currentPuzzle[startRow + i][startCol + j];
            if (num === 0 || numbers.has(num)) {
                return false;
            }
            numbers.add(num);
        }
    }
    return numbers.size === 9;
}

// 完成した行、列、ブロックをハイライト
function highlightCompletedAreas() {
    // 既存の完成ハイライトをクリア
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('completed-row', 'completed-col', 'completed-block');
    });
    
    // 完成した行をハイライト
    for (let row = 0; row < 9; row++) {
        if (isRowComplete(row)) {
            for (let col = 0; col < 9; col++) {
                getCell(row, col).classList.add('completed-row');
            }
        }
    }
    
    // 完成した列をハイライト
    for (let col = 0; col < 9; col++) {
        if (isColComplete(col)) {
            for (let row = 0; row < 9; row++) {
                getCell(row, col).classList.add('completed-col');
            }
        }
    }
    
    // 完成したブロックをハイライト
    for (let blockRow = 0; blockRow < 3; blockRow++) {
        for (let blockCol = 0; blockCol < 3; blockCol++) {
            if (isBlockComplete(blockRow, blockCol)) {
                const startRow = blockRow * 3;
                const startCol = blockCol * 3;
                for (let i = 0; i < 3; i++) {
                    for (let j = 0; j < 3; j++) {
                        getCell(startRow + i, startCol + j).classList.add('completed-block');
                    }
                }
            }
        }
    }
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
    handleGameComplete();
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
document.addEventListener('keydown', (e) => {
    if (selectedCell.row === -1) return;
    if (e.key >= '1' && e.key <= '9') {
        handleNumpadInput(parseInt(e.key));
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleNumpadInput(0);
    }
});

// 新しいグローバル変数
let currentDifficulty = 'easy';
let playerLevel = 'beginner';
let playerProgress = { beginner: 0, easy: 0, medium: 0, hard: 0, expert: 0 };
let gameTimer = { start: null, elapsed: 0, interval: null };
let solvedProblems = 0;
let totalProblems = 0;

// 難易度設定
const DIFFICULTY_SETTINGS = {
    beginner: { size: 4, clues: 8, name: '入門 (4x4)' },
    easy: { size: 9, clues: 45, name: '初級' },
    medium: { size: 9, clues: 35, name: '中級' },
    hard: { size: 9, clues: 28, name: '上級' },
    expert: { size: 9, clues: 22, name: 'エキスパート' }
};

// タイマー機能
function startTimer() {
    gameTimer.start = Date.now();
    gameTimer.interval = setInterval(updateTimer, 1000);
}

function stopTimer() {
    if (gameTimer.interval) {
        clearInterval(gameTimer.interval);
        gameTimer.interval = null;
    }
}

function updateTimer() {
    if (gameTimer.start) {
        gameTimer.elapsed = Date.now() - gameTimer.start;
        const seconds = Math.floor(gameTimer.elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const displaySeconds = seconds % 60;
        document.getElementById('time-display').textContent = 
            `${minutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`;
    }
}

// 難易度選択
function selectDifficulty(level) {
    currentDifficulty = level;
    document.getElementById('difficulty-panel').style.display = 'none';
    document.getElementById('player-info').style.display = 'block';
    document.getElementById('player-level').textContent = DIFFICULTY_SETTINGS[level].name;
    updateProgressDisplay();
    newGame();
}

// 進捗表示更新
function updateProgressDisplay() {
    const current = playerProgress[currentDifficulty];
    const target = getTargetForLevel(currentDifficulty);
    const percentage = (current / target) * 100;
    
    document.getElementById('progress-fill').style.width = `${percentage}%`;
    document.getElementById('progress-text').textContent = `${current}/${target}`;
}

function getTargetForLevel(level) {
    const targets = { beginner: 5, easy: 10, medium: 15, hard: 20, expert: 25 };
    return targets[level] || 10;
}

// 改良されたヒントシステム
function showDetailedHint() {
    clearHighlights();
    const hint = findHint();
    
    if (hint) {
        const { type, row, col, value, technique } = hint;
        const targetCell = getCell(row, col);
        targetCell.classList.add('hint');
        
        // 詳細なヒント表示
        const hintPanel = document.getElementById('advanced-hint-panel');
        const basicHintContent = document.getElementById('basic-hint');
        const techniqueHintContent = document.getElementById('technique-hint');
        
        if (hintPanel && basicHintContent && techniqueHintContent) {
            basicHintContent.innerHTML = generateHintMessage(hint);
            techniqueHintContent.innerHTML = getTechniqueExplanation(type);
            
            hintPanel.style.display = 'block';
            
            // 基本ヒントタブをアクティブにする
            document.querySelectorAll('.hint-tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.hint-content').forEach(content => content.classList.remove('active'));
            
            document.querySelector('[data-hint-type="basic"]').classList.add('active');
            basicHintContent.classList.add('active');
        }
        
        highlightRelevantArea(type, row, col);
        
        setTimeout(() => {
            targetCell.classList.remove('hint');
        }, 3000);
        
        message.textContent = 'ヒントを表示しました！';
    } else {
        message.textContent = 'ヒントが見つかりませんでした。';
    }
}

function generateHintMessage(hint) {
    const { type, row, col, value } = hint;
    const cellRef = `セル (${row + 1}, ${col + 1})`;
    
    switch(type) {
        case 'naked-single':
            return `${cellRef} に注目！このセルに入る数字は ${value} だけです。`;
        case 'hidden-single-row':
            return `行 ${row + 1} で数字 ${value} が入る場所は ${cellRef} だけです。`;
        case 'hidden-single-col':
            return `列 ${col + 1} で数字 ${value} が入る場所は ${cellRef} だけです。`;
        case 'hidden-single-box':
            const boxNum = Math.floor(row / 3) * 3 + Math.floor(col / 3) + 1;
            return `ブロック ${boxNum} で数字 ${value} が入る場所は ${cellRef} だけです。`;
        default:
            return `${cellRef} を確認してください。`;
    }
}

function getTechniqueExplanation(type) {
    const explanations = {
        'naked-single': '裸のシングル：そのセルに入る可能性のある数字が1つだけの状態です。',
        'hidden-single-row': '隠れたシングル（行）：その行でその数字が入る場所が1つだけの状態です。',
        'hidden-single-col': '隠れたシングル（列）：その列でその数字が入る場所が1つだけの状態です。',
        'hidden-single-box': '隠れたシングル（ブロック）：そのブロックでその数字が入る場所が1つだけの状態です。'
    };
    return explanations[type] || '';
}

// ゲーム完了時の処理を拡張
function handleGameComplete() {
    stopTimer();
    playerProgress[currentDifficulty]++;
    solvedProblems++;
    
    const timeBonus = calculateTimeBonus();
    const message = `クリア！おめでとうございます！\n時間: ${formatTime(gameTimer.elapsed)}${timeBonus ? ` (ボーナス: ${timeBonus}秒)` : ''}`;
    
    document.getElementById('message').textContent = message;
    updateProgressDisplay();
    
    // レベルアップチェック
    checkLevelUp();
    
    // 統計を保存
    saveGameStats();
}

function calculateTimeBonus() {
    const targetTimes = { beginner: 120, easy: 300, medium: 600, hard: 900, expert: 1200 };
    const target = targetTimes[currentDifficulty] * 1000;
    return gameTimer.elapsed < target ? Math.floor((target - gameTimer.elapsed) / 1000) : 0;
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function checkLevelUp() {
    const current = playerProgress[currentDifficulty];
    const target = getTargetForLevel(currentDifficulty);
    
    if (current >= target) {
        // レベルアップ処理
        showLevelUpMessage();
    }
}

function showLevelUpMessage() {
    alert(`レベルアップ！次の難易度に挑戦できます！`);
}

// 統計保存
function saveGameStats() {
    const stats = {
        playerProgress,
        solvedProblems,
        totalProblems,
        lastPlayed: Date.now()
    };
    localStorage.setItem('sudokuMasterStats', JSON.stringify(stats));
}

function loadGameStats() {
    const saved = localStorage.getItem('sudokuMasterStats');
    if (saved) {
        const stats = JSON.parse(saved);
        playerProgress = stats.playerProgress || playerProgress;
        solvedProblems = stats.solvedProblems || 0;
        totalProblems = stats.totalProblems || 0;
    }
}

// 修正されたnewGame関数
function newGame() {
    generatePuzzle();
    createBoard();
    message.textContent = '';
    selectedCell = { row: -1, col: -1 };
    clearHighlights();
    
    // タイマーをリセットして開始
    stopTimer();
    gameTimer.elapsed = 0;
    startTimer();
    
    // AIアシスタントの分析を更新
    if (typeof updateAIAnalysis === 'function') {
        updateAIAnalysis();
    }
}

// 修正されたisSolved関数
function isSolved() {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (currentPuzzle[i][j] === 0 || !isCellValid(i, j)) {
                return false;
            }
        }
    }
    handleGameComplete();
    return true;
}

// チュートリアル関連の変数
let currentTutorial = null;
let tutorialStep = 0;
let practiceMode = false;
let practiceStats = {
    currentTechnique: '',
    currentProblem: 0,
    totalProblems: 5,
    correctAnswers: 0
};
let playerBadges = [];
let learnedTechniques = [];

// チュートリアルデータ
const TUTORIALS = {
    basics: {
        title: '数独の基本ルール',
        steps: [
            {
                explanation: '数独は9×9のマスに1から9の数字を入れるパズルです。',
                board: null,
                highlight: []
            },
            {
                explanation: '各行には1から9の数字が1つずつ入ります。',
                board: 'demo_row',
                highlight: [{ type: 'row', index: 0 }]
            },
            {
                explanation: '各列にも1から9の数字が1つずつ入ります。',
                board: 'demo_col',
                highlight: [{ type: 'col', index: 0 }]
            },
            {
                explanation: '3×3のブロックにも1から9の数字が1つずつ入ります。',
                board: 'demo_box',
                highlight: [{ type: 'box', index: 0 }]
            }
        ]
    },
    'naked-single': {
        title: '裸のシングル',
        steps: [
            {
                explanation: '裸のシングルは、あるセルに入る可能性のある数字が1つだけの状態です。',
                board: 'naked_single_demo',
                highlight: [{ type: 'cell', row: 0, col: 0 }]
            },
            {
                explanation: 'このセルを見てください。周りの数字を確認すると...',
                board: 'naked_single_demo',
                highlight: [{ type: 'related', row: 0, col: 0 }]
            },
            {
                explanation: '入る可能性のある数字は5だけです！',
                board: 'naked_single_solution',
                highlight: [{ type: 'solution', row: 0, col: 0, value: 5 }]
            }
        ]
    },
    'hidden-single': {
        title: '隠れたシングル',
        steps: [
            {
                explanation: '隠れたシングルは、ある数字がその行・列・ブロック内で1箇所にしか入らない状態です。',
                board: 'hidden_single_demo',
                highlight: []
            },
            {
                explanation: '数字7に注目してください。この行で7が入る場所は...',
                board: 'hidden_single_demo',
                highlight: [{ type: 'row', index: 2, number: 7 }]
            },
            {
                explanation: 'ここだけです！',
                board: 'hidden_single_solution',
                highlight: [{ type: 'solution', row: 2, col: 5, value: 7 }]
            }
        ]
    }
};

// タブ切り替え機能
function initializeTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    // すべてのタブを非アクティブに
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // 選択されたタブをアクティブに
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // タブ固有の初期化
    if (tabName === 'tutorial') {
        initializeTutorialTab();
    } else if (tabName === 'practice') {
        initializePracticeTab();
    } else if (tabName === 'achievements') {
        initializeAchievementsTab();
    }
}

// チュートリアル機能
function initializeTutorialTab() {
    document.querySelectorAll('.tutorial-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const tutorialType = e.currentTarget.dataset.tutorial;
            startTutorial(tutorialType);
        });
    });
}

function startTutorial(type) {
    currentTutorial = TUTORIALS[type];
    tutorialStep = 0;
    
    document.getElementById('tutorial-selection').style.display = 'none';
    document.getElementById('tutorial-execution').style.display = 'block';
    
    document.getElementById('tutorial-title').textContent = currentTutorial.title;
    showTutorialStep();
}

function showTutorialStep() {
    const step = currentTutorial.steps[tutorialStep];
    document.getElementById('tutorial-explanation').textContent = step.explanation;
    
    // チュートリアル用ボードの表示
    if (step.board) {
        createTutorialBoard(step.board, step.highlight);
    }
    
    // ナビゲーションボタンの状態更新
    document.getElementById('tutorial-prev').disabled = tutorialStep === 0;
    document.getElementById('tutorial-next').disabled = tutorialStep === currentTutorial.steps.length - 1;
}

function createTutorialBoard(boardType, highlights) {
    const tutorialBoard = document.getElementById('tutorial-board');
    tutorialBoard.innerHTML = '';
    
    // デモ用のボードデータを生成
    const demoBoard = generateDemoBoard(boardType);
    
    // ボードを描画
    for (let i = 0; i < 9; i++) {
        const rowDiv = document.createElement('div');
        rowDiv.classList.add('tutorial-row');
        for (let j = 0; j < 9; j++) {
            const cell = document.createElement('div');
            cell.classList.add('tutorial-cell');
            cell.textContent = demoBoard[i][j] !== 0 ? demoBoard[i][j] : '';
            
            // ハイライト適用
            highlights.forEach(highlight => {
                if (highlight.type === 'cell' && highlight.row === i && highlight.col === j) {
                    cell.classList.add('tutorial-highlight');
                } else if (highlight.type === 'row' && highlight.index === i) {
                    cell.classList.add('tutorial-row-highlight');
                } else if (highlight.type === 'col' && highlight.index === j) {
                    cell.classList.add('tutorial-col-highlight');
                }
            });
            
            rowDiv.appendChild(cell);
        }
        tutorialBoard.appendChild(rowDiv);
    }
}

function generateDemoBoard(type) {
    // デモ用のボードパターンを返す
    const patterns = {
        demo_row: [
            [1,2,3,4,5,6,7,8,9],
            [0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0]
        ],
        naked_single_demo: [
            [0,2,3,4,5,6,7,8,9],
            [4,0,0,0,0,0,0,0,1],
            [6,0,0,0,0,0,0,0,2],
            [7,0,0,0,0,0,0,0,3],
            [8,0,0,0,0,0,0,0,4],
            [9,0,0,0,0,0,0,0,5],
            [1,0,0,0,0,0,0,0,6],
            [2,0,0,0,0,0,0,0,7],
            [3,0,0,0,0,0,0,0,8]
        ]
    };
    return patterns[type] || Array(9).fill(0).map(() => Array(9).fill(0));
}

// 練習モード
function initializePracticeTab() {
    document.getElementById('start-practice').addEventListener('click', startPractice);
    
    // 練習モード用のコントロールボタン
    document.getElementById('practice-hint').addEventListener('click', () => {
        // 練習用ヒント機能
        showDetailedHint();
    });
    
    document.getElementById('practice-skip').addEventListener('click', () => {
        // 次の問題へスキップ
        practiceStats.currentProblem++;
        if (practiceStats.currentProblem <= practiceStats.totalProblems) {
            generatePracticeProblems(practiceStats.currentTechnique);
            updatePracticeDisplay();
        }
    });
    
    document.getElementById('practice-finish').addEventListener('click', () => {
        // 練習終了
        document.getElementById('practice-area').style.display = 'none';
        document.getElementById('practice-selection').style.display = 'block';
        practiceMode = false;
    });
}

function startPractice() {
    const technique = document.getElementById('technique-selector').value;
    practiceStats.currentTechnique = technique;
    practiceStats.currentProblem = 1;
    practiceStats.correctAnswers = 0;
    
    document.getElementById('practice-selection').style.display = 'none';
    document.getElementById('practice-area').style.display = 'block';
    
    generatePracticeProblems(technique);
    updatePracticeDisplay();
}

function generatePracticeProblems(technique) {
    // 特定のテクニックに焦点を当てた問題を生成
    practiceMode = true;
    generatePuzzle(); // 既存の関数を使用
    
    // 練習用ボードを作成
    createPracticeBoard();
}

// 練習用ボード作成関数を追加
function createPracticeBoard() {
    const practiceBoard = document.getElementById('practice-board');
    practiceBoard.innerHTML = '';
    
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
                if (currentPuzzle[i][j] !== 0) {
                    mainValueDiv.textContent = currentPuzzle[i][j];
                    mainValueDiv.classList.add('user-input');
                }
                cell.appendChild(mainValueDiv);

                const noteGrid = document.createElement('div');
                noteGrid.classList.add('note-grid');
                for (let n = 1; n <= 9; n++) {
                    const noteCell = document.createElement('div');
                    noteCell.classList.add('note-cell');
                    noteCell.dataset.note = n;
                    if (notes[i][j].has(n)) {
                        noteCell.textContent = n;
                    }
                    noteGrid.appendChild(noteCell);
                }
                cell.appendChild(noteGrid);
            }
            
            // 練習モード用のクリックイベント
            cell.addEventListener('click', () => handlePracticeClick(i, j));
            rowDiv.appendChild(cell);
        }
        practiceBoard.appendChild(rowDiv);
    }
}

// 練習モード用のセルクリック処理
function handlePracticeClick(row, col) {
    selectedCell = { row, col };
    // 練習モード用のハイライト処理
    document.querySelectorAll('#practice-board .cell').forEach(cell => {
        cell.classList.remove('selected', 'highlighted');
    });
    
    const clickedCell = document.querySelector(`#practice-board .cell[data-row="${row}"][data-col="${col}"]`);
    if (clickedCell) {
        clickedCell.classList.add('selected');
    }
}

// 練習モード用の数字入力処理も追加
function handlePracticeInput(num) {
    if (selectedCell.row === -1) return;
    const { row, col } = selectedCell;

    if (initialPuzzle[row][col] !== 0) return; // 事前入力セルは変更不可

    if (num === 0) {
        currentPuzzle[row][col] = 0;
        notes[row][col].clear();
    } else {
        currentPuzzle[row][col] = num;
        notes[row][col].clear();
    }

    // 練習ボードの表示を更新
    updatePracticeBoard();
    
    // 正解チェック
    if (currentPuzzle[row][col] === solution[row][col]) {
        practiceStats.correctAnswers++;
        // 正解時の処理
    }
    
    updatePracticeDisplay();
}

// 練習ボードの表示更新
function updatePracticeBoard() {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cell = document.querySelector(`#practice-board .cell[data-row="${r}"][data-col="${c}"]`);
            if (!cell || cell.classList.contains('pre-filled')) continue;

            const mainValueDiv = cell.querySelector('.main-value');
            const noteGrid = cell.querySelector('.note-grid');

            mainValueDiv.textContent = currentPuzzle[r][c] !== 0 ? currentPuzzle[r][c] : '';

            if (initialPuzzle[r][c] === 0 && currentPuzzle[r][c] !== 0) {
                mainValueDiv.classList.add('user-input');
            } else {
                mainValueDiv.classList.remove('user-input');
            }

            const noteCells = noteGrid.querySelectorAll('.note-cell');
            for (let n = 1; n <= 9; n++) {
                noteCells[n - 1].textContent = notes[r][c].has(n) ? n : '';
            }
        }
    }
}

function updatePracticeDisplay() {
    document.getElementById('current-technique').textContent = practiceStats.currentTechnique;
    document.getElementById('practice-progress').textContent = 
        `${practiceStats.currentProblem}/${practiceStats.totalProblems}`;
    const accuracy = practiceStats.currentProblem > 1 ? 
        Math.round((practiceStats.correctAnswers / (practiceStats.currentProblem - 1)) * 100) : 0;
    document.getElementById('practice-accuracy').textContent = `${accuracy}%`;
}

// 実績・バッジシステム
function initializeAchievementsTab() {
    updatePlayerStats();
    displayBadges();
    displayTechniqueProgress();
}

function updatePlayerStats() {
    document.getElementById('total-solved').textContent = solvedProblems;
    
    // 平均時間の計算（簡略化）
    const avgTime = solvedProblems > 0 ? '05:30' : '--:--';
    document.getElementById('average-time').textContent = avgTime;
    
    document.getElementById('learned-techniques').textContent = `${learnedTechniques.length}/10`;
    
    // ランク計算
    const rank = calculatePlayerRank();
    document.getElementById('current-rank').textContent = rank;
}

function calculatePlayerRank() {
    if (solvedProblems < 5) return '初心者';
    if (solvedProblems < 20) return '見習い';
    if (solvedProblems < 50) return '中級者';
    if (solvedProblems < 100) return '上級者';
    return 'マスター';
}

function displayBadges() {
    const badgesGrid = document.getElementById('badges-grid');
    badgesGrid.innerHTML = '';
    
    const allBadges = [
        { id: 'first-solve', name: '初回クリア', description: '最初の問題をクリア', earned: solvedProblems > 0 },
        { id: 'speed-demon', name: 'スピードマスター', description: '3分以内でクリア', earned: false },
        { id: 'no-hints', name: 'ヒント不要', description: 'ヒントなしでクリア', earned: false },
        { id: 'technique-master', name: 'テクニックマスター', description: '5つのテクニックを習得', earned: learnedTechniques.length >= 5 }
    ];
    
    allBadges.forEach(badge => {
        const badgeElement = document.createElement('div');
        badgeElement.className = `badge ${badge.earned ? 'earned' : 'locked'}`;
        badgeElement.innerHTML = `
            <div class="badge-icon">${badge.earned ? '🏆' : '🔒'}</div>
            <div class="badge-name">${badge.name}</div>
            <div class="badge-description">${badge.description}</div>
        `;
        badgesGrid.appendChild(badgeElement);
    });
}

function displayTechniqueProgress() {
    const techniqueList = document.getElementById('technique-list');
    techniqueList.innerHTML = '';
    
    const techniques = [
        { name: '裸のシングル', difficulty: '入門', learned: learnedTechniques.includes('naked-single') },
        { name: '隠れたシングル', difficulty: '初級', learned: learnedTechniques.includes('hidden-single') },
        { name: '裸のペア', difficulty: '中級', learned: learnedTechniques.includes('naked-pair') },
        { name: 'ポインティングペア', difficulty: '中級', learned: learnedTechniques.includes('pointing-pair') },
        { name: 'X-Wing', difficulty: '上級', learned: learnedTechniques.includes('x-wing') }
    ];
    
    techniques.forEach(technique => {
        const techniqueElement = document.createElement('div');
        techniqueElement.className = `technique-item ${technique.learned ? 'learned' : 'not-learned'}`;
        techniqueElement.innerHTML = `
            <div class="technique-name">${technique.name}</div>
            <div class="technique-difficulty">${technique.difficulty}</div>
            <div class="technique-status">${technique.learned ? '✓ 習得済み' : '未習得'}</div>
        `;
        techniqueList.appendChild(techniqueElement);
    });
}

// AIアシスタント機能
function initializeAIAssistant() {
    const aiAssistant = document.getElementById('ai-assistant');
    const aiToggle = document.getElementById('ai-toggle');
    const aiContent = document.getElementById('ai-content');
    
    if (!aiAssistant || !aiToggle || !aiContent) {
        console.error('AIアシスタント要素が見つかりません');
        return;
    }
    
    // 初期状態で表示
    aiAssistant.style.display = 'block';
    
    // トグルボタンの機能
    aiToggle.addEventListener('click', () => {
        if (aiContent.style.display === 'none') {
            aiContent.style.display = 'block';
            aiToggle.textContent = '−';
        } else {
            aiContent.style.display = 'none';
            aiToggle.textContent = '+';
        }
    });
    
    // 初期分析を実行
    updateAIAnalysis();
}

function updateAIAnalysis() {
    updateAIRecommendations();
    updateBoardAnalysis();
    updateLearningSuggestions();
}

function updateAIRecommendations() {
    const recommendationsDiv = document.getElementById('ai-recommendations');
    if (!recommendationsDiv) return;
    
    const recommendations = [];
    
    // 空のセルの数をチェック
    const emptyCells = countEmptyCells();
    if (emptyCells > 60) {
        recommendations.push('🎯 基本的な数字から埋めていきましょう');
    } else if (emptyCells > 30) {
        recommendations.push('🔍 隠れたシングルを探してみましょう');
    } else if (emptyCells > 10) {
        recommendations.push('🧩 高度なテクニックを使ってみましょう');
    } else {
        recommendations.push('🏁 もう少しでクリアです！');
    }
    
    // ヒントが利用可能かチェック
    const hint = findHint();
    if (hint) {
        recommendations.push('💡 ヒントが利用可能です');
    }
    
    recommendationsDiv.innerHTML = recommendations.map(rec => 
        `<div class="ai-recommendation">${rec}</div>`
    ).join('');
}

function updateBoardAnalysis() {
    const analysisDiv = document.getElementById('board-analysis');
    if (!analysisDiv) return;
    
    const emptyCells = countEmptyCells();
    const completionRate = Math.round(((81 - emptyCells) / 81) * 100);
    
    const analysis = [
        `📊 完成度: ${completionRate}%`,
        `📝 残りセル: ${emptyCells}個`,
        `⏱️ 経過時間: ${document.getElementById('time-display')?.textContent || '00:00'}`
    ];
    
    // 難易度分析
    if (emptyCells > 50) {
        analysis.push('📈 難易度: 初級レベル');
    } else if (emptyCells > 25) {
        analysis.push('📈 難易度: 中級レベル');
    } else {
        analysis.push('📈 難易度: 上級レベル');
    }
    
    analysisDiv.innerHTML = analysis.map(item => 
        `<div class="analysis-item">${item}</div>`
    ).join('');
}

function updateLearningSuggestions() {
    const suggestionsDiv = document.getElementById('learning-suggestions');
    if (!suggestionsDiv) return;
    
    const suggestions = [];
    
    // 学習レベルに基づく提案
    if (learnedTechniques.length < 2) {
        suggestions.push('📚 チュートリアルで基本テクニックを学習');
        suggestions.push('🎯 練習モードで裸のシングルを練習');
    } else if (learnedTechniques.length < 5) {
        suggestions.push('🔍 隠れたシングルテクニックを習得');
        suggestions.push('👥 裸のペアテクニックに挑戦');
    } else {
        suggestions.push('🏆 上級テクニックに挑戦');
        suggestions.push('⚡ スピード解法を練習');
    }
    
    suggestionsDiv.innerHTML = suggestions.map(suggestion => 
        `<div class="learning-suggestion">${suggestion}</div>`
    ).join('');
}

function countEmptyCells() {
    let count = 0;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (currentPuzzle[r][c] === 0) count++;
        }
    }
    return count;
}

// テクニック解説表示機能
function showTechniqueExplanation() {
    const hint = findHint();
    
    if (hint) {
        const { type } = hint;
        const explanation = getTechniqueExplanation(type);
        
        // ヒントパネルを表示してテクニック解説タブをアクティブに
        const hintPanel = document.getElementById('advanced-hint-panel');
        const techniqueHintContent = document.getElementById('technique-hint');
        
        if (hintPanel && techniqueHintContent) {
            techniqueHintContent.innerHTML = `
                <div class="technique-explanation">
                    <h4>🎓 テクニック解説</h4>
                    <div class="technique-details">
                        <h5>${getTechniqueName(type)}</h5>
                        <p>${explanation}</p>
                        <div class="technique-example">
                            <h6>使用例：</h6>
                            <p>${getTechniqueExample(type)}</p>
                        </div>
                    </div>
                </div>
            `;
            
            hintPanel.style.display = 'block';
            
            // テクニックタブをアクティブにする
            document.querySelectorAll('.hint-tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.hint-content').forEach(content => content.classList.remove('active'));
            
            document.querySelector('[data-hint-type="technique"]').classList.add('active');
            techniqueHintContent.classList.add('active');
        }
        
        message.textContent = 'テクニック解説を表示しました！';
    } else {
        // ヒントがない場合は一般的なテクニック解説を表示
        showGeneralTechniqueExplanation();
    }
}

function getTechniqueName(type) {
    const names = {
        'naked-single': '裸のシングル',
        'hidden-single-row': '隠れたシングル（行）',
        'hidden-single-col': '隠れたシングル（列）',
        'hidden-single-box': '隠れたシングル（ブロック）'
    };
    return names[type] || 'テクニック';
}

function getTechniqueExample(type) {
    const examples = {
        'naked-single': 'あるセルの候補数字が1つだけになった場合、その数字を確定できます。',
        'hidden-single-row': 'ある行で特定の数字が入る場所が1つだけの場合、そのセルにその数字を確定できます。',
        'hidden-single-col': 'ある列で特定の数字が入る場所が1つだけの場合、そのセルにその数字を確定できます。',
        'hidden-single-box': 'あるブロックで特定の数字が入る場所が1つだけの場合、そのセルにその数字を確定できます。'
    };
    return examples[type] || '基本的な数独解法テクニックです。';
}

function showGeneralTechniqueExplanation() {
    const hintPanel = document.getElementById('advanced-hint-panel');
    const techniqueHintContent = document.getElementById('technique-hint');
    
    if (hintPanel && techniqueHintContent) {
        techniqueHintContent.innerHTML = `
            <div class="technique-explanation">
                <h4>🎓 数独テクニック一覧</h4>
                <div class="technique-list">
                    <div class="technique-item">
                        <h5>裸のシングル</h5>
                        <p>そのセルに入る可能性のある数字が1つだけの状態です。最も基本的なテクニックです。</p>
                    </div>
                    <div class="technique-item">
                        <h5>隠れたシングル</h5>
                        <p>行・列・ブロック内でその数字が入る場所が1つだけの状態です。</p>
                    </div>
                    <div class="technique-item">
                        <h5>裸のペア</h5>
                        <p>2つのセルに同じ2つの候補数字がある場合、他のセルからその数字を除外できます。</p>
                    </div>
                    <div class="technique-item">
                        <h5>ポインティングペア</h5>
                        <p>ブロック内で特定の数字が一列に並んでいる場合、その列の他の部分からその数字を除外できます。</p>
                    </div>
                </div>
            </div>
        `;
        
        hintPanel.style.display = 'block';
        
        // テクニックタブをアクティブにする
        document.querySelectorAll('.hint-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.hint-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector('[data-hint-type="technique"]').classList.add('active');
        techniqueHintContent.classList.add('active');
    }
    
    message.textContent = 'テクニック解説を表示しました！';
}

// イベントリスナーの追加
document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の存在確認
    if (!newGameBtn || !resetBtn || !solveBtn || !hintBtn) {
        console.error('必要なボタン要素が見つかりません');
        return;
    }
    
    loadGameStats();
    
    // タブ初期化を追加
    initializeTabs();
    
    // 初期化処理をここに移動
    createNumpad();
    newGame();
    
    // AIアシスタント初期化を追加
    initializeAIAssistant();
    
    // 難易度選択ボタン
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectDifficulty(e.target.dataset.level);
        });
    });
    
    // メインボタンのイベントリスナー
    newGameBtn.addEventListener('click', newGame);
    resetBtn.addEventListener('click', resetCurrentPuzzle);
    solveBtn.addEventListener('click', showSolution);
    hintBtn.addEventListener('click', showDetailedHint);
    
    // テクニック解説ボタンのイベントリスナーを追加
    const techniqueBtn = document.getElementById('technique-btn');
    if (techniqueBtn) {
        techniqueBtn.addEventListener('click', showTechniqueExplanation);
    }
    
    // チュートリアルナビゲーションボタンのイベントリスナーを追加
    const tutorialPrevBtn = document.getElementById('tutorial-prev');
    const tutorialNextBtn = document.getElementById('tutorial-next');
    const tutorialBackBtn = document.getElementById('tutorial-back');
    
    if (tutorialPrevBtn) {
        tutorialPrevBtn.addEventListener('click', () => {
            if (tutorialStep > 0) {
                tutorialStep--;
                showTutorialStep();
            }
        });
    }
    
    if (tutorialNextBtn) {
        tutorialNextBtn.addEventListener('click', () => {
            if (currentTutorial && tutorialStep < currentTutorial.steps.length - 1) {
                tutorialStep++;
                showTutorialStep();
            }
        });
    }
    
    if (tutorialBackBtn) {
        tutorialBackBtn.addEventListener('click', () => {
            // チュートリアル選択画面に戻る
            document.getElementById('tutorial-selection').style.display = 'block';
            document.getElementById('tutorial-execution').style.display = 'none';
            currentTutorial = null;
            tutorialStep = 0;
        });
    }
    
    // ヒントパネルのタブ切り替え
    document.querySelectorAll('.hint-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const hintType = e.target.dataset.hintType;
            
            // すべてのタブとコンテンツを非アクティブに
            document.querySelectorAll('.hint-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.hint-content').forEach(c => c.classList.remove('active'));
            
            // 選択されたタブとコンテンツをアクティブに
            e.target.classList.add('active');
            document.getElementById(`${hintType}-hint`).classList.add('active');
        });
    });
    
    // ヒントパネルを閉じるボタン
    const closeHintBtn = document.getElementById('close-hint');
    if (closeHintBtn) {
        closeHintBtn.addEventListener('click', () => {
            const hintPanel = document.getElementById('advanced-hint-panel');
            if (hintPanel) {
                hintPanel.style.display = 'none';
                clearHighlights();
            }
        });
    }
    
    // 初期表示
    const playerInfo = document.getElementById('player-info');
    if (playerInfo) {
        playerInfo.style.display = 'none';
    }
});
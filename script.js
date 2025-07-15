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

// ゲーム状態
let currentDifficulty = 'easy';
let gameTimer = null;
let startTime = null;
let gameStats = {
    puzzlesSolved: 0,
    totalTime: 0
};

// 難易度設定
const DIFFICULTY_SETTINGS = {
    easy: { name: '初級', cellsToRemove: 45 },
    medium: { name: '中級', cellsToRemove: 50 },
    hard: { name: '上級', cellsToRemove: 55 },
    expert: { name: 'エキスパート', cellsToRemove: 60 }
};

// --- 1. PUZZLE GENERATION ---
function generatePuzzle() {
    solution = Array(9).fill(0).map(() => Array(9).fill(0));
    solve(solution);
    initialPuzzle = JSON.parse(JSON.stringify(solution));
    
    const settings = DIFFICULTY_SETTINGS[currentDifficulty];
    let attempts = settings.cellsToRemove;
    
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
        showMessage('セルを選択してください', 'warning');
        // セル選択を促すアニメーション
        gameBoard.classList.add('shake');
        setTimeout(() => gameBoard.classList.remove('shake'), 500);
        return;
    }
    
    const { row, col } = selectedCell;
    
    if (initialPuzzle[row][col] !== 0) {
        showMessage('この数字は変更できません', 'info');
        // 変更不可セルのアニメーション
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cell.classList.add('invalid-input');
        setTimeout(() => cell.classList.remove('invalid-input'), 300);
        return;
    }

    // 入力前の値を保存
    const previousValue = currentPuzzle[row][col];
    
    if (num === 0) {
        currentPuzzle[row][col] = 0;
    } else {
        currentPuzzle[row][col] = num;
        
        // 入力時のアニメーション
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cell.classList.add('number-input');
        setTimeout(() => cell.classList.remove('number-input'), 300);
        
        // 競合チェックと視覚的フィードバック
        if (!isValidPlacement(row, col, num)) {
            highlightConflicts(row, col, num);
            showMessage('この数字は配置できません', 'error');
        }
    }
    
    updateCellDisplay(row, col);
    
    if (isSolved()) {
        handleGameComplete();
    }
}

// 競合セルをハイライト
function highlightConflicts(row, col, num) {
    // 同じ行の競合
    for (let j = 0; j < 9; j++) {
        if (j !== col && currentPuzzle[row][j] === num) {
            const cell = document.querySelector(`[data-row="${row}"][data-col="${j}"]`);
            cell.classList.add('conflict');
            setTimeout(() => cell.classList.remove('conflict'), 2000);
        }
    }
    
    // 同じ列の競合
    for (let i = 0; i < 9; i++) {
        if (i !== row && currentPuzzle[i][col] === num) {
            const cell = document.querySelector(`[data-row="${i}"][data-col="${col}"]`);
            cell.classList.add('conflict');
            setTimeout(() => cell.classList.remove('conflict'), 2000);
        }
    }
    
    // 同じブロックの競合
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let i = startRow; i < startRow + 3; i++) {
        for (let j = startCol; j < startCol + 3; j++) {
            if ((i !== row || j !== col) && currentPuzzle[i][j] === num) {
                const cell = document.querySelector(`[data-row="${i}"][data-col="${j}"]`);
                cell.classList.add('conflict');
                setTimeout(() => cell.classList.remove('conflict'), 2000);
            }
        }
    }
}

function isValidPlacement(row, col, num) {
    const temp = currentPuzzle[row][col];
    currentPuzzle[row][col] = 0;
    const valid = isValid(currentPuzzle, row, col, num);
    currentPuzzle[row][col] = temp;
    return valid;
}

function showMessage(text, type = 'info') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = type;
    
    setTimeout(() => {
        messageEl.textContent = '';
        messageEl.className = '';
    }, 3000);
}

function selectCell(row, col) {
    selectedCell = { row, col };
    updateFullBoardDisplay();
}

function updateFullBoardDisplay() {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            updateCellDisplay(i, j);
        }
    }
}

function updateCellDisplay(row, col) {
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    
    // セル選択状態の更新
    if (selectedCell.row === row && selectedCell.col === col) {
        cell.classList.add('selected');
    } else {
        cell.classList.remove('selected');
    }
    
    // 数字表示の更新
    if (currentPuzzle[row][col] !== 0) {
        cell.textContent = currentPuzzle[row][col];
        cell.classList.add('filled');
    } else if (initialPuzzle[row][col] === 0) {
        cell.textContent = '';
        cell.classList.remove('filled');
    }
}

// --- 4. VALIDATION ---
function isValid(board, row, col, num) {
    // 行チェック
    for (let j = 0; j < 9; j++) {
        if (board[row][j] === num) return false;
    }
    
    // 列チェック
    for (let i = 0; i < 9; i++) {
        if (board[i][col] === num) return false;
    }
    
    // 3x3ブロックチェック
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let i = startRow; i < startRow + 3; i++) {
        for (let j = startCol; j < startCol + 3; j++) {
            if (board[i][j] === num) return false;
        }
    }
    
    return true;
}

function isSolved() {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (currentPuzzle[i][j] === 0) return false;
            if (!isValid(currentPuzzle, i, j, currentPuzzle[i][j])) {
                // 一時的に0にして検証
                const temp = currentPuzzle[i][j];
                currentPuzzle[i][j] = 0;
                const valid = isValid(currentPuzzle, i, j, temp);
                currentPuzzle[i][j] = temp;
                if (!valid) return false;
            }
        }
    }
    return true;
}

// --- 5. GAME CONTROL ---
function newGame() {
    generatePuzzle();
    createBoard();
    startTimer();
    showMessage('新しい問題を開始しました！');
}

function resetCurrentPuzzle() {
    currentPuzzle = JSON.parse(JSON.stringify(initialPuzzle));
    selectedCell = { row: -1, col: -1 };
    updateFullBoardDisplay();
    showMessage('問題をリセットしました');
}

function showSolution() {
    currentPuzzle = JSON.parse(JSON.stringify(solution));
    updateFullBoardDisplay();
    stopTimer();
    showMessage('解答を表示しました');
}

// --- 6. HINT SYSTEM ---
function findHint() {
    // Naked Single を探す
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (currentPuzzle[row][col] === 0) {
                const possibleNumbers = getPossibleNumbers(currentPuzzle, row, col);
                if (possibleNumbers.length === 1) {
                    return {
                        type: 'naked-single',
                        row: row,
                        col: col,
                        value: possibleNumbers[0]
                    };
                }
            }
        }
    }
    
    // Hidden Single を探す
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (currentPuzzle[row][col] === 0) {
                const possibleNumbers = getPossibleNumbers(currentPuzzle, row, col);
                for (const num of possibleNumbers) {
                    // 行での Hidden Single
                    let canPlaceInRow = true;
                    for (let j = 0; j < 9; j++) {
                        if (j !== col && currentPuzzle[row][j] === 0) {
                            const otherPossible = getPossibleNumbers(currentPuzzle, row, j);
                            if (otherPossible.includes(num)) {
                                canPlaceInRow = false;
                                break;
                            }
                        }
                    }
                    if (canPlaceInRow) {
                        return {
                            type: 'hidden-single-row',
                            row: row,
                            col: col,
                            value: num
                        };
                    }
                    
                    // 列での Hidden Single
                    let canPlaceInCol = true;
                    for (let i = 0; i < 9; i++) {
                        if (i !== row && currentPuzzle[i][col] === 0) {
                            const otherPossible = getPossibleNumbers(currentPuzzle, i, col);
                            if (otherPossible.includes(num)) {
                                canPlaceInCol = false;
                                break;
                            }
                        }
                    }
                    if (canPlaceInCol) {
                        return {
                            type: 'hidden-single-col',
                            row: row,
                            col: col,
                            value: num
                        };
                    }
                    
                    // ブロックでの Hidden Single
                    const startRow = Math.floor(row / 3) * 3;
                    const startCol = Math.floor(col / 3) * 3;
                    let canPlaceInBox = true;
                    for (let i = startRow; i < startRow + 3; i++) {
                        for (let j = startCol; j < startCol + 3; j++) {
                            if ((i !== row || j !== col) && currentPuzzle[i][j] === 0) {
                                const otherPossible = getPossibleNumbers(currentPuzzle, i, j);
                                if (otherPossible.includes(num)) {
                                    canPlaceInBox = false;
                                    break;
                                }
                            }
                        }
                        if (!canPlaceInBox) break;
                    }
                    if (canPlaceInBox) {
                        return {
                            type: 'hidden-single-box',
                            row: row,
                            col: col,
                            value: num
                        };
                    }
                }
            }
        }
    }
    
    return null;
}

function getPossibleNumbers(board, row, col) {
    const possible = [];
    for (let num = 1; num <= 9; num++) {
        if (isValid(board, row, col, num)) {
            possible.push(num);
        }
    }
    return possible;
}

function applyHint() {
    const hint = findHint();
    if (!hint) {
        showMessage('これ以上のヒントはありません', 'info');
        return;
    }
    
    let message = '';
    if (hint.type === 'naked-single') {
        message = `行${hint.row + 1}、列${hint.col + 1}には${hint.value}しか入りません`;
    } else if (hint.type === 'hidden-single-row') {
        message = `行${hint.row + 1}で${hint.value}が入るのは列${hint.col + 1}だけです`;
    } else if (hint.type === 'hidden-single-col') {
        message = `列${hint.col + 1}で${hint.value}が入るのは行${hint.row + 1}だけです`;
    } else if (hint.type === 'hidden-single-box') {
        message = `このブロックで${hint.value}が入るのは行${hint.row + 1}、列${hint.col + 1}だけです`;
    }
    
    // セルをハイライト
    selectCell(hint.row, hint.col);
    
    const messageElement = document.getElementById('message');
    if (messageElement) {
        messageElement.innerHTML = message;
        messageElement.classList.add('hint-message');
        
        setTimeout(() => {
            messageElement.classList.remove('hint-message');
        }, 8000);
    }
}

// --- 7. TIMER ---
function startTimer() {
    startTime = Date.now();
    gameTimer = setInterval(updateTimer, 1000);
}

function stopTimer() {
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
}

function updateTimer() {
    if (!startTime) return;
    const elapsed = Date.now() - startTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    document.getElementById('time-display').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// --- 8. DIFFICULTY SELECTION ---
function selectDifficulty(level) {
    currentDifficulty = level;
    
    // 難易度選択パネルを非表示にする
    document.getElementById('difficulty-panel').style.display = 'none';
    
    // ゲームコンテンツを表示する（この行が抜けていました）
    document.getElementById('game-content').style.display = 'block';
    
    // プレイヤー情報を表示
    document.getElementById('player-info').style.display = 'flex';
    
    // 現在の難易度を表示（HTMLの要素IDを修正）
    document.getElementById('current-difficulty').textContent = DIFFICULTY_SETTINGS[level].name;
    
    newGame();
}

// トップ画面に戻る機能を追加
function backToMenu() {
    // ゲームを停止
    stopTimer();
    
    // ゲーム状態をリセット
    selectedCell = { row: -1, col: -1 };
    
    // メッセージをクリア
    const messageEl = document.getElementById('message');
    messageEl.textContent = '';
    messageEl.className = '';
    
    // 難易度選択画面を表示
    document.getElementById('difficulty-panel').style.display = 'block';
    document.getElementById('player-info').style.display = 'none';
    
    // ボードをクリア
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    
    showMessage('難易度を選択してください', 'info');
}

// --- 9. GAME COMPLETION ---
function handleGameComplete() {
    stopTimer();
    const elapsed = Date.now() - startTime;
    gameStats.puzzlesSolved++;
    gameStats.totalTime += elapsed;
    
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    const timeStr = `${minutes}分${seconds}秒`;
    
    showMessage(`おめでとうございます！ 完成時間: ${timeStr}`, 'success');
}

// --- 10. KEYBOARD INPUT ---
// キーボード入力の改善
document.addEventListener('keydown', (e) => {
    // セルが選択されていない場合は中央のセルを選択
    if (selectedCell.row === -1) {
        selectCell(4, 4);
        return;
    }
    
    const key = e.key;
    if (key >= '1' && key <= '9') {
        e.preventDefault();
        handleNumpadInput(parseInt(key));
    } else if (key === 'Delete' || key === 'Backspace' || key === '0') {
        e.preventDefault();
        handleNumpadInput(0);
    } else if (key === 'ArrowUp' && selectedCell.row > 0) {
        e.preventDefault();
        selectCell(selectedCell.row - 1, selectedCell.col);
    } else if (key === 'ArrowDown' && selectedCell.row < 8) {
        e.preventDefault();
        selectCell(selectedCell.row + 1, selectedCell.col);
    } else if (key === 'ArrowLeft' && selectedCell.col > 0) {
        e.preventDefault();
        selectCell(selectedCell.row, selectedCell.col - 1);
    } else if (key === 'ArrowRight' && selectedCell.col < 8) {
        e.preventDefault();
        selectCell(selectedCell.row, selectedCell.col + 1);
    } else if (key === 'h' || key === 'H') {
        e.preventDefault();
        applyHint();
    } else if (key === 'n' || key === 'N') {
        e.preventDefault();
        newGame();
    } else if (key === 'r' || key === 'R') {
        e.preventDefault();
        resetCurrentPuzzle();
    }
});

// --- 11. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Initialize with empty board first
    initialPuzzle = Array(9).fill(0).map(() => Array(9).fill(0));
    currentPuzzle = Array(9).fill(0).map(() => Array(9).fill(0));
    
    createBoard();
    createNumpad();
    // 難易度選択ボタンのイベントリスナー
    // 難易度選択ボタンのイベントリスナー
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const level = e.target.dataset.difficulty; // data-level → data-difficulty に変更
            selectDifficulty(level);
        });
    });
    
    // メニューボタンのイベントリスナー
    newGameBtn.addEventListener('click', newGame);
    resetBtn.addEventListener('click', resetCurrentPuzzle);
    solveBtn.addEventListener('click', showSolution);
    hintBtn.addEventListener('click', applyHint);
    
    // トップ画面に戻るボタンのイベントリスナーを追加
    const backToMenuBtn = document.getElementById('back-to-menu-btn');
    if (backToMenuBtn) {
        backToMenuBtn.addEventListener('click', backToMenu);
    }
});

// エラーセルを検出する関数
function findErrorCells() {
    const errorCells = [];
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            // 初期パズルの数字は変更不可なのでスキップ
            if (initialPuzzle[row][col] !== 0) continue;
            
            const num = currentPuzzle[row][col];
            if (num !== 0) {
                // 一時的に0にして検証
                currentPuzzle[row][col] = 0;
                const valid = isValid(currentPuzzle, row, col, num);
                currentPuzzle[row][col] = num;
                
                if (!valid) {
                    errorCells.push({ row, col, value: num });
                }
            }
        }
    }
    
    return errorCells;
}

// 間違いを削除する関数
function clearErrors() {
    const errorCells = findErrorCells();
    
    if (errorCells.length === 0) {
        showMessage('間違いは見つかりませんでした', 'info');
        return;
    }
    
    // エラーセルをハイライトしてから削除
    errorCells.forEach(({ row, col }) => {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cell.classList.add('error-highlight');
        
        // 0.5秒後に数字を削除
        setTimeout(() => {
            currentPuzzle[row][col] = 0;
            updateCellDisplay(row, col);
            cell.classList.remove('error-highlight');
        }, 500);
    });
    
    showMessage(`${errorCells.length}個の間違いを削除しました`, 'success');
}

// エラーセルを視覚的にハイライトする関数
function highlightErrors() {
    const errorCells = findErrorCells();
    
    // 既存のエラーハイライトをクリア
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('error-cell');
    });
    
    if (errorCells.length === 0) {
        showMessage('間違いは見つかりませんでした', 'info');
        return;
    }
    
    // エラーセルをハイライト
    errorCells.forEach(({ row, col }) => {
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cell.classList.add('error-cell');
    });
    
    showMessage(`${errorCells.length}個の間違いが見つかりました`, 'warning');
    
    // 3秒後にハイライトを削除
    setTimeout(() => {
        document.querySelectorAll('.error-cell').forEach(cell => {
            cell.classList.remove('error-cell');
        });
    }, 3000);
}

// 自動エラーチェック機能（オプション）
function autoCheckErrors() {
    const errorCells = findErrorCells();
    
    if (errorCells.length > 0) {
        // エラーがある場合は軽くハイライト
        errorCells.forEach(({ row, col }) => {
            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            cell.classList.add('subtle-error');
            
            setTimeout(() => {
                cell.classList.remove('subtle-error');
            }, 1000);
        });
    }
}

// handleNumpadInput関数を修正（自動エラーチェックを追加）
function handleNumpadInput(num) {
    if (selectedCell.row === -1) {
        showMessage('セルを選択してください', 'warning');
        gameBoard.classList.add('shake');
        setTimeout(() => gameBoard.classList.remove('shake'), 500);
        return;
    }
    
    const { row, col } = selectedCell;
    
    if (initialPuzzle[row][col] !== 0) {
        showMessage('この数字は変更できません', 'info');
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cell.classList.add('invalid-input');
        setTimeout(() => cell.classList.remove('invalid-input'), 300);
        return;
    }

    const previousValue = currentPuzzle[row][col];
    
    if (num === 0) {
        currentPuzzle[row][col] = 0;
    } else {
        currentPuzzle[row][col] = num;
        
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cell.classList.add('number-input');
        setTimeout(() => cell.classList.remove('number-input'), 300);
        
        // 競合チェックと視覚的フィードバック
        if (!isValidPlacement(row, col, num)) {
            highlightConflicts(row, col, num);
            showMessage('この数字は配置できません', 'error');
        }
    }
    
    updateCellDisplay(row, col);
    
    if (isSolved()) {
        handleGameComplete();
    }
}
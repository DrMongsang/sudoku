// DOM要素の参照は初期化時に取得するように変更
let gameBoard, numpad, message;

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

// メモモード
let isMemoMode = false;

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

            // メイン数字用の要素
            const mainNumber = document.createElement('div');
            mainNumber.classList.add('cell-main-number');
            cell.appendChild(mainNumber);

            // メモ用の要素
            const notesContainer = document.createElement('div');
            notesContainer.classList.add('cell-notes');
            for (let k = 1; k <= 9; k++) {
                const noteDiv = document.createElement('div');
                noteDiv.classList.add('note-number');
                noteDiv.dataset.note = k;
                notesContainer.appendChild(noteDiv);
            }
            cell.appendChild(notesContainer);

            if (initialPuzzle[i][j] !== 0) {
                mainNumber.textContent = initialPuzzle[i][j];
                cell.classList.add('pre-filled');
            }
            cell.addEventListener('click', () => selectCell(i, j));
            rowDiv.appendChild(cell);
        }
        gameBoard.appendChild(rowDiv);
    }
    updateFullBoardDisplay();
}

// handleNumpadInput関数を修正
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

    if (isMemoMode) {
        // メモモード
        if (num === 0) {
            // メモをすべてクリア
            notes[row][col].clear();
        } else {
            // メモの切り替え
            if (notes[row][col].has(num)) {
                notes[row][col].delete(num);
            } else {
                notes[row][col].add(num);
            }
        }
        updateCellDisplay(row, col);
    } else {
        // 通常モード
        if (num === 0) {
            currentPuzzle[row][col] = 0;
        } else {
            currentPuzzle[row][col] = num;
            // 数字を入力したらそのセルのメモをクリア
            notes[row][col].clear();
            
            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            cell.classList.add('number-input');
            setTimeout(() => cell.classList.remove('number-input'), 300);
            
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
}

// updateCellDisplay関数を修正
function updateCellDisplay(row, col) {
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    
    // セル選択状態の更新
    if (selectedCell.row === row && selectedCell.col === col) {
        cell.classList.add('selected');
    } else {
        cell.classList.remove('selected');
    }
    
    // メモ機能対応の表示更新
    const mainNumber = cell.querySelector('.cell-main-number');
    const notesContainer = cell.querySelector('.cell-notes');
    
    if (mainNumber && notesContainer) {
        // メイン数字の表示
        if (currentPuzzle[row][col] !== 0) {
            mainNumber.textContent = currentPuzzle[row][col];
            notesContainer.style.display = 'none';
            cell.classList.add('filled');
        } else {
            mainNumber.textContent = '';
            cell.classList.remove('filled');
            
            if (initialPuzzle[row][col] === 0) {
                notesContainer.style.display = 'grid';
                
                // メモの表示
                for (let i = 1; i <= 9; i++) {
                    const noteDiv = notesContainer.querySelector(`[data-note="${i}"]`);
                    if (noteDiv) {
                        if (notes[row][col] && notes[row][col].has(i)) {
                            noteDiv.textContent = i;
                        } else {
                            noteDiv.textContent = '';
                        }
                    }
                }
            }
        }
    } else {
        // 旧形式のセル（メモ機能なし）
        if (currentPuzzle[row][col] !== 0) {
            cell.textContent = currentPuzzle[row][col];
            cell.classList.add('filled');
        } else if (initialPuzzle[row][col] === 0) {
            cell.textContent = '';
            cell.classList.remove('filled');
        }
    }
}

// メモモード切り替え関数
function toggleMemoMode() {
    isMemoMode = !isMemoMode;
    const memoBtn = document.getElementById('memo-mode-btn');
    if (memoBtn) {
        if (isMemoMode) {
            memoBtn.classList.add('active');
            memoBtn.textContent = 'メモ中';
        } else {
            memoBtn.classList.remove('active');
            memoBtn.textContent = 'メモ';
        }
    }
    showMessage(isMemoMode ? 'メモモードON' : 'メモモードOFF', 'info');
}

// --- 3. CELL SELECTION & DISPLAY ---
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
    // 以前の選択をクリア
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('selected', 'highlighted');
    });
    
    selectedCell = { row, col };
    
    // 新しい選択をハイライト
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    cell.classList.add('selected');
    
    // 同じ数字をハイライト
    const currentNum = currentPuzzle[row][col];
    if (currentNum !== 0) {
        document.querySelectorAll('.cell').forEach(c => {
            const r = parseInt(c.dataset.row);
            const col = parseInt(c.dataset.col);
            if (currentPuzzle[r][col] === currentNum) {
                c.classList.add('highlighted');
            }
        });
    }
    
    updateCellDisplay(row, col);
}

function updateFullBoardDisplay() {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            updateCellDisplay(i, j);
        }
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
    selectedCell = { row: -1, col: -1 };
    startTimer();
    updateProgress();
    showMessage('新しいゲームを開始しました', 'success');
}

function resetCurrentPuzzle() {
    currentPuzzle = JSON.parse(JSON.stringify(initialPuzzle));
    notes = Array(9).fill(0).map(() => Array(9).fill(0).map(() => new Set()));
    selectedCell = { row: -1, col: -1 };
    updateFullBoardDisplay();
    startTimer();
    updateProgress();
    showMessage('パズルをリセットしました', 'info');
}

function showSolution() {
    currentPuzzle = JSON.parse(JSON.stringify(solution));
    updateFullBoardDisplay();
    stopTimer();
    showMessage('解答を表示しました', 'info');
}

// --- 6. HINT SYSTEM ---
function findHint() {
    // 空のセルを探す
    const emptyCells = [];
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (currentPuzzle[row][col] === 0) {
                emptyCells.push({ row, col });
            }
        }
    }
    
    if (emptyCells.length === 0) return null;
    
    // 最も制約の多いセル（候補数が少ないセル）を優先的に選択
    let bestCell = null;
    let minCandidates = 10;
    
    for (const cell of emptyCells) {
        const { row, col } = cell;
        const candidates = [];
        
        // そのセルに入れられる数字を調べる
        for (let num = 1; num <= 9; num++) {
            if (isValidPlacement(row, col, num)) {
                candidates.push(num);
            }
        }
        
        // 候補が1つしかない場合は即座に選択
        if (candidates.length === 1) {
            return {
                row,
                col,
                type: 'direct',
                value: candidates[0],
                message: `(${row + 1}, ${col + 1})には${candidates[0]}しか入りません`
            };
        }
        
        // 候補数が最も少ないセルを記録
        if (candidates.length > 1 && candidates.length < minCandidates) {
            minCandidates = candidates.length;
            bestCell = {
                row,
                col,
                type: 'candidates',
                candidates: candidates,
                message: `(${row + 1}, ${col + 1})の候補: ${candidates.join(', ')}`
            };
        }
    }
    
    // 直接的なヒントがない場合は候補を表示
    if (bestCell) {
        return bestCell;
    }
    
    // それでもない場合はランダムなセルの候補を表示
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const { row, col } = randomCell;
    const candidates = [];
    
    for (let num = 1; num <= 9; num++) {
        if (isValidPlacement(row, col, num)) {
            candidates.push(num);
        }
    }
    
    return {
        row,
        col,
        type: 'candidates',
        candidates: candidates,
        message: `(${row + 1}, ${col + 1})の候補: ${candidates.join(', ')}`
    };
}

function applyHint() {
    const hint = findHint();
    if (!hint) {
        showMessage('ヒントがありません', 'info');
        return;
    }
    
    const { row, col, type, message } = hint;
    
    // セルを選択してハイライト
    selectCell(row, col);
    
    if (type === 'direct') {
        // 直接的なヒント：数字を自動入力
        currentPuzzle[row][col] = hint.value;
        notes[row][col].clear();
        updateCellDisplay(row, col);
        updateProgress();
        
        // セルを一時的にハイライト
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cell.classList.add('hint-highlight');
        setTimeout(() => {
            cell.classList.remove('hint-highlight');
        }, 2000);
        
        if (isSolved()) {
            handleGameComplete();
        }
    } else {
        // 候補ヒント：メモに候補を表示
        notes[row][col].clear();
        hint.candidates.forEach(num => {
            notes[row][col].add(num);
        });
        updateCellDisplay(row, col);
        
        // セルを一時的にハイライト
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cell.classList.add('hint-highlight');
        setTimeout(() => {
            cell.classList.remove('hint-highlight');
        }, 3000);
    }
    
    showMessage(message, 'success');
}

// --- 7. TIMER & PROGRESS ---
function startTimer() {
    stopTimer();
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
    
    const timerEl = document.getElementById('timer');
    if (timerEl) {
        timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

function updateProgress() {
    let filledCells = 0;
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (currentPuzzle[i][j] !== 0) filledCells++;
        }
    }
    
    const progressText = document.getElementById('progress-text');
    const progressFill = document.getElementById('progress-fill');
    
    if (progressText) progressText.textContent = `${filledCells}/81`;
    if (progressFill) progressFill.style.width = `${(filledCells / 81) * 100}%`;
}

// --- 8. CONFLICT HIGHLIGHTING ---
function isValidPlacement(row, col, num) {
    const temp = currentPuzzle[row][col];
    currentPuzzle[row][col] = 0;
    const valid = isValid(currentPuzzle, row, col, num);
    currentPuzzle[row][col] = temp;
    return valid;
}

function highlightConflicts(row, col, num) {
    // 既存の競合ハイライトをクリア
    document.querySelectorAll('.conflict').forEach(cell => {
        cell.classList.remove('conflict');
    });
    
    // 行の競合をチェック
    for (let j = 0; j < 9; j++) {
        if (j !== col && currentPuzzle[row][j] === num) {
            const cell = document.querySelector(`[data-row="${row}"][data-col="${j}"]`);
            cell.classList.add('conflict');
        }
    }
    
    // 列の競合をチェック
    for (let i = 0; i < 9; i++) {
        if (i !== row && currentPuzzle[i][col] === num) {
            const cell = document.querySelector(`[data-row="${i}"][data-col="${col}"]`);
            cell.classList.add('conflict');
        }
    }
    
    // 3x3ブロックの競合をチェック
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let i = startRow; i < startRow + 3; i++) {
        for (let j = startCol; j < startCol + 3; j++) {
            if ((i !== row || j !== col) && currentPuzzle[i][j] === num) {
                const cell = document.querySelector(`[data-row="${i}"][data-col="${j}"]`);
                cell.classList.add('conflict');
            }
        }
    }
    
    // 3秒後に競合ハイライトを削除
    setTimeout(() => {
        document.querySelectorAll('.conflict').forEach(cell => {
            cell.classList.remove('conflict');
        });
    }, 3000);
}

function selectDifficulty(level) {
    currentDifficulty = level;
    
    // 難易度選択パネルを非表示にする
    document.getElementById('difficulty-panel').style.display = 'none';
    
    // ゲームコンテンツを表示する
    document.getElementById('game-content').style.display = 'block';
    
    // プレイヤー情報を表示
    document.getElementById('player-info').style.display = 'flex';
    
    // 現在の難易度を表示
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
    document.getElementById('game-content').style.display = 'none';
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
    } else if (key === 'm' || key === 'M') {
        e.preventDefault();
        toggleMemoMode();
    }
});

// --- 11. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // DOM要素を取得
    gameBoard = document.getElementById('game-board');
    numpad = document.getElementById('numpad');
    message = document.getElementById('message');
    
    // Initialize with empty board first
    initialPuzzle = Array(9).fill(0).map(() => Array(9).fill(0));
    currentPuzzle = Array(9).fill(0).map(() => Array(9).fill(0));
    
    // メモ配列を初期化
    notes = Array(9).fill(0).map(() => Array(9).fill(0).map(() => new Set()));
    
    createBoard();
    createNumpad();
    
    // 難易度選択ボタンのイベントリスナー
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const level = e.target.dataset.difficulty;
            selectDifficulty(level);
        });
    });
    
    // メニューボタンのイベントリスナー（要素の存在確認を追加）
    const newGameBtn = document.getElementById('new-game-btn');
    const resetBtn = document.getElementById('reset-btn');
    const solveBtn = document.getElementById('solve-btn');
    const hintBtn = document.getElementById('hint-btn');
    
    if (newGameBtn) newGameBtn.addEventListener('click', newGame);
    if (resetBtn) resetBtn.addEventListener('click', resetCurrentPuzzle);
    if (solveBtn) solveBtn.addEventListener('click', showSolution);
    if (hintBtn) hintBtn.addEventListener('click', applyHint);
    
    // トップ画面に戻るボタンのイベントリスナー
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
    
    // メモモードボタンを追加
    const memoBtn = document.createElement('button');
    memoBtn.id = 'memo-mode-btn';
    memoBtn.classList.add('memo-toggle');
    memoBtn.textContent = 'メモ';
    memoBtn.addEventListener('click', toggleMemoMode);
    numpad.appendChild(memoBtn);
}
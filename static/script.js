class MentalMathGame {
    constructor() {
        this.score = 0;
        this.streak = 0;
        this.currentAnswer = null;
        this.timerInterval = null;
        this.startTime = null;
        this.currentModeType = null;
        this.currentDimensions = null;
        this.waitingForNext = false;
        
        // DOM elements
        this.modeSelect = document.getElementById('mode');
        this.digitsContainer = document.getElementById('digits-container');
        this.digitsSelect = document.getElementById('digits');
        this.difficultyContainer = document.getElementById('difficulty-container');
        this.difficultySelect = document.getElementById('difficulty');
        this.questionContainer = document.querySelector('.question-container');
        this.questionElement = document.getElementById('question');
        this.answerInput = document.getElementById('answer');
        this.submitButton = document.getElementById('submit');
        this.nextButton = document.getElementById('next');
        this.scoreElement = document.getElementById('score');
        this.streakElement = document.getElementById('streak');
        this.timerElement = document.getElementById('timer');
        this.feedbackElement = document.getElementById('feedback');

        // Event listeners
        this.modeSelect.addEventListener('change', () => this.handleModeChange());
        this.digitsSelect.addEventListener('change', () => this.startNewQuestion());
        this.difficultySelect.addEventListener('change', () => this.startNewQuestion());
        this.submitButton.addEventListener('click', () => this.checkAnswer());
        this.nextButton.addEventListener('click', () => this.startNewQuestion());
        
        // Add keypress listeners
        document.addEventListener('keypress', (e) => {
            if (this.waitingForNext) {
                this.startNewQuestion();
            }
        });

        this.answerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                if (this.waitingForNext) {
                    this.startNewQuestion();
                } else {
                    this.checkAnswer();
                }
            }
        });

        // Initialize
        this.loadModes();
    }

    async loadModes() {
        try {
            const response = await fetch('/api/modes');
            const modes = await response.json();
            
            this.modeSelect.innerHTML = '<option value="">Select a mode</option>';
            Object.entries(modes).forEach(([id, info]) => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = info.name;
                option.dataset.hasDigits = info.has_digits;
                option.dataset.hasDifficulties = info.has_difficulties;
                this.modeSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading modes:', error);
        }
    }

    async handleModeChange() {
        const selectedOption = this.modeSelect.selectedOptions[0];
        const hasDigits = selectedOption.dataset.hasDigits === 'true';
        const hasDifficulties = selectedOption.dataset.hasDifficulties === 'true';
        
        this.digitsContainer.style.display = 'none';
        this.difficultyContainer.style.display = 'none';
        this.questionContainer.style.display = 'none';
        this.nextButton.style.display = 'none';
        this.submitButton.style.display = 'block';
        
        if (hasDigits) {
            try {
                const response = await fetch(`/api/mode/${this.modeSelect.value}/digits`);
                const digits = await response.json();
                
                this.digitsSelect.innerHTML = '<option value="">Select digits</option>';
                Object.entries(digits).forEach(([digit, name]) => {
                    const option = document.createElement('option');
                    option.value = digit;
                    option.textContent = name;
                    this.digitsSelect.appendChild(option);
                });
                
                this.digitsContainer.style.display = 'block';
            } catch (error) {
                console.error('Error loading digits:', error);
            }
        } else if (hasDifficulties) {
            try {
                const response = await fetch(`/api/mode/${this.modeSelect.value}/difficulties`);
                const difficulties = await response.json();
                
                this.difficultySelect.innerHTML = '<option value="">Select difficulty</option>';
                
                // Define the order of difficulties
                const difficultyOrder = ['easy', 'medium', 'hard'];
                
                // Add options in the specified order
                difficultyOrder.forEach(diff => {
                    if (difficulties[diff]) {
                        const option = document.createElement('option');
                        option.value = diff;
                        option.textContent = difficulties[diff];
                        this.difficultySelect.appendChild(option);
                    }
                });
                
                this.difficultyContainer.style.display = 'block';
            } catch (error) {
                console.error('Error loading difficulties:', error);
            }
        } else {
            this.startNewQuestion();
        }
    }

    async startNewQuestion() {
        if (this.waitingForNext) {
            this.waitingForNext = false;
        }
        
        const selectedOption = this.modeSelect.selectedOptions[0];
        const hasDigits = selectedOption.dataset.hasDigits === 'true';
        const hasDifficulties = selectedOption.dataset.hasDifficulties === 'true';
        
        if (!this.modeSelect.value || 
            (hasDigits && !this.digitsSelect.value) || 
            (hasDifficulties && !this.difficultySelect.value)) {
            return;
        }

        // Store current scroll position
        const scrollPosition = window.scrollY;

        // Show question container when starting a new question
        this.questionContainer.style.display = 'block';

        // Reset UI state
        this.nextButton.style.display = 'none';
        this.submitButton.style.display = 'block';
        this.submitButton.disabled = false;
        this.answerInput.disabled = false;
        this.feedbackElement.textContent = '';
        this.feedbackElement.className = 'feedback';

        // Remove any existing matrix inputs
        const existingMatrixInputs = document.querySelectorAll('.matrix-input');
        existingMatrixInputs.forEach(input => input.remove());

        try {
            const setting = hasDigits ? this.digitsSelect.value : 
                          hasDifficulties ? this.difficultySelect.value : '0';
            const response = await fetch(`/api/question/${this.modeSelect.value}/${setting}`);
            const data = await response.json();
            
            this.currentAnswer = data.answer;
            this.currentModeType = data.mode_type;
            this.currentDimensions = data.dimensions;
            
            // Update question text without scrolling
            const prevHeight = this.questionElement.offsetHeight;
            this.questionElement.textContent = data.question;
            const heightDiff = this.questionElement.offsetHeight - prevHeight;
            
            this.answerInput.value = '';
            
            if (this.currentModeType === 'matrix') {
                this.answerInput.style.display = 'none';
                this.createMatrixInput();
                // Focus first matrix input
                const firstMatrixInput = document.querySelector('.matrix-input input');
                if (firstMatrixInput) {
                    firstMatrixInput.focus();
                }
            } else {
                this.answerInput.style.display = 'block';
                this.answerInput.disabled = false;
                // Focus the answer input
                this.answerInput.focus();
            }
            
            // Reset timer
            if (this.timerInterval) clearInterval(this.timerInterval);
            this.startTime = Date.now();
            this.updateTimer();
            this.timerInterval = setInterval(() => this.updateTimer(), 1000);

            // Restore scroll position
            window.scrollTo(0, scrollPosition);
        } catch (error) {
            console.error('Error getting question:', error);
        }
    }

    createMatrixInput() {
        const matrixInput = document.createElement('div');
        matrixInput.className = 'matrix-input';
        
        const totalInputs = this.currentDimensions.rows * this.currentDimensions.cols;
        
        for (let i = 0; i < totalInputs; i++) {
            const input = document.createElement('input');
            input.type = 'number';
            input.placeholder = `[${Math.floor(i/this.currentDimensions.cols)},${i%this.currentDimensions.cols}]`;
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const nextInput = matrixInput.querySelector(`input:nth-child(${i + 2})`);
                    if (nextInput) {
                        e.preventDefault(); // Prevent form submission
                        nextInput.focus();
                    } else {
                        if (this.nextButton.style.display === 'block') {
                            this.startNewQuestion();
                        } else {
                            this.checkAnswer();
                        }
                    }
                }
            });
            matrixInput.appendChild(input);
        }
        
        matrixInput.style.gridTemplateColumns = `repeat(${this.currentDimensions.cols}, 1fr)`;
        this.answerInput.parentNode.insertBefore(matrixInput, this.submitButton.parentNode);
    }

    updateTimer() {
        const seconds = Math.floor((Date.now() - this.startTime) / 1000);
        this.timerElement.textContent = `${seconds}s`;
    }

    checkAnswer() {
        let userAnswer;
        let correct = false;
        
        if (this.currentModeType === 'matrix') {
            const inputs = document.querySelectorAll('.matrix-input input');
            const rows = this.currentDimensions.rows;
            const cols = this.currentDimensions.cols;
            
            // Check if all inputs are filled
            const allFilled = Array.from(inputs).every(input => input.value !== '');
            if (!allFilled) {
                this.feedbackElement.textContent = 'Please fill in all matrix elements';
                this.feedbackElement.className = 'feedback incorrect';
                return;
            }

            // Convert inputs to 2D array
            userAnswer = Array(rows).fill().map(() => Array(cols).fill(0));
            inputs.forEach((input, index) => {
                const i = Math.floor(index / cols);
                const j = index % cols;
                userAnswer[i][j] = parseInt(input.value);
            });

            // Check if all values are valid numbers
            const allValid = userAnswer.every(row => row.every(val => !isNaN(val)));
            if (!allValid) {
                this.feedbackElement.textContent = 'Please enter valid numbers';
                this.feedbackElement.className = 'feedback incorrect';
                return;
            }

            correct = userAnswer.every((row, i) => 
                row.every((val, j) => val === this.currentAnswer[i][j])
            );
        } else {
            userAnswer = parseInt(this.answerInput.value);
            if (isNaN(userAnswer)) {
                this.feedbackElement.textContent = 'Please enter a valid number';
                this.feedbackElement.className = 'feedback incorrect';
                return;
            }
            correct = userAnswer === this.currentAnswer;
        }

        // Disable submit button and show next button
        this.submitButton.style.display = 'none';
        this.nextButton.style.display = 'block';
        this.waitingForNext = true;

        if (correct) {
            this.score += 1;
            this.streak += 1;
            this.feedbackElement.textContent = 'Correct!';
            this.feedbackElement.className = 'feedback correct';
        } else {
            this.streak = 0;
            this.feedbackElement.textContent = `Incorrect. The answer was ${JSON.stringify(this.currentAnswer)}`;
            this.feedbackElement.className = 'feedback incorrect';
        }

        this.scoreElement.textContent = this.score;
        this.streakElement.textContent = this.streak;

        // Disable all inputs
        if (this.currentModeType === 'matrix') {
            const inputs = document.querySelectorAll('.matrix-input input');
            inputs.forEach(input => input.disabled = true);
        } else {
            this.answerInput.disabled = true;
        }
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MentalMathGame();
});

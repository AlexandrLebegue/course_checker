// Quiz Generator Script
let currentCourse = null;
let currentQuiz = null;
let currentQuestionIndex = 0;
let userAnswers = {};
let uploadedFile = null;

// DOM Elements
const courseFileInput = document.getElementById('courseFileInput');
const courseUploadArea = document.getElementById('courseUploadArea');
const generateQuizBtn = document.getElementById('generateQuizBtn');
const progressSection = document.getElementById('progressSection');
const progressTitle = document.getElementById('progressTitle');
const progressText = document.getElementById('progressText');
const progressFill = document.getElementById('progressFill');
const quizSection = document.getElementById('quizSection');
const quizContainer = document.getElementById('quizContainer');
const quizProgress = document.getElementById('quizProgress');
const prevQuestionBtn = document.getElementById('prevQuestionBtn');
const nextQuestionBtn = document.getElementById('nextQuestionBtn');
const submitQuizBtn = document.getElementById('submitQuizBtn');
const resultsSection = document.getElementById('resultsSection');
const scoreValue = document.getElementById('scoreValue');
const correctCount = document.getElementById('correctCount');
const incorrectCount = document.getElementById('incorrectCount');
const totalCount = document.getElementById('totalCount');
const detailedResults = document.getElementById('detailedResults');
const regenerateQuizBtn = document.getElementById('regenerateQuizBtn');
const newQuizBtn = document.getElementById('newQuizBtn');
const aiThinkingContainer = document.getElementById('aiThinkingContainer');
const aiStatusText = document.getElementById('aiStatusText');
const aiProgressFill = document.getElementById('aiProgressFill');
const uploadSection = document.getElementById('uploadSection');
const historySection = document.getElementById('historySection');
const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
const historyContainer = document.getElementById('historyContainer');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadQuizHistory();
});

function setupEventListeners() {
    // File upload
    courseUploadArea.addEventListener('click', () => courseFileInput.click());
    courseUploadArea.addEventListener('dragover', handleDragOver);
    courseUploadArea.addEventListener('drop', handleDrop);
    courseFileInput.addEventListener('change', handleFileSelect);
    
    // Quiz controls
    generateQuizBtn.addEventListener('click', handleGenerateQuiz);
    prevQuestionBtn.addEventListener('click', () => navigateQuestion(-1));
    nextQuestionBtn.addEventListener('click', () => navigateQuestion(1));
    submitQuizBtn.addEventListener('click', handleSubmitQuiz);
    
    // Action buttons
    regenerateQuizBtn.addEventListener('click', handleRegenerateQuiz);
    newQuizBtn.addEventListener('click', handleNewQuiz);
    toggleHistoryBtn.addEventListener('click', toggleHistory);
}

// File Upload Handlers
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    courseUploadArea.classList.add('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    courseUploadArea.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

function handleFile(file) {
    // Validate file
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
        showError('Please upload a PDF or image file');
        return;
    }
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        showError('File size must be less than 10MB');
        return;
    }
    
    uploadedFile = file;
    updateUploadUI(file.name);
    generateQuizBtn.disabled = false;
}

function updateUploadUI(filename) {
    const uploadContent = courseUploadArea.querySelector('.upload-content');
    uploadContent.innerHTML = `
        <i class="fas fa-file-check upload-icon" style="color: #10b981;"></i>
        <h3>File Ready</h3>
        <p>${filename}</p>
        <small>Click "Generate Quiz" to continue</small>
    `;
}

// Quiz Generation
async function handleGenerateQuiz() {
    if (!uploadedFile) {
        showError('Please upload a course material first');
        return;
    }
    
    try {
        // Show progress
        showProgress('Uploading Course Material', 'Reading your course content...');
        
        // Upload course material
        const formData = new FormData();
        formData.append('files', uploadedFile);
        
        const uploadResponse = await fetch('/api/quiz/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!uploadResponse.ok) {
            throw new Error('Failed to upload course material');
        }
        
        const uploadData = await uploadResponse.json();
        currentCourse = uploadData.course;
        
        // Generate quiz
        updateProgress(50, 'Generating Quiz Questions', 'AI is creating personalized questions...');
        
        const quizResponse = await fetch('/api/quiz/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                courseId: currentCourse.id
            })
        });
        
        if (!quizResponse.ok) {
            throw new Error('Failed to generate quiz');
        }
        
        const quizData = await quizResponse.json();
        currentQuiz = quizData.quiz;
        
        updateProgress(100, 'Quiz Ready!', 'Your personalized quiz has been generated');
        
        setTimeout(() => {
            hideProgress();
            displayQuiz();
        }, 1000);
        
    } catch (error) {
        console.error('Error generating quiz:', error);
        hideProgress();
        showError('Failed to generate quiz: ' + error.message);
    }
}

async function handleRegenerateQuiz() {
    if (!currentCourse) {
        showError('No course data available');
        return;
    }
    
    // Reset quiz state
    currentQuestionIndex = 0;
    userAnswers = {};
    
    // Hide results and show progress
    resultsSection.style.display = 'none';
    showProgress('Regenerating Quiz', 'Creating new questions from your course material...');
    
    try {
        const quizResponse = await fetch('/api/quiz/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                courseId: currentCourse.id
            })
        });
        
        if (!quizResponse.ok) {
            throw new Error('Failed to regenerate quiz');
        }
        
        const quizData = await quizResponse.json();
        currentQuiz = quizData.quiz;
        
        updateProgress(100, 'New Quiz Ready!', 'Your new quiz has been generated');
        
        setTimeout(() => {
            hideProgress();
            displayQuiz();
        }, 1000);
        
    } catch (error) {
        console.error('Error regenerating quiz:', error);
        hideProgress();
        showError('Failed to regenerate quiz: ' + error.message);
    }
}

// Quiz Display
function displayQuiz() {
    uploadSection.style.display = 'none';
    quizSection.style.display = 'block';
    resultsSection.style.display = 'none';
    
    currentQuestionIndex = 0;
    userAnswers = {};
    
    renderQuestion();
}

function renderQuestion() {
    const question = currentQuiz.questions[currentQuestionIndex];
    
    quizProgress.textContent = `Question ${currentQuestionIndex + 1} of ${currentQuiz.questions.length}`;
    
    let optionsHTML = '';
    
    if (question.type === 'multiple_choice') {
        optionsHTML = question.options.map((option, index) => `
            <div class="quiz-option" data-value="${option}">
                <input type="radio" name="question_${question.id}" id="option_${index}" value="${option}">
                <label for="option_${index}">${option}</label>
            </div>
        `).join('');
    } else if (question.type === 'true_false') {
        optionsHTML = `
            <div class="quiz-option" data-value="true">
                <input type="radio" name="question_${question.id}" id="option_true" value="true">
                <label for="option_true">True</label>
            </div>
            <div class="quiz-option" data-value="false">
                <input type="radio" name="question_${question.id}" id="option_false" value="false">
                <label for="option_false">False</label>
            </div>
        `;
    }
    
    quizContainer.innerHTML = `
        <div class="question-card">
            <div class="question-header">
                <span class="question-type">${question.type === 'multiple_choice' ? 'Multiple Choice' : 'True/False'}</span>
                <span class="question-number">Question ${currentQuestionIndex + 1}</span>
            </div>
            <h3 class="question-text">${question.question}</h3>
            <div class="quiz-options">
                ${optionsHTML}
            </div>
        </div>
    `;
    
    // Restore previous answer if exists
    if (userAnswers[question.id]) {
        const input = quizContainer.querySelector(`input[value="${userAnswers[question.id]}"]`);
        if (input) {
            input.checked = true;
        }
    }
    
    // Add event listeners to options
    quizContainer.querySelectorAll('.quiz-option').forEach(option => {
        option.addEventListener('click', function() {
            const input = this.querySelector('input');
            input.checked = true;
            saveAnswer(question.id, input.value);
        });
    });
    
    quizContainer.querySelectorAll('input[type="radio"]').forEach(input => {
        input.addEventListener('change', function() {
            saveAnswer(question.id, this.value);
        });
    });
    
    updateNavigationButtons();
}

function saveAnswer(questionId, answer) {
    userAnswers[questionId] = answer;
}

function navigateQuestion(direction) {
    currentQuestionIndex += direction;
    renderQuestion();
}

function updateNavigationButtons() {
    prevQuestionBtn.disabled = currentQuestionIndex === 0;
    
    const isLastQuestion = currentQuestionIndex === currentQuiz.questions.length - 1;
    nextQuestionBtn.style.display = isLastQuestion ? 'none' : 'inline-flex';
    submitQuizBtn.style.display = isLastQuestion ? 'inline-flex' : 'none';
}

// Quiz Submission
async function handleSubmitQuiz() {
    // Check if all questions are answered
    const unanswered = currentQuiz.questions.filter(q => !userAnswers[q.id]);
    
    if (unanswered.length > 0) {
        const confirm = window.confirm(`You have ${unanswered.length} unanswered question(s). Submit anyway?`);
        if (!confirm) return;
    }
    
    try {
        showAIThinking('Grading Quiz', 'Evaluating your answers...');
        
        const response = await fetch('/api/quiz/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quizId: currentQuiz.id,
                answers: userAnswers
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit quiz');
        }
        
        const data = await response.json();
        
        hideAIThinking();
        displayResults(data.result);
        loadQuizHistory();
        
    } catch (error) {
        console.error('Error submitting quiz:', error);
        hideAIThinking();
        showError('Failed to submit quiz: ' + error.message);
    }
}

// Results Display
function displayResults(result) {
    quizSection.style.display = 'none';
    resultsSection.style.display = 'block';
    
    // Update score card
    scoreValue.textContent = `${result.percentage}%`;
    correctCount.textContent = result.correctCount;
    incorrectCount.textContent = result.incorrectCount;
    totalCount.textContent = result.totalQuestions;
    
    // Set score color
    const scoreCircle = document.querySelector('.score-circle');
    if (result.percentage >= 80) {
        scoreCircle.style.borderColor = '#10b981';
    } else if (result.percentage >= 60) {
        scoreCircle.style.borderColor = '#f59e0b';
    } else {
        scoreCircle.style.borderColor = '#ef4444';
    }
    
    // Display detailed results
    let detailedHTML = '<h3><i class="fas fa-list-check"></i> Detailed Results</h3>';
    
    result.detailedResults.forEach((item, index) => {
        const isCorrect = item.isCorrect;
        const icon = isCorrect ? 
            '<i class="fas fa-check-circle" style="color: #10b981;"></i>' : 
            '<i class="fas fa-times-circle" style="color: #ef4444;"></i>';
        
        let answerDisplay = '';
        if (item.type === 'multiple_choice') {
            answerDisplay = `
                <div class="answer-details">
                    <div><strong>Your answer:</strong> ${item.userAnswer || 'Not answered'}</div>
                    ${!isCorrect ? `<div><strong>Correct answer:</strong> ${item.correctAnswer}</div>` : ''}
                </div>
            `;
        } else {
            answerDisplay = `
                <div class="answer-details">
                    <div><strong>Your answer:</strong> ${item.userAnswer || 'Not answered'}</div>
                    ${!isCorrect ? `<div><strong>Correct answer:</strong> ${item.correctAnswer}</div>` : ''}
                </div>
            `;
        }
        
        detailedHTML += `
            <div class="result-item ${isCorrect ? 'correct' : 'incorrect'}">
                <div class="result-header">
                    ${icon}
                    <span class="result-number">Question ${index + 1}</span>
                </div>
                <div class="result-question">${item.question}</div>
                ${answerDisplay}
            </div>
        `;
    });
    
    detailedResults.innerHTML = detailedHTML;
    
    // Show history section
    historySection.style.display = 'block';
}

function handleNewQuiz() {
    // Reset everything
    currentCourse = null;
    currentQuiz = null;
    currentQuestionIndex = 0;
    userAnswers = {};
    uploadedFile = null;
    
    // Reset UI
    courseFileInput.value = '';
    courseUploadArea.querySelector('.upload-content').innerHTML = `
        <i class="fas fa-file-upload upload-icon"></i>
        <h3>Drag & Drop Course Material Here</h3>
        <p>or <span class="browse-link">browse files</span></p>
        <small>Supports PDF, JPG, PNG (max 10MB)</small>
    `;
    generateQuizBtn.disabled = true;
    
    // Show upload section
    uploadSection.style.display = 'block';
    quizSection.style.display = 'none';
    resultsSection.style.display = 'none';
}

// Quiz History
async function loadQuizHistory() {
    try {
        const response = await fetch('/api/quiz/history');
        if (!response.ok) return;
        
        const data = await response.json();
        
        if (data.history && data.history.length > 0) {
            displayHistory(data.history);
        }
    } catch (error) {
        console.error('Error loading quiz history:', error);
    }
}

function displayHistory(history) {
    if (history.length === 0) {
        historyContainer.innerHTML = '<p class="no-history">No quiz history yet</p>';
        return;
    }
    
    let historyHTML = '<div class="history-list">';
    
    history.slice(0, 10).forEach(item => {
        const date = new Date(item.timestamp).toLocaleDateString();
        const time = new Date(item.timestamp).toLocaleTimeString();
        
        historyHTML += `
            <div class="history-item">
                <div class="history-info">
                    <i class="fas fa-file-alt"></i>
                    <div>
                        <div class="history-course">${item.courseName}</div>
                        <div class="history-date">${date} at ${time}</div>
                    </div>
                </div>
                <div class="history-score ${item.percentage >= 80 ? 'good' : item.percentage >= 60 ? 'medium' : 'poor'}">
                    <strong>${item.percentage}%</strong>
                    <span>${item.score}/${item.totalQuestions}</span>
                </div>
            </div>
        `;
    });
    
    historyHTML += '</div>';
    historyContainer.innerHTML = historyHTML;
}

function toggleHistory() {
    const isVisible = historyContainer.style.display !== 'none';
    historyContainer.style.display = isVisible ? 'none' : 'block';
    toggleHistoryBtn.querySelector('i').className = isVisible ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
}

// UI Helper Functions
function showProgress(title, message) {
    uploadSection.style.display = 'none';
    progressSection.style.display = 'block';
    progressTitle.textContent = title;
    progressText.textContent = message;
    updateProgress(10, title, message);
}

function updateProgress(percent, title, message) {
    progressFill.style.width = `${percent}%`;
    if (title) progressTitle.textContent = title;
    if (message) progressText.textContent = message;
}

function hideProgress() {
    progressSection.style.display = 'none';
}

function showAIThinking(title, message) {
    aiThinkingContainer.style.display = 'flex';
    aiStatusText.textContent = message;
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        aiProgressFill.style.width = `${Math.min(progress, 90)}%`;
    }, 200);
    aiThinkingContainer.dataset.interval = interval;
}

function hideAIThinking() {
    const interval = aiThinkingContainer.dataset.interval;
    if (interval) clearInterval(interval);
    aiProgressFill.style.width = '100%';
    setTimeout(() => {
        aiThinkingContainer.style.display = 'none';
        aiProgressFill.style.width = '0%';
    }, 500);
}

function showError(message) {
    alert(message);
}
class QuizService {
    constructor() {
        // Store quizzes and results in memory
        this.quizzes = new Map(); // quizId -> quiz data
        this.results = new Map(); // quizId -> array of results
        this.courseContents = new Map(); // courseId -> extracted content
    }

    /**
     * Store course content for quiz generation
     * @param {string} courseId - Unique identifier for the course
     * @param {string} content - Extracted course content
     * @param {string} filename - Original filename
     * @returns {Object} Course data
     */
    storeCourseContent(courseId, content, filename) {
        const courseData = {
            id: courseId,
            content: content,
            filename: filename,
            timestamp: new Date().toISOString()
        };
        
        this.courseContents.set(courseId, courseData);
        console.log(`Stored course content: ${courseId} (${filename})`);
        
        return courseData;
    }

    /**
     * Get course content by ID
     * @param {string} courseId - Course identifier
     * @returns {Object|null} Course data or null if not found
     */
    getCourseContent(courseId) {
        return this.courseContents.get(courseId) || null;
    }

    /**
     * Store a generated quiz
     * @param {string} quizId - Unique quiz identifier
     * @param {string} courseId - Associated course ID
     * @param {Array} questions - Quiz questions with answers
     * @returns {Object} Quiz data
     */
    storeQuiz(quizId, courseId, questions) {
        const quizData = {
            id: quizId,
            courseId: courseId,
            questions: questions,
            timestamp: new Date().toISOString()
        };
        
        this.quizzes.set(quizId, quizData);
        console.log(`Stored quiz: ${quizId} with ${questions.length} questions`);
        
        return quizData;
    }

    /**
     * Get quiz by ID
     * @param {string} quizId - Quiz identifier
     * @returns {Object|null} Quiz data or null if not found
     */
    getQuiz(quizId) {
        return this.quizzes.get(quizId) || null;
    }

    /**
     * Store quiz result
     * @param {string} quizId - Quiz identifier
     * @param {Object} answers - User's answers
     * @returns {Object} Result data with score
     */
    storeResult(quizId, answers) {
        const quiz = this.getQuiz(quizId);
        if (!quiz) {
            throw new Error('Quiz not found');
        }

        // Calculate score
        let correctCount = 0;
        const detailedResults = [];

        quiz.questions.forEach((question, index) => {
            const userAnswer = answers[question.id];
            const isCorrect = this.checkAnswer(question, userAnswer);
            
            if (isCorrect) {
                correctCount++;
            }

            detailedResults.push({
                questionId: question.id,
                question: question.question,
                type: question.type,
                userAnswer: userAnswer,
                correctAnswer: question.correctAnswer,
                isCorrect: isCorrect,
                options: question.options || null
            });
        });

        const result = {
            quizId: quizId,
            score: correctCount,
            totalQuestions: quiz.questions.length,
            percentage: Math.round((correctCount / quiz.questions.length) * 100),
            answers: answers,
            detailedResults: detailedResults,
            correctCount: correctCount,
            incorrectCount: quiz.questions.length - correctCount,
            timestamp: new Date().toISOString()
        };

        // Store result
        if (!this.results.has(quizId)) {
            this.results.set(quizId, []);
        }
        this.results.get(quizId).push(result);

        console.log(`Quiz ${quizId} completed: ${correctCount}/${quiz.questions.length} correct`);

        return result;
    }

    /**
     * Check if an answer is correct
     * @param {Object} question - Question object
     * @param {string} userAnswer - User's answer
     * @returns {boolean} True if correct
     */
    checkAnswer(question, userAnswer) {
        if (!userAnswer) return false;

        // Normalize answers for comparison
        const normalizedUserAnswer = String(userAnswer).toLowerCase().trim();
        const normalizedCorrectAnswer = String(question.correctAnswer).toLowerCase().trim();

        return normalizedUserAnswer === normalizedCorrectAnswer;
    }

    /**
     * Get all results for a quiz
     * @param {string} quizId - Quiz identifier
     * @returns {Array} Array of results
     */
    getQuizResults(quizId) {
        return this.results.get(quizId) || [];
    }

    /**
     * Get all quiz history
     * @returns {Array} Array of all results
     */
    getAllHistory() {
        const history = [];
        
        this.results.forEach((results, quizId) => {
            const quiz = this.getQuiz(quizId);
            const courseContent = quiz ? this.getCourseContent(quiz.courseId) : null;
            
            results.forEach(result => {
                history.push({
                    ...result,
                    courseName: courseContent ? courseContent.filename : 'Unknown',
                    quizTimestamp: quiz ? quiz.timestamp : null
                });
            });
        });

        // Sort by timestamp, newest first
        history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return history;
    }

    /**
     * Generate a unique ID
     * @param {string} prefix - Prefix for the ID
     * @returns {string} Unique identifier
     */
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get statistics
     * @returns {Object} Service statistics
     */
    getStats() {
        return {
            totalCourses: this.courseContents.size,
            totalQuizzes: this.quizzes.size,
            totalResults: Array.from(this.results.values()).reduce((sum, arr) => sum + arr.length, 0)
        };
    }

    /**
     * Clear all data (for testing)
     */
    clearAll() {
        this.quizzes.clear();
        this.results.clear();
        this.courseContents.clear();
        console.log('All quiz data cleared');
    }
}

module.exports = new QuizService();
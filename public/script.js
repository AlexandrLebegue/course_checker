class CourseChecker {
    constructor() {
        this.selectedFiles = [];
        this.activeStatements = [];
        this.selectedStatementId = null;
        this.currentResults = null;
        this.initializeEventListeners();
        this.loadActiveStatements();
    }

    initializeEventListeners() {
        // File input elements
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const analyzeBtn = document.getElementById('analyzeBtn');
        const newAnalysisBtn = document.getElementById('newAnalysisBtn');
        const exportPdfBtn = document.getElementById('exportPdfBtn');

        // Statement elements
        const statementUploadArea = document.getElementById('statementUploadArea');
        const statementFileInput = document.getElementById('statementFileInput');
        const statementBrowseLink = document.getElementById('statementBrowseLink');
        const statementSelect = document.getElementById('statementSelect');

        // Upload area click
        uploadArea.addEventListener('click', () => fileInput.click());

        // File input change
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        uploadArea.addEventListener('drop', (e) => this.handleDrop(e));

        // Analyze button
        analyzeBtn.addEventListener('click', () => this.analyzeFiles());

        // New analysis button
        newAnalysisBtn.addEventListener('click', () => this.resetInterface());

        // Export PDF button
        exportPdfBtn.addEventListener('click', () => this.exportToPDF());

        // Statement upload area click
        statementUploadArea.addEventListener('click', () => statementFileInput.click());
        statementBrowseLink.addEventListener('click', (e) => {
            e.stopPropagation();
            statementFileInput.click();
        });

        // Statement file input change
        statementFileInput.addEventListener('change', (e) => this.handleStatementFileSelect(e.target.files));

        // Statement drag and drop
        statementUploadArea.addEventListener('dragover', (e) => this.handleStatementDragOver(e));
        statementUploadArea.addEventListener('dragleave', (e) => this.handleStatementDragLeave(e));
        statementUploadArea.addEventListener('drop', (e) => this.handleStatementDrop(e));

        // Statement selection change
        statementSelect.addEventListener('change', (e) => this.handleStatementSelection(e.target.value));
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('uploadArea').classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('uploadArea').classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('uploadArea').classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files);
        this.handleFileSelect(files);
    }

    handleFileSelect(files) {
        const validFiles = Array.from(files).filter(file => this.validateFile(file));
        
        if (validFiles.length === 0) {
            this.showNotification('Please select valid PDF, JPG, or PNG files.', 'error');
            return;
        }

        // Add new files to selection
        validFiles.forEach(file => {
            if (!this.selectedFiles.find(f => f.name === file.name && f.size === file.size)) {
                this.selectedFiles.push(file);
            }
        });

        this.updateFileList();
        this.updateAnalyzeButton();
    }

    validateFile(file) {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!allowedTypes.includes(file.type)) {
            this.showNotification(`File type not supported: ${file.name}`, 'error');
            return false;
        }

        if (file.size > maxSize) {
            this.showNotification(`File too large: ${file.name} (max 10MB)`, 'error');
            return false;
        }

        return true;
    }

    updateFileList() {
        const fileList = document.getElementById('fileList');
        
        if (this.selectedFiles.length === 0) {
            fileList.innerHTML = '';
            return;
        }

        fileList.innerHTML = this.selectedFiles.map((file, index) => `
            <div class="file-item">
                <div class="file-info">
                    <i class="fas ${this.getFileIcon(file.type)} file-icon"></i>
                    <div>
                        <div class="file-name">${file.name}</div>
                        <div class="file-size">${this.formatFileSize(file.size)}</div>
                    </div>
                </div>
                <button class="remove-file" onclick="courseChecker.removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    getFileIcon(fileType) {
        if (fileType === 'application/pdf') return 'fa-file-pdf';
        if (fileType.startsWith('image/')) return 'fa-file-image';
        return 'fa-file';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.updateFileList();
        this.updateAnalyzeButton();
    }

    updateAnalyzeButton() {
        const analyzeBtn = document.getElementById('analyzeBtn');
        analyzeBtn.disabled = this.selectedFiles.length === 0;
    }

    async analyzeFiles() {
        if (this.selectedFiles.length === 0) return;

        this.showProgressSection();
        this.showAIThinking();

        try {
            const formData = new FormData();
            this.selectedFiles.forEach(file => {
                formData.append('files', file);
            });

            // Add statement ID if one is selected
            if (this.selectedStatementId) {
                formData.append('statement_id', this.selectedStatementId);
            }

            this.updateProgress(20, 'Uploading files...');
            this.updateAIStatus('Uploading files to server...');

            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData
            });

            this.updateProgress(40, 'Files uploaded successfully');
            this.updateAIStatus('AI is reading and understanding the content...');

            await this.simulateThinkingDelay(1000);

            this.updateProgress(60, 'Processing with AI...');
            this.updateAIStatus('Analyzing answers and comparing with expected results...');

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Analysis failed');
            }

            const results = await response.json();
            
            this.updateProgress(90, 'Finalizing analysis...');
            this.updateAIStatus('Preparing detailed feedback and scores...');

            await this.simulateThinkingDelay(800);
            
            this.updateProgress(100, 'Analysis complete!');
            this.updateAIStatus('Analysis completed successfully!');
            
            setTimeout(() => {
                this.hideAIThinking();
                this.hideProgressSection();
                this.displayResults(results);
            }, 1200);

        } catch (error) {
            console.error('Analysis error:', error);
            this.hideAIThinking();
            this.hideProgressSection();
            this.showNotification(`Analysis failed: ${error.message}`, 'error');
        }
    }

    showProgressSection() {
        document.getElementById('progressSection').style.display = 'block';
        this.updateProgress(0, 'Preparing analysis...');
    }

    hideProgressSection() {
        document.getElementById('progressSection').style.display = 'none';
    }

    updateProgress(percentage, text) {
        document.getElementById('progressFill').style.width = `${percentage}%`;
        document.getElementById('progressText').textContent = text;
        this.updateAIProgress(percentage);
    }

    showAIThinking() {
        document.getElementById('aiThinkingContainer').style.display = 'block';
        this.updateAIProgress(0);
    }

    hideAIThinking() {
        document.getElementById('aiThinkingContainer').style.display = 'none';
    }

    updateAIStatus(text) {
        document.getElementById('aiStatusText').textContent = text;
    }

    updateAIProgress(percentage) {
        document.getElementById('aiProgressFill').style.width = `${percentage}%`;
    }

    async simulateThinkingDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    displayResults(results) {
        const resultsSection = document.getElementById('resultsSection');
        const resultsContainer = document.getElementById('resultsContainer');

        if (!results.success || !results.results || results.results.length === 0) {
            this.showNotification('No results to display', 'error');
            return;
        }

        // Store current results for PDF export
        this.currentResults = results;

        resultsContainer.innerHTML = results.results.map(result =>
            this.createResultCard(result)
        ).join('');

        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    createResultCard(result) {
        // Handle nested analysis structure
        let analysis = result.analysis;
        if (analysis.analysis) {
            analysis = analysis.analysis;
        }
        
        const scoreClass = this.getScoreClass(analysis.overall_score || analysis.score || 0);
        const isEnhancedAnalysis = analysis.statement_used || analysis.question_analysis;
        
        return `
            <div class="result-card fade-in">
                <div class="result-header">
                    <h3 class="result-title">
                        <i class="fas fa-file-alt"></i> ${result.filename}
                    </h3>
                    <div class="score-badge ${scoreClass}">
                        ${analysis.overall_score || analysis.score || 0}%
                    </div>
                </div>
                
                ${isEnhancedAnalysis ? `
                    <div class="statement-used-indicator">
                        <i class="fas fa-check-circle"></i>
                        Enhanced analysis with statement document
                    </div>
                ` : ''}
                
                <div class="result-content">
                    ${isEnhancedAnalysis && analysis.question_analysis ?
                        this.renderQuestionAnalysis(analysis.question_analysis) :
                        this.renderBasicAnalysis(analysis)
                    }
                    
                    <div class="summary-section">
                        <h4 class="section-title">
                            <i class="fas fa-clipboard-list"></i>
                            Summary
                        </h4>
                        ${this.renderSummary(analysis)}
                    </div>
                </div>
            </div>
        `;
    }

    renderQuestionAnalysis(questionAnalysis) {
        if (!questionAnalysis || questionAnalysis.length === 0) {
            return '<p>No question analysis available.</p>';
        }

        return `
            <div class="question-analysis">
                <h4><i class="fas fa-list-ol"></i> Question-by-Question Analysis</h4>
                ${questionAnalysis.map(question => `
                    <div class="question-item ${question.is_correct ? 'correct' : 'incorrect'}">
                        <div class="question-header">
                            <span class="question-number">Question ${question.question_number}</span>
                            <span class="question-score ${question.is_correct ? 'correct' : 'incorrect'}">
                                ${question.score || 0}%
                            </span>
                        </div>
                        
                        <div class="question-content">
                            <div class="question-text">
                                <strong>Question:</strong> ${question.statement_question || 'N/A'}
                            </div>
                            
                            <div class="answer-comparison">
                                <div class="expected-answer">
                                    <div class="answer-label">Expected Answer</div>
                                    <div class="answer-text">${question.expected_answer || 'N/A'}</div>
                                </div>
                                <div class="student-answer">
                                    <div class="answer-label">Student Answer</div>
                                    <div class="answer-text">${question.student_answer || 'Not attempted'}</div>
                                </div>
                            </div>
                            
                            ${question.feedback ? `
                                <div class="question-feedback">
                                    <strong>Feedback:</strong> ${question.feedback}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderBasicAnalysis(analysis) {
        return `
            <div class="errors-section">
                <h4 class="section-title">
                    <i class="fas fa-exclamation-triangle"></i>
                    Identified Errors
                </h4>
                ${this.renderErrors(analysis.errors || [])}
            </div>
            
            <div class="corrections-section">
                <h4 class="section-title">
                    <i class="fas fa-check-circle"></i>
                    Corrections
                </h4>
                ${this.renderCorrections(analysis.corrections || [])}
            </div>
        `;
    }

    renderSummary(analysis) {
        // Handle cases where summary might be a complex object or raw JSON
        let summaryText = 'Analysis completed successfully.';
        let subject = '';
        let recommendations = '';

        if (typeof analysis.summary === 'string') {
            // Check if it's JSON string that needs parsing
            if (analysis.summary.startsWith('{') || analysis.summary.startsWith('[')) {
                try {
                    const parsed = JSON.parse(analysis.summary);
                    summaryText = parsed.summary || parsed.message || 'Analysis completed successfully.';
                    subject = parsed.subject || analysis.subject || '';
                    recommendations = parsed.recommendations || analysis.recommendations || '';
                } catch (e) {
                    // If parsing fails, use the raw string but clean it up
                    summaryText = analysis.summary.replace(/[{}"\[\]]/g, '').substring(0, 500) + '...';
                }
            } else {
                summaryText = analysis.summary;
            }
        } else if (analysis.summary && typeof analysis.summary === 'object') {
            summaryText = analysis.summary.text || analysis.summary.message || 'Analysis completed successfully.';
            subject = analysis.summary.subject || analysis.subject || '';
            recommendations = analysis.summary.recommendations || analysis.recommendations || '';
        }

        // Fallback to other fields if summary is not available
        if (!summaryText || summaryText === 'Analysis completed successfully.') {
            if (analysis.raw_response) {
                summaryText = 'Analysis completed. Please review the detailed results above.';
            }
        }

        // Clean up subject and recommendations
        subject = subject || analysis.subject || '';
        recommendations = recommendations || analysis.recommendations || '';

        return `
            <p class="summary-text">${summaryText}</p>
            ${subject ? `<p class="summary-text"><strong>Subject:</strong> ${subject}</p>` : ''}
            ${recommendations ? `<p class="summary-text"><strong>Recommendations:</strong> ${recommendations}</p>` : ''}
        `;
    }

    getScoreClass(score) {
        if (score >= 90) return 'score-excellent';
        if (score >= 75) return 'score-good';
        if (score >= 60) return 'score-average';
        return 'score-poor';
    }

    renderErrors(errors) {
        if (!errors || errors.length === 0) {
            return '<p class="item-description">No errors detected.</p>';
        }

        return errors.map(error => `
            <div class="error-item">
                <div class="item-location">${error.location || 'Unknown location'}</div>
                <div class="item-description">${error.error || error.explanation || 'Error detected'}</div>
            </div>
        `).join('');
    }

    renderCorrections(corrections) {
        if (!corrections || corrections.length === 0) {
            return '<p class="item-description">No corrections needed.</p>';
        }

        return corrections.map(correction => `
            <div class="correction-item">
                <div class="item-location">${correction.question || 'Question'}</div>
                <div class="item-description">
                    <strong>Correct:</strong> ${correction.correct_answer || 'N/A'}<br>
                    <strong>Student:</strong> ${correction.student_answer || 'N/A'}
                </div>
            </div>
        `).join('');
    }

    resetInterface() {
        this.selectedFiles = [];
        this.currentResults = null;
        this.updateFileList();
        this.updateAnalyzeButton();
        
        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('progressSection').style.display = 'none';
        document.getElementById('fileInput').value = '';
        
        document.querySelector('.upload-section').scrollIntoView({ behavior: 'smooth' });
    }

    async exportToPDF() {
        if (!this.currentResults || !this.currentResults.results || this.currentResults.results.length === 0) {
            this.showNotification('No analysis results available for export', 'error');
            return;
        }

        const exportBtn = document.getElementById('exportPdfBtn');
        const originalText = exportBtn.innerHTML;
        
        try {
            // Show loading state
            exportBtn.classList.add('loading');
            exportBtn.disabled = true;
            exportBtn.innerHTML = '<i class="fas fa-spinner"></i> Generating PDF...';

            this.showNotification('Generating PDF report...', 'info');

            // Prepare data for export
            const exportData = {
                results: this.currentResults,
                metadata: {
                    generatedAt: new Date().toISOString(),
                    statementUsed: this.currentResults.statement_used || false,
                    totalFiles: this.currentResults.results.length
                }
            };

            // Send request to backend
            const response = await fetch('/api/export-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(exportData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate PDF');
            }

            // Get PDF blob and trigger download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `course-checker-report-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            this.showNotification('PDF report downloaded successfully!', 'success');

        } catch (error) {
            console.error('PDF export error:', error);
            this.showNotification(`Failed to export PDF: ${error.message}`, 'error');
        } finally {
            // Reset button state
            exportBtn.classList.remove('loading');
            exportBtn.disabled = false;
            exportBtn.innerHTML = originalText;
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;

        // Add styles if not already present
        if (!document.querySelector('.notification-styles')) {
            const style = document.createElement('style');
            style.className = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 15px 20px;
                    border-radius: 8px;
                    color: white;
                    font-weight: 600;
                    z-index: 1001;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    animation: slideIn 0.3s ease-out;
                }
                .notification-error { background: #e53e3e; }
                .notification-info { background: #3182ce; }
                .notification-success { background: #38a169; }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Statement Document Methods
    handleStatementDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('statementUploadArea').classList.add('dragover');
    }

    handleStatementDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('statementUploadArea').classList.remove('dragover');
    }

    handleStatementDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('statementUploadArea').classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files);
        this.handleStatementFileSelect(files);
    }

    handleStatementFileSelect(files) {
        if (files.length === 0) return;
        
        if (files.length > 1) {
            this.showNotification('Please select only one statement document at a time.', 'error');
            return;
        }

        const file = files[0];
        if (!this.validateFile(file)) {
            return;
        }

        this.uploadStatementDocument(file);
    }

    async uploadStatementDocument(file) {
        try {
            this.showStatementProcessing(true);
            this.showAIThinking();
            this.updateAIStatus('Processing statement document...');
            this.updateAIProgress(20);
            
            const formData = new FormData();
            formData.append('files', file);

            this.updateAIStatus('Uploading statement to server...');
            this.updateAIProgress(40);

            const response = await fetch('/api/statement', {
                method: 'POST',
                body: formData
            });

            this.updateAIStatus('AI is analyzing the statement structure...');
            this.updateAIProgress(70);

            await this.simulateThinkingDelay(800);

            const result = await response.json();

            this.updateAIStatus('Extracting questions and answers...');
            this.updateAIProgress(90);

            await this.simulateThinkingDelay(500);

            if (result.success) {
                this.updateAIStatus('Statement processed successfully!');
                this.updateAIProgress(100);
                
                setTimeout(() => {
                    this.hideAIThinking();
                    this.showNotification(`Statement document processed: ${result.statement.questions_extracted} questions extracted`, 'success');
                }, 800);
                
                await this.loadActiveStatements();
            } else {
                throw new Error(result.error || 'Failed to process statement document');
            }

        } catch (error) {
            console.error('Error uploading statement:', error);
            this.hideAIThinking();
            this.showNotification(`Failed to process statement document: ${error.message}`, 'error');
        } finally {
            this.showStatementProcessing(false);
        }
    }

    async loadActiveStatements() {
        try {
            const response = await fetch('/api/statements');
            const result = await response.json();

            if (result.success) {
                this.activeStatements = result.statements;
                this.updateStatementsDisplay();
                this.updateStatementSelection();
            }
        } catch (error) {
            console.error('Error loading statements:', error);
        }
    }

    updateStatementsDisplay() {
        const activeStatementsDiv = document.getElementById('activeStatements');
        const statementsList = document.getElementById('statementsList');

        if (this.activeStatements.length === 0) {
            activeStatementsDiv.style.display = 'none';
            return;
        }

        activeStatementsDiv.style.display = 'block';
        statementsList.innerHTML = this.activeStatements.map(statement => `
            <div class="statement-item ${statement.is_active ? 'active' : ''}">
                <div class="statement-info">
                    <div class="statement-name">${statement.filename}</div>
                    <div class="statement-meta">
                        ${statement.questions_count} questions •
                        ${new Date(statement.timestamp).toLocaleDateString()}
                        ${statement.is_active ? ' • Active' : ''}
                    </div>
                </div>
                <div class="statement-actions">
                    ${!statement.is_active ?
                        `<button class="statement-btn select" onclick="courseChecker.selectStatement('${statement.id}')">
                            Select
                        </button>` :
                        `<button class="statement-btn active">Active</button>`
                    }
                    <button class="statement-btn delete" onclick="courseChecker.deleteStatement('${statement.id}')">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    updateStatementSelection() {
        const statementSelect = document.getElementById('statementSelect');
        const statementSelection = document.getElementById('statementSelection');

        if (this.activeStatements.length === 0) {
            statementSelection.style.display = 'none';
            return;
        }

        statementSelection.style.display = 'block';
        
        statementSelect.innerHTML = `
            <option value="">No statement selected (basic analysis)</option>
            ${this.activeStatements.map(statement => `
                <option value="${statement.id}" ${statement.is_active ? 'selected' : ''}>
                    ${statement.filename} (${statement.questions_count} questions)
                </option>
            `).join('')}
        `;
    }

    async selectStatement(statementId) {
        try {
            const response = await fetch(`/api/statement/${statementId}/select`, {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                this.selectedStatementId = statementId;
                this.showNotification(`Selected statement: ${result.selected_statement.filename}`, 'success');
                await this.loadActiveStatements();
            } else {
                throw new Error(result.error || 'Failed to select statement');
            }
        } catch (error) {
            console.error('Error selecting statement:', error);
            this.showNotification(`Failed to select statement: ${error.message}`, 'error');
        }
    }

    async deleteStatement(statementId) {
        if (!confirm('Are you sure you want to delete this statement document?')) {
            return;
        }

        try {
            const response = await fetch(`/api/statement/${statementId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Statement document deleted successfully', 'success');
                await this.loadActiveStatements();
            } else {
                throw new Error(result.error || 'Failed to delete statement');
            }
        } catch (error) {
            console.error('Error deleting statement:', error);
            this.showNotification(`Failed to delete statement: ${error.message}`, 'error');
        }
    }

    handleStatementSelection(statementId) {
        this.selectedStatementId = statementId || null;
        
        if (statementId) {
            this.selectStatement(statementId);
        }
    }

    showStatementProcessing(show) {
        const statementUploadArea = document.getElementById('statementUploadArea');
        
        if (show) {
            statementUploadArea.innerHTML = `
                <div class="statement-processing">
                    <i class="fas fa-cog fa-spin"></i>
                    Processing statement document...
                </div>
            `;
        } else {
            statementUploadArea.innerHTML = `
                <div class="statement-upload-content">
                    <i class="fas fa-file-text upload-icon"></i>
                    <h3>Upload Statement Document</h3>
                    <p>or <span class="browse-link" id="statementBrowseLink">browse files</span></p>
                    <small>Supports PDF, JPG, PNG (max 10MB)</small>
                </div>
            `;
            
            // Re-attach event listener for browse link
            const statementBrowseLink = document.getElementById('statementBrowseLink');
            if (statementBrowseLink) {
                statementBrowseLink.addEventListener('click', (e) => {
                    e.stopPropagation();
                    document.getElementById('statementFileInput').click();
                });
            }
        }
    }
}

// Initialize the application
const courseChecker = new CourseChecker();
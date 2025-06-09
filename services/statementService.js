const aiService = require('./aiService');

class StatementService {
    constructor() {
        // In-memory storage for statement documents
        this.documents = new Map(); // id -> statement data
        this.questionCache = new Map(); // statementId -> extracted questions
        this.activeStatement = null; // currently selected statement ID
        this.idCounter = 1; // Simple ID generation
    }

    /**
     * Process uploaded statement document
     * @param {Object} file - Multer file object
     * @returns {Object} Processed statement data
     */
    async processStatement(file) {
        try {
            console.log(`Processing statement document: ${file.originalname}`);
            
            // Generate unique ID for this statement
            const statementId = `stmt_${this.idCounter++}_${Date.now()}`;
            
            // Store basic statement info
            const statementData = {
                id: statementId,
                filename: file.originalname,
                originalPath: file.path,
                content: null, // Will be populated after AI extraction
                questions: [],
                timestamp: new Date().toISOString(),
                processed: false
            };
            
            // Store in memory
            this.documents.set(statementId, statementData);
            
            console.log(`Statement document stored with ID: ${statementId}`);
            return statementData;
            
        } catch (error) {
            console.error('Error processing statement:', error);
            throw new Error(`Failed to process statement document: ${error.message}`);
        }
    }

    /**
     * Extract questions from statement document using AI
     * @param {string} statementId - Statement document ID
     * @param {Array} images - Array of image buffers from the statement
     * @returns {Array} Extracted questions
     */
    async extractQuestions(statementId, images) {
        try {
            console.log(`Extracting questions from statement: ${statementId}`);
            
            const statement = this.documents.get(statementId);
            if (!statement) {
                throw new Error('Statement document not found');
            }

            // Use AI service to extract content and questions
            const extractedContent = await aiService.extractContent(images);
            const questions = await this.parseQuestionsFromContent(extractedContent, statement.filename);
            
            // Update statement with extracted data
            statement.content = extractedContent;
            statement.questions = questions;
            statement.processed = true;
            
            // Cache the questions for quick access
            this.questionCache.set(statementId, questions);
            
            console.log(`Extracted ${questions.length} questions from statement ${statementId}`);
            return questions;
            
        } catch (error) {
            console.error('Error extracting questions:', error);
            throw new Error(`Failed to extract questions: ${error.message}`);
        }
    }

    /**
     * Parse questions from extracted content using AI
     * @param {string} content - Extracted text content
     * @param {string} filename - Original filename for context
     * @returns {Array} Structured questions array
     */
    async parseQuestionsFromContent(content, filename) {
        try {
            const questionExtractionPrompt = `
You are analyzing an exam statement document to extract individual questions.

EXTRACTED CONTENT:
${content}

Please identify and extract all questions from this exam statement. For each question, provide:

1. Question number or identifier
2. The complete question text
3. Expected answer type (multiple choice, calculation, essay, etc.)
4. Any sub-questions or parts

Format your response as JSON ONLY, without any additional text or explanations. Example format, no \`\`\`json block needed, be careful to write a correct json structure and folllow exactly this example:
{
  "questions": [
    {
      "number": "1",
      "text": "Complete question text here",
    }
  ],
  "total_questions": 5,
  "subject": "Mathematics|Physics|Chemistry|Language Arts|etc"
}

Be thorough and capture all questions, including sub-parts.`;

            // Use a direct API call for question extraction since we need a specific prompt
            const axios = require('axios');
            const response = await axios.post(
                `${process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'}/chat/completions`,
                {
                    model: process.env.ANALYSIS_MODEL || 'google/gemini-pro',
                    messages: [
                        {
                            role: 'user',
                            content: questionExtractionPrompt
                        }
                    ],
                    max_tokens: 8000,
                    temperature: 0.3
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'http://localhost:3000',
                        'X-Title': 'Course Checker'
                    }
                }
            );

            const analysisText = response.data.choices[0].message.content;
            
            // Clean up the response - remove markdown code blocks if present
            let cleanedResponse = analysisText.trim();
            if (cleanedResponse.startsWith('```json')) {
                cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanedResponse.startsWith('```')) {
                cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            // Parse the JSON response
            let parsedQuestions;
            try {
                parsedQuestions = JSON.parse(cleanedResponse);
            } catch (parseError) {
                console.warn('Failed to parse question extraction JSON:', parseError.message);
                console.warn('Raw response:', analysisText);
                console.warn('Cleaned response:', cleanedResponse);
                // Return empty array on parse error
                return [];
            }
            
            return parsedQuestions.questions || [];
            
        } catch (error) {
            console.error('Error parsing questions from content:', error);
            // Return empty array on error to prevent system failure
            return [];
        }
    }

    /**
     * Get all active statement documents
     * @returns {Array} Array of statement document summaries
     */
    getActiveStatements() {
        const statements = [];
        for (const [id, statement] of this.documents) {
            statements.push({
                id: statement.id,
                filename: statement.filename,
                questions_count: statement.questions.length,
                processed: statement.processed,
                timestamp: statement.timestamp,
                is_active: this.activeStatement === id
            });
        }
        
        // Sort by timestamp (newest first)
        return statements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    /**
     * Select a statement document as active
     * @param {string} statementId - Statement document ID
     * @returns {Object} Selected statement data
     */
    selectStatement(statementId) {
        const statement = this.documents.get(statementId);
        if (!statement) {
            throw new Error('Statement document not found');
        }
        
        this.activeStatement = statementId;
        console.log(`Selected statement: ${statement.filename} (${statementId})`);
        
        return {
            id: statement.id,
            filename: statement.filename,
            questions_count: statement.questions.length,
            processed: statement.processed
        };
    }

    /**
     * Get the currently active statement
     * @returns {Object|null} Active statement data or null
     */
    getActiveStatement() {
        if (!this.activeStatement) {
            return null;
        }
        
        const statement = this.documents.get(this.activeStatement);
        return statement || null;
    }

    /**
     * Get questions for a specific statement
     * @param {string} statementId - Statement document ID
     * @returns {Array} Questions array
     */
    getQuestions(statementId) {
        // Try cache first
        if (this.questionCache.has(statementId)) {
            return this.questionCache.get(statementId);
        }
        
        // Fallback to document storage
        const statement = this.documents.get(statementId);
        return statement ? statement.questions : [];
    }

    /**
     * Remove a statement document from memory
     * @param {string} statementId - Statement document ID
     * @returns {boolean} Success status
     */
    removeStatement(statementId) {
        try {
            const statement = this.documents.get(statementId);
            if (!statement) {
                return false;
            }
            
            // Clean up file system if needed
            const fs = require('fs');
            if (statement.originalPath && fs.existsSync(statement.originalPath)) {
                fs.unlinkSync(statement.originalPath);
            }
            
            // Remove from memory
            this.documents.delete(statementId);
            this.questionCache.delete(statementId);
            
            // Clear active statement if it was the removed one
            if (this.activeStatement === statementId) {
                this.activeStatement = null;
            }
            
            console.log(`Removed statement: ${statement.filename} (${statementId})`);
            return true;
            
        } catch (error) {
            console.error('Error removing statement:', error);
            return false;
        }
    }

    /**
     * Clean up all statement documents (useful for testing or memory management)
     */
    cleanup() {
        console.log(`Cleaning up ${this.documents.size} statement documents`);
        
        // Clean up files
        const fs = require('fs');
        for (const [id, statement] of this.documents) {
            if (statement.originalPath && fs.existsSync(statement.originalPath)) {
                try {
                    fs.unlinkSync(statement.originalPath);
                } catch (error) {
                    console.warn(`Failed to delete file: ${statement.originalPath}`);
                }
            }
        }
        
        // Clear memory
        this.documents.clear();
        this.questionCache.clear();
        this.activeStatement = null;
        this.idCounter = 1;
    }

    /**
     * Get memory usage statistics
     * @returns {Object} Memory usage info
     */
    getStats() {
        return {
            total_statements: this.documents.size,
            active_statement: this.activeStatement,
            cached_questions: this.questionCache.size,
            memory_usage: {
                documents: this.documents.size,
                question_cache: this.questionCache.size
            }
        };
    }
}

// Export singleton instance
module.exports = new StatementService();
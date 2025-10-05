const axios = require('axios');

class AIService {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
        this.baseURL = process.env.OPENROUTER_BASE_URL;
        this.visionModel = process.env.VISION_MODEL ;
        this.analysisModel = process.env.ANALYSIS_MODEL;
        
        if (!this.apiKey) {
            console.warn('Warning: OPENROUTER_API_KEY not found in environment variables');
        }
    }

    /**
     * Analyze exam images using Gemini Vision and Pro models
     * @param {Array} images - Array of image buffers
     * @param {string} filename - Original filename for context
     * @returns {Object} Analysis results
     */
    async analyzeExam(images, filename) {
        try {
            console.log(`Starting AI analysis for ${filename}...`);
            
            // Step 1: Extract content using Vision model
            const extractedContent = await this.extractContent(images);
            console.log(extractedContent);
            // Step 2: Analyze and correct using Pro model
            const analysis = await this.analyzeContent(extractedContent, filename);
            
            return {
                filename: filename,
                extractedContent: extractedContent,
                analysis: analysis,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Error in AI analysis:', error);
            throw new Error(`AI analysis failed: ${error.message}`);
        }
    }

    /**
     * Extract content from images using Gemini Vision
     * @param {Array} images - Array of image buffers
     * @returns {string} Extracted text content
     */
    async extractContent(images) {
        try {
            const imageData = images.map(buffer => ({
                type: 'image_url',
                image_url: {
                    url: `data:image/jpeg;base64,${buffer.toString('base64')}`
                }
            }));

            const response = await axios.post(
                `${this.baseURL}/chat/completions`,
                {
                    model: this.visionModel,
                    messages: [
                        {
                            role: 'user',
                            content: [
                                {
                                    type: 'text',
                                    text: 'Extract all text, mathematical expressions, diagrams, and any written content from this exam/test document. Preserve the structure and formatting as much as possible. Include any handwritten answers, calculations, or notes.'
                                },
                                ...imageData
                            ]
                        }
                    ],
                    max_tokens: 8000
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'http://localhost:3000',
                        'X-Title': 'Course Checker'
                    }
                }
            );

            // Debug: Log response structure
            console.log('Vision API Response Status:', response.status);
            console.log('Vision API Response Keys:', Object.keys(response.data || {}));
            
            // Validate response structure
            if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
                console.error('Invalid response structure from vision API:', JSON.stringify(response.data, null, 2));
                throw new Error('Invalid response structure from vision API');
            }

            const extractedContent = response.data.choices[0].message.content;
            
            if (!extractedContent) {
                throw new Error('Empty response from vision API');
            }

            return extractedContent;
            
        } catch (error) {
            console.error('Error extracting content:', error.response?.data || error.message);
            throw new Error('Failed to extract content from images');
        }
    }

    /**
     * Analyze extracted content for errors and corrections
     * @param {string} content - Extracted content from vision model
     * @param {string} filename - Original filename for context
     * @returns {Object} Analysis results with score and corrections
     */
    async analyzeContent(content, filename) {
        try {
            const analysisPrompt = `
You are an expert teacher analyzing a student's exam/test submission. 

EXTRACTED CONTENT:
${content}

Please analyze this student work and provide:

1. OVERALL SCORE: Give a percentage score (0-100%) based on correctness
2. IDENTIFIED ERRORS: List specific mistakes found with brief explanations
3. CORRECT ANSWERS: Provide the correct solutions for any incorrect answers
4. SUBJECT CLASSIFICATION: Identify the subject area (math, physics, chemistry, language arts, etc.)

Format your response as raw JSON ONLY, without any additional text or explanations. Example format:
{
  "score": 85,
  "subject": "Mathematics",
  "errors": [
    {
      "location": "Question 1",
      "error": "Calculation mistake in step 2",
      "explanation": "Should be 2x + 3 = 7, not 2x + 3 = 8"
    }
  ],
  "corrections": [
    {
      "question": "Question 1",
      "correct_answer": "x = 2",
      "student_answer": "x = 2.5"
    }
  ],
  "summary": "Good understanding of concepts but some calculation errors"
}

Be constructive and educational in your feedback.`;

            const response = await axios.post(
                `${this.baseURL}/chat/completions`,
                {
                    model: this.analysisModel,
                    messages: [
                        {
                            role: 'user',
                            content: analysisPrompt
                        }
                    ],
                    max_tokens: 8000,
                    temperature: 0.3
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'http://localhost:3000',
                        'X-Title': 'Course Checker'
                    }
                }
            );

            // Debug: Log response structure
            console.log('Analysis API Response Status:', response.status);
            console.log('Analysis API Response Keys:', Object.keys(response.data || {}));

            // Validate response structure
            if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
                console.error('Invalid response structure from analysis API:', JSON.stringify(response.data, null, 2));
                throw new Error('Invalid response structure from AI service');
            }

            const analysisText = response.data.choices[0].message.content;
            
            if (!analysisText) {
                throw new Error('Empty response from AI service');
            }
            
            // Try to parse JSON response
            try {
                return JSON.parse(analysisText);
            } catch (parseError) {
                console.warn('Failed to parse JSON response:', parseError.message);
                console.warn('Raw response:', analysisText);
                
                // If JSON parsing fails, return a structured fallback
                return {
                    score: 0,
                    subject: "Unknown",
                    errors: [],
                    corrections: [],
                    summary: analysisText,
                    raw_response: analysisText
                };
            }
            
        } catch (error) {
            console.error('Error analyzing content:', error.response?.data || error.message);
            throw new Error('Failed to analyze content');
        }
    }

    /**
     * Analyze exam with statement document context
     * @param {Array} images - Array of student exam image buffers
     * @param {Array} statementQuestions - Questions extracted from statement
     * @param {string} filename - Original filename for context
     * @returns {Object} Enhanced analysis results with question-by-question comparison
     */
    async analyzeExamWithStatement(images, statementQuestions, filename) {
        try {
            console.log(`Starting enhanced analysis with statement context for ${filename}...`);
            
            // Step 1: Extract student content
            const studentContent = await this.extractContent(images);
            
            // Step 2: Perform enhanced analysis with statement context
            const analysis = await this.analyzeContentWithStatement(studentContent, statementQuestions, filename);
            
            return {
                filename: filename,
                extractedContent: studentContent,
                analysis: analysis,
                statement_used: true,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('Error in enhanced analysis:', error);
            throw new Error(`Enhanced analysis failed: ${error.message}`);
        }
    }

    /**
     * Analyze student content against statement questions
     * @param {string} studentContent - Extracted student content
     * @param {Array} statementQuestions - Questions from statement document
     * @param {string} filename - Original filename for context
     * @returns {Object} Enhanced analysis with question-by-question comparison
     */
    async analyzeContentWithStatement(studentContent, statementQuestions, filename) {
        try {
            const enhancedPrompt = `
Analyze student exam against original questions. Return JSON ONLY:

QUESTIONS: ${JSON.stringify(statementQuestions, null, 2)}
STUDENT WORK: ${studentContent}

Required JSON format:
{
  "overall_score": 85,
  "subject": "Mathematics",
  "statement_used": true,
  "question_analysis": [
    {
      "question_number": "1",
      "statement_question": "Original question text",
      "expected_answer": "Correct answer",
      "student_answer": "Student's response",
      "is_correct": true,
      "score": 100,
      "feedback": "Brief feedback"
    }
  ],
  "summary": "Brief overall assessment",
  "recommendations": "Key improvement areas"
}

Keep feedback concise. Mark unanswered questions as "not attempted".`;

            const response = await axios.post(
                `${this.baseURL}/chat/completions`,
                {
                    model: this.analysisModel,
                    messages: [
                        {
                            role: 'user',
                            content: enhancedPrompt
                        }
                    ],
                    max_tokens: 8000,
                    temperature: 0.3
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'http://localhost:3000',
                        'X-Title': 'Course Checker'
                    }
                }
            );

            // Validate response structure
            if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
                console.error('Invalid response structure from enhanced analysis API:', JSON.stringify(response.data, null, 2));
                throw new Error('Invalid response structure from AI service');
            }

            const analysisText = response.data.choices[0].message.content;
            
            if (!analysisText) {
                throw new Error('Empty response from AI service');
            }
            
            // Clean up the response - remove markdown code blocks if present
            let cleanedResponse = analysisText.trim();
            if (cleanedResponse.startsWith('```json')) {
                cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanedResponse.startsWith('```')) {
                cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            // Check if JSON appears to be truncated
            if (!cleanedResponse.endsWith('}') && !cleanedResponse.endsWith('"}')) {
                console.warn('JSON response appears to be truncated');
                // Try to fix common truncation issues
                if (cleanedResponse.includes('"summary":') && !cleanedResponse.includes('"recommendations":')) {
                    cleanedResponse += '", "recommendations": "Please review the detailed analysis above"}';
                } else if (!cleanedResponse.endsWith('}')) {
                    cleanedResponse += '}';
                }
            }
            
            // Try to parse JSON response
            try {
                const parsedAnalysis = JSON.parse(cleanedResponse);
                
                // Ensure required fields exist
                if (!parsedAnalysis.question_analysis) {
                    parsedAnalysis.question_analysis = [];
                }
                
                return parsedAnalysis;
            } catch (parseError) {
                console.warn('Failed to parse enhanced analysis JSON:', parseError.message);
                console.warn('Raw response:', analysisText);
                console.warn('Cleaned response:', cleanedResponse);
                
                // Return structured fallback
                return {
                    overall_score: 0,
                    subject: "Unknown",
                    statement_used: true,
                    question_analysis: [],
                    summary: "Analysis completed but formatting issues occurred. Please review manually.",
                    recommendations: "Please review the analysis manually",
                    raw_response: analysisText
                };
            }
            
        } catch (error) {
            console.error('Error in enhanced content analysis:', error.response?.data || error.message);
            throw new Error('Failed to analyze content with statement context');
        }
    }

    /**
     * Match student answers to statement questions using AI
     * @param {Array} questions - Statement questions
     * @param {string} studentContent - Student's extracted content
     * @returns {Array} Matched questions with student responses
     */
    async matchQuestionsToAnswers(questions, studentContent) {
        try {
            const matchingPrompt = `
You are analyzing a student's exam to match their answers to specific questions.

ORIGINAL QUESTIONS:
${JSON.stringify(questions, null, 2)}

STUDENT'S WORK:
${studentContent}

Please match each student response to the corresponding original question. For each question, identify:
1. The student's answer or attempt
2. Confidence level of the match (0-100%)
3. Any partial answers or work shown

Format as JSON:
{
  "matches": [
    {
      "question_number": "1",
      "student_response": "What the student wrote for this question",
      "match_confidence": 95,
      "has_work_shown": true,
      "notes": "Additional observations"
    }
  ]
}`;

            const response = await axios.post(
                `${this.baseURL}/chat/completions`,
                {
                    model: this.analysisModel,
                    messages: [
                        {
                            role: 'user',
                            content: matchingPrompt
                        }
                    ],
                    max_tokens: 8000,
                    temperature: 0.2
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'http://localhost:3000',
                        'X-Title': 'Course Checker'
                    }
                }
            );

            const matchingText = response.data.choices[0].message.content;
            
            try {
                return JSON.parse(matchingText);
            } catch (parseError) {
                console.warn('Failed to parse question matching response:', parseError.message);
                return { matches: [] };
            }
            
        } catch (error) {
            console.error('Error matching questions to answers:', error);
            return { matches: [] };
        }
    }
    /**
     * Generate a quiz from course content
     * @param {string} courseContent - Extracted course content
     * @param {number} numQuestions - Number of questions to generate (default: 10)
     * @returns {Array} Array of quiz questions
     */
    async generateQuiz(courseContent, numQuestions = 10) {
        try {
            console.log(`Generating quiz with ${numQuestions} questions from course content...`);
            
            const quizPrompt = `
You are an expert educator creating a quiz from the following course material.

COURSE CONTENT:
${courseContent}

Generate exactly ${numQuestions} quiz questions based on this content. Mix the question types:
- Approximately 50% should be multiple choice (4 options each)
- Approximately 50% should be true/false questions

IMPORTANT: Return ONLY valid JSON, no markdown, no explanations. Format:
{
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option B"
    },
    {
      "id": 2,
      "type": "true_false",
      "question": "Statement to evaluate?",
      "correctAnswer": "true"
    }
  ]
}

Guidelines:
- Questions should test understanding of key concepts
- Make questions clear and unambiguous
- Ensure correct answers are accurate
- For true/false, use "true" or "false" as strings
- For multiple choice, correctAnswer must exactly match one option
- Mix difficulty levels
- Cover different topics from the material`;

            const response = await axios.post(
                `${this.baseURL}/chat/completions`,
                {
                    model: this.analysisModel,
                    messages: [
                        {
                            role: 'user',
                            content: quizPrompt
                        }
                    ],
                    max_tokens: 4000,
                    temperature: 0.7
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'http://localhost:3000',
                        'X-Title': 'Course Checker - Quiz Generator'
                    }
                }
            );

            // Validate response structure
            if (!response.data || !response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
                console.error('Invalid response structure from quiz generation API');
                throw new Error('Invalid response structure from AI service');
            }

            const quizText = response.data.choices[0].message.content;
            
            if (!quizText) {
                throw new Error('Empty response from AI service');
            }

            // Clean up the response - remove markdown code blocks if present
            let cleanedResponse = quizText.trim();
            if (cleanedResponse.startsWith('```json')) {
                cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanedResponse.startsWith('```')) {
                cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            // Try to parse JSON response
            try {
                const quizData = JSON.parse(cleanedResponse);
                
                if (!quizData.questions || !Array.isArray(quizData.questions)) {
                    throw new Error('Invalid quiz format: missing questions array');
                }

                // Validate each question
                const validatedQuestions = quizData.questions.map((q, index) => {
                    if (!q.type || !q.question || !q.correctAnswer) {
                        throw new Error(`Invalid question at index ${index}: missing required fields`);
                    }

                    if (q.type === 'multiple_choice' && (!q.options || !Array.isArray(q.options) || q.options.length < 2)) {
                        throw new Error(`Invalid multiple choice question at index ${index}: insufficient options`);
                    }

                    return {
                        id: q.id || index + 1,
                        type: q.type,
                        question: q.question,
                        options: q.options || null,
                        correctAnswer: q.correctAnswer
                    };
                });

                console.log(`Successfully generated ${validatedQuestions.length} quiz questions`);
                return validatedQuestions;

            } catch (parseError) {
                console.error('Failed to parse quiz JSON:', parseError.message);
                console.error('Raw response:', quizText);
                console.error('Cleaned response:', cleanedResponse);
                throw new Error(`Failed to parse quiz response: ${parseError.message}`);
            }

        } catch (error) {
            console.error('Error generating quiz:', error.response?.data || error.message);
            throw new Error(`Quiz generation failed: ${error.message}`);
        }
    }


    /**
     * Test API connection
     * @returns {boolean} True if connection is successful
     */
    async testConnection() {
        try {
            const response = await axios.get(`${this.baseURL}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            return response.status === 200;
        } catch (error) {
            console.error('API connection test failed:', error.message);
            return false;
        }
    }
}

module.exports = new AIService();
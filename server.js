const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const fileProcessor = require('./services/fileProcessor');
const aiService = require('./services/aiService');
const statementService = require('./services/statementService');
const pdfService = require('./services/pdfService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// File upload and processing endpoint
app.post('/api/analyze', fileProcessor.upload, async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        console.log(`Processing ${req.files.length} file(s)...`);
        
        // Check if statement ID is provided for enhanced analysis
        const statementId = req.body.statement_id;
        let statementQuestions = null;
        
        if (statementId) {
            console.log(`Using statement document: ${statementId}`);
            statementQuestions = statementService.getQuestions(statementId);
            if (statementQuestions.length === 0) {
                console.warn(`No questions found for statement: ${statementId}`);
            }
        }
        
        // Process each uploaded file
        const results = [];
        for (const file of req.files) {
            console.log(`Processing file: ${file.originalname}`);
            
            // Convert file to images if needed
            const images = await fileProcessor.processFile(file);
            
            // Analyze with AI (enhanced if statement is available)
            let analysis;
            if (statementQuestions && statementQuestions.length > 0) {
                analysis = await aiService.analyzeExamWithStatement(images, statementQuestions, file.originalname);
            } else {
                analysis = await aiService.analyzeExam(images, file.originalname);
            }
            
            results.push({
                filename: file.originalname,
                analysis: analysis
            });
            
            // Clean up temporary files
            fileProcessor.cleanup(file.path);
        }

        res.json({
            success: true,
            results: results,
            statement_used: !!statementId
        });

    } catch (error) {
        console.error('Error processing files:', error);
        res.status(500).json({
            error: 'Failed to process files',
            details: error.message
        });
    }
});

// Statement document upload endpoint
app.post('/api/statement', fileProcessor.upload, async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No statement document uploaded' });
        }

        if (req.files.length > 1) {
            return res.status(400).json({ error: 'Please upload only one statement document at a time' });
        }

        const file = req.files[0];
        console.log(`Processing statement document: ${file.originalname}`);
        
        // Process the statement document
        const statementData = await statementService.processStatement(file);
        
        // Convert file to images for AI processing
        const images = await fileProcessor.processFile(file);
        
        // Extract questions using AI
        const questions = await statementService.extractQuestions(statementData.id, images);
        
        // Clean up temporary files
        fileProcessor.cleanup(file.path);
        
        res.json({
            success: true,
            statement: {
                id: statementData.id,
                filename: statementData.filename,
                questions_extracted: questions.length,
                timestamp: statementData.timestamp
            }
        });

    } catch (error) {
        console.error('Error processing statement document:', error);
        res.status(500).json({
            error: 'Failed to process statement document',
            details: error.message
        });
    }
});

// Get all active statement documents
app.get('/api/statements', (req, res) => {
    try {
        const statements = statementService.getActiveStatements();
        res.json({
            success: true,
            statements: statements,
            active_statement: statementService.activeStatement
        });
    } catch (error) {
        console.error('Error getting statements:', error);
        res.status(500).json({
            error: 'Failed to get statements',
            details: error.message
        });
    }
});

// Select a statement document as active
app.post('/api/statement/:id/select', (req, res) => {
    try {
        const statementId = req.params.id;
        const selectedStatement = statementService.selectStatement(statementId);
        
        res.json({
            success: true,
            selected_statement: selectedStatement
        });
    } catch (error) {
        console.error('Error selecting statement:', error);
        res.status(500).json({
            error: 'Failed to select statement',
            details: error.message
        });
    }
});

// Delete a statement document
app.delete('/api/statement/:id', (req, res) => {
    try {
        const statementId = req.params.id;
        const removed = statementService.removeStatement(statementId);
        
        if (removed) {
            res.json({
                success: true,
                message: 'Statement document removed successfully'
            });
        } else {
            res.status(404).json({
                error: 'Statement document not found'
            });
        }
    } catch (error) {
        console.error('Error removing statement:', error);
        res.status(500).json({
            error: 'Failed to remove statement',
            details: error.message
        });
    }
});

// Get statement service statistics
app.get('/api/statements/stats', (req, res) => {
    try {
        const stats = statementService.getStats();
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('Error getting statement stats:', error);
        res.status(500).json({
            error: 'Failed to get statement statistics',
            details: error.message
        });
    }
});

// PDF export endpoint
app.post('/api/export-pdf', async (req, res) => {
    try {
        const { results, metadata = {} } = req.body;
        
        if (!results || !results.results || results.results.length === 0) {
            return res.status(400).json({ error: 'No analysis results provided for export' });
        }

        console.log(`Generating PDF report for ${results.results.length} analysis result(s)...`);
        
        // Generate PDF buffer
        const pdfBuffer = await pdfService.generateAnalysisReport(results, {
            statementUsed: results.statement_used || false,
            generatedAt: new Date().toISOString(),
            ...metadata
        });

        // Set response headers for PDF download
        const filename = `course-checker-report-${new Date().toISOString().split('T')[0]}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        // Send PDF buffer
        res.send(pdfBuffer);
        
        console.log(`PDF report generated successfully: ${filename}`);

    } catch (error) {
        console.error('Error generating PDF report:', error);
        res.status(500).json({
            error: 'Failed to generate PDF report',
            details: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Course Checker server running on http://localhost:${PORT}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
});
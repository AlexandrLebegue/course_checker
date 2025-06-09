const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const sharp = require('sharp');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, JPG, JPEG, and PNG files are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
    }
}).array('files', 10); // Allow up to 10 files

/**
 * Process uploaded file and convert to images for AI analysis
 * @param {Object} file - Uploaded file object
 * @returns {Array} Array of image buffers or file paths
 */
async function processFile(file) {
    const filePath = file.path;
    const fileExtension = path.extname(file.originalname).toLowerCase();

    try {
        if (fileExtension === '.pdf') {
            return await processPDF(filePath);
        } else if (['.jpg', '.jpeg', '.png'].includes(fileExtension)) {
            return await processImage(filePath);
        } else {
            throw new Error(`Unsupported file type: ${fileExtension}`);
        }
    } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error);
        throw error;
    }
}

/**
 * Convert PDF to images
 * @param {string} pdfPath - Path to PDF file
 * @returns {Array} Array of image buffers
 */
async function processPDF(pdfPath) {
    try {
        // For now, we'll extract text from PDF and create a simple image representation
        // In a more advanced implementation, you might use pdf2pic or similar
        const dataBuffer = fs.readFileSync(pdfPath);
        const pdfData = await pdfParse(dataBuffer);
        
        // Create a simple text image for demonstration
        // In production, you'd want to use a proper PDF to image converter
        const textImage = await createTextImage(pdfData.text);
        
        return [textImage];
    } catch (error) {
        console.error('Error processing PDF:', error);
        throw new Error('Failed to process PDF file');
    }
}

/**
 * Process image file
 * @param {string} imagePath - Path to image file
 * @returns {Array} Array containing the processed image buffer
 */
async function processImage(imagePath) {
    try {
        // Optimize image for AI processing
        const imageBuffer = await sharp(imagePath)
            .resize(1024, 1024, { 
                fit: 'inside',
                withoutEnlargement: true 
            })
            .jpeg({ quality: 85 })
            .toBuffer();
        
        return [imageBuffer];
    } catch (error) {
        console.error('Error processing image:', error);
        throw new Error('Failed to process image file');
    }
}

/**
 * Create a simple text image from extracted PDF text
 * This is a basic implementation - in production you'd use proper PDF to image conversion
 * @param {string} text - Extracted text from PDF
 * @returns {Buffer} Image buffer
 */
async function createTextImage(text) {
    try {
        // Create a simple white background with black text
        const width = 800;
        const height = 1000;
        
        // Truncate text if too long
        const truncatedText = text.substring(0, 2000);
        
        const svg = `
            <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="white"/>
                <foreignObject x="20" y="20" width="${width-40}" height="${height-40}">
                    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Arial; font-size: 14px; line-height: 1.4; color: black; word-wrap: break-word;">
                        ${truncatedText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
                    </div>
                </foreignObject>
            </svg>
        `;
        
        const imageBuffer = await sharp(Buffer.from(svg))
            .png()
            .toBuffer();
        
        return imageBuffer;
    } catch (error) {
        console.error('Error creating text image:', error);
        throw new Error('Failed to create text image');
    }
}

/**
 * Clean up temporary files
 * @param {string} filePath - Path to file to delete
 */
function cleanup(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Cleaned up temporary file: ${filePath}`);
        }
    } catch (error) {
        console.error(`Error cleaning up file ${filePath}:`, error);
    }
}

module.exports = {
    upload,
    processFile,
    cleanup
};
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Try to load pdf2pic, fallback if not available
let pdf2pic;
try {
    pdf2pic = require('pdf2pic');
} catch (e) {
    console.warn('pdf2pic not available, will use fallback method');
}

// Fallback: use pdf-parse if pdf2pic fails
const pdfParse = require('pdf-parse');

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
 * Convert PDF to images using pdf2pic with fallback to pdf-parse
 * @param {string} pdfPath - Path to PDF file
 * @returns {Array} Array of image buffers
 */
async function processPDF(pdfPath) {
    // Try pdf2pic first if available
    if (pdf2pic) {
        try {
            return await processPDFWithPdf2Pic(pdfPath);
        } catch (error) {
            console.warn('pdf2pic failed, falling back to text extraction:', error.message);
        }
    }
    
    // Fallback to pdf-parse + text rendering
    console.log('Using fallback PDF processing method (text extraction)');
    return await processPDFWithTextExtraction(pdfPath);
}

/**
 * Convert PDF to images using pdf2pic
 * @param {string} pdfPath - Path to PDF file
 * @returns {Array} Array of image buffers
 */
async function processPDFWithPdf2Pic(pdfPath) {
    const { fromPath } = pdf2pic;
    
    // Configure pdf2pic options
    const options = {
        density: 100,           // DPI for output images
        saveFilename: "page",   // Output file name
        savePath: "./uploads",  // Temporary path
        format: "png",          // Output format
        width: 1024,            // Max width
        height: 1448            // Max height (A4 ratio)
    };

    const convert = fromPath(pdfPath, options);
    
    // Convert all pages to images
    const images = [];
    let pageNum = 1;
    let hasMorePages = true;
    
    while (hasMorePages && pageNum <= 20) { // Limit to 20 pages
        try {
            const result = await convert(pageNum, { responseType: "buffer" });
            
            if (result && result.buffer) {
                // Optimize the image buffer
                const optimizedBuffer = await sharp(result.buffer)
                    .resize(1024, 1448, {
                        fit: 'inside',
                        withoutEnlargement: true
                    })
                    .jpeg({ quality: 85 })
                    .toBuffer();
                
                images.push(optimizedBuffer);
                pageNum++;
            } else {
                hasMorePages = false;
            }
        } catch (err) {
            // No more pages
            hasMorePages = false;
        }
    }
    
    if (images.length === 0) {
        throw new Error('No pages could be converted from PDF using pdf2pic');
    }
    
    console.log(`Successfully converted ${images.length} page(s) from PDF using pdf2pic`);
    return images;
}

/**
 * Fallback: Extract text from PDF and create text-based images
 * @param {string} pdfPath - Path to PDF file
 * @returns {Array} Array of image buffers
 */
async function processPDFWithTextExtraction(pdfPath) {
    try {
        const dataBuffer = fs.readFileSync(pdfPath);
        const pdfData = await pdfParse(dataBuffer);
        
        // Split text into pages (approximate)
        const textPerPage = 2000; // Characters per page
        const text = pdfData.text || '';
        const pages = [];
        
        for (let i = 0; i < text.length; i += textPerPage) {
            pages.push(text.substring(i, i + textPerPage));
        }
        
        if (pages.length === 0) {
            pages.push('Empty PDF or could not extract text');
        }
        
        // Create images from text
        const images = [];
        for (let i = 0; i < pages.length; i++) {
            const imageBuffer = await createTextImage(pages[i], i + 1, pages.length);
            images.push(imageBuffer);
        }
        
        console.log(`Successfully extracted ${images.length} page(s) from PDF using text extraction`);
        return images;
    } catch (error) {
        console.error('Error processing PDF with text extraction:', error);
        throw new Error(`Failed to process PDF file: ${error.message}`);
    }
}

/**
 * Create a text-based image from extracted PDF text
 * @param {string} text - Extracted text from PDF
 * @param {number} pageNum - Current page number
 * @param {number} totalPages - Total number of pages
 * @returns {Buffer} Image buffer
 */
async function createTextImage(text, pageNum, totalPages) {
    try {
        const width = 1024;
        const height = 1448;
        
        // Remove invalid XML characters and escape special characters
        const sanitizedText = text
            // Remove null bytes and other invalid control characters (except tab, newline, carriage return)
            .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
            // Replace common problematic characters
            .replace(/\uFFFD/g, '') // Replacement character
            .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '')
            // Escape XML special characters
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;')
            // Limit text length
            .substring(0, 3000);
        
        const svg = `
            <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="white"/>
                <text x="20" y="30" font-family="Arial" font-size="12" fill="#999">
                    Page ${pageNum} of ${totalPages}
                </text>
                <foreignObject x="20" y="50" width="${width-40}" height="${height-80}">
                    <div xmlns="http://www.w3.org/1999/xhtml"
                         style="font-family: Arial, sans-serif; font-size: 12px; line-height: 1.6;
                                color: #333; word-wrap: break-word; white-space: pre-wrap;">
                        ${sanitizedText}
                    </div>
                </foreignObject>
                <text x="20" y="${height-20}" font-family="Arial" font-size="10" fill="#999">
                    Generated from PDF text extraction
                </text>
            </svg>
        `;
        
        const imageBuffer = await sharp(Buffer.from(svg))
            .jpeg({ quality: 85 })
            .toBuffer();
        
        return imageBuffer;
    } catch (error) {
        console.error('Error creating text image:', error);
        throw new Error('Failed to create text image');
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
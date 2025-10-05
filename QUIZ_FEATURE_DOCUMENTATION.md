# Quiz Generator Feature Documentation

## Overview
The Quiz Generator feature allows users to upload course materials and generate AI-powered quizzes for revision purposes. The system creates 10 questions per quiz with a mix of multiple choice and true/false questions.

## Features Implemented

### 1. Course Material Upload
- Upload PDF, JPG, or PNG files containing course material
- AI extracts content from uploaded documents
- Support for various educational content types

### 2. AI-Powered Quiz Generation
- Generates exactly 10 questions per quiz
- Mix of question types:
  - Multiple choice (4 options)
  - True/False questions
- Questions test understanding of key concepts
- Regenerate functionality for new questions from same material

### 3. Interactive Quiz Taking
- Question-by-question navigation
- Previous/Next buttons for review
- Visual feedback for selected answers
- Progress indicator showing current question

### 4. Comprehensive Results
- Overall score display (percentage)
- Detailed breakdown:
  - Correct answers count
  - Incorrect answers count
  - Question-by-question review
- Color-coded score indicators:
  - Green (≥80%): Excellent
  - Orange (60-79%): Good
  - Red (<60%): Needs improvement

### 5. Quiz History Tracking
- Stores all quiz attempts
- Shows past scores and timestamps
- Quick view of performance over time

## Technical Implementation

### Backend Components

#### New Files Created:
1. **`services/quizService.js`**
   - Quiz and result storage
   - Score calculation
   - Answer validation
   - History management

2. **API Routes in `server.js`**:
   - `GET /quiz` - Quiz page
   - `POST /api/quiz/upload` - Upload course material
   - `POST /api/quiz/generate` - Generate quiz
   - `POST /api/quiz/submit` - Submit answers
   - `GET /api/quiz/history` - Get quiz history
   - `GET /api/quiz/stats` - Get statistics

3. **Extended `services/aiService.js`**:
   - New `generateQuiz()` method
   - Creates varied question types
   - Validates question format
   - Ensures quality questions

### Frontend Components

#### New Files Created:
1. **`public/quiz.html`**
   - Course upload interface
   - Quiz taking interface
   - Results display
   - History view
   - Navigation to exam correction

2. **`public/quiz-script.js`**
   - File upload handling
   - Quiz generation requests
   - Interactive quiz interface
   - Answer submission
   - Results visualization
   - History display

3. **Extended `public/styles.css`**:
   - Quiz-specific styling
   - Question card design
   - Result visualizations
   - Navigation styling
   - Responsive design

## User Workflow

1. **Upload Course Material**
   - Navigate to Quiz Generator page
   - Upload PDF or image of course content
   - AI processes and extracts content

2. **Generate Quiz**
   - Click "Generate Quiz" button
   - AI creates 10 personalized questions
   - Quiz displays immediately

3. **Take Quiz**
   - Answer questions one by one
   - Navigate with Previous/Next buttons
   - Submit when ready

4. **View Results**
   - See overall score
   - Review correct/incorrect answers
   - View detailed explanations
   - Check quiz history

5. **Additional Actions**
   - Regenerate new quiz from same material
   - Start new quiz with different material
   - View past quiz performance

## API Endpoints

### Quiz Upload
```
POST /api/quiz/upload
Content-Type: multipart/form-data

Response:
{
  "success": true,
  "course": {
    "id": "course_123...",
    "filename": "biology_chapter1.pdf",
    "timestamp": "2025-01-05T20:00:00Z"
  }
}
```

### Quiz Generation
```
POST /api/quiz/generate
Content-Type: application/json
Body: { "courseId": "course_123..." }

Response:
{
  "success": true,
  "quiz": {
    "id": "quiz_456...",
    "courseId": "course_123...",
    "questions": [
      {
        "id": 1,
        "type": "multiple_choice",
        "question": "What is photosynthesis?",
        "options": ["A", "B", "C", "D"]
      },
      {
        "id": 2,
        "type": "true_false",
        "question": "Plants need sunlight to grow."
      }
    ],
    "timestamp": "2025-01-05T20:05:00Z"
  }
}
```

### Quiz Submission
```
POST /api/quiz/submit
Content-Type: application/json
Body: {
  "quizId": "quiz_456...",
  "answers": {
    "1": "Option B",
    "2": "true"
  }
}

Response:
{
  "success": true,
  "result": {
    "quizId": "quiz_456...",
    "score": 8,
    "totalQuestions": 10,
    "percentage": 80,
    "correctCount": 8,
    "incorrectCount": 2,
    "detailedResults": [...]
  }
}
```

### Quiz History
```
GET /api/quiz/history

Response:
{
  "success": true,
  "history": [
    {
      "quizId": "quiz_456...",
      "courseName": "biology_chapter1.pdf",
      "score": 8,
      "percentage": 80,
      "timestamp": "2025-01-05T20:10:00Z"
    }
  ],
  "stats": {
    "totalCourses": 3,
    "totalQuizzes": 5,
    "totalResults": 10
  }
}
```

## Navigation

The application now has two main sections accessible via navigation:

1. **Exam Correction** (/) - Original functionality
   - Upload student exams
   - AI analysis and grading
   - PDF export

2. **Quiz Generator** (/quiz) - New functionality
   - Upload course materials
   - Generate quizzes
   - Take quizzes and track results

## Data Storage

- All quiz data is stored in memory
- Course content is preserved for regeneration
- Quiz results are tracked per quiz
- History available during session

## AI Models Used

- **Vision Model**: For extracting content from course materials
- **Analysis Model**: For generating quiz questions

## Future Enhancements

Potential improvements:
- Persistent storage (database)
- User accounts for personalized tracking
- Custom quiz length options
- Difficulty level selection
- Export quiz results to PDF
- Timed quiz mode
- Study recommendations based on performance
- Spaced repetition system

## Testing Recommendations

1. Test with various file formats (PDF, JPG, PNG)
2. Verify quiz generation with different content types
3. Test navigation between questions
4. Validate answer submission
5. Check score calculation accuracy
6. Test regenerate functionality
7. Verify history tracking
8. Test responsive design on mobile devices

## Troubleshooting

### Quiz not generating
- Check API key configuration
- Verify course content was extracted successfully
- Check browser console for errors

### Answers not saving
- Ensure JavaScript is enabled
- Check network tab for API errors
- Verify quiz ID is valid

### History not displaying
- Confirm quizzes were completed
- Check API endpoint is accessible
- Verify data format in response
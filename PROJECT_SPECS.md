# ASKGenix - Campus Recruitment Platform - Technical Specifications
askgenvishwa
## Project Overview
ASKGenix is a comprehensive web-based placement test platform designed for JNTUH UCES campus recruitment. The system provides separate portals for administrators and students with advanced test management, taking, and analytics capabilities.

---

## System Architecture

### Technology Stack
- **Frontend Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.2
- **Styling**: Tailwind CSS 3.4.1
- **Database**: Supabase (PostgreSQL)
- **Database Client**: @supabase/supabase-js 2.57.4
- **Icons**: Lucide React 0.344.0
- **State Management**: React Context API
- **Authentication**: Custom implementation with Supabase database

### Project Structure
```
src/
├── components/
│   └── admin/
│       ├── CreateTestModal.tsx       # Test creation interface
│       ├── EditTestModal.tsx         # Test editing interface
│       └── TestResultsModal.tsx      # Results viewing and CSV export
├── contexts/
│   └── AuthContext.tsx               # Authentication state management
├── lib/
│   └── supabase.ts                   # Supabase client configuration
├── pages/
│   ├── admin/
│   │   └── AdminDashboard.tsx        # Admin main interface
│   ├── student/
│   │   ├── StudentDashboard.tsx      # Student main interface
│   │   └── TakeTest.tsx              # Test taking interface
│   ├── Login.tsx                     # Login page
│   └── Signup.tsx                    # Student registration
├── App.tsx                           # Main application router
└── main.tsx                          # Application entry point
```

---

## Database Schema

### Tables

#### 1. users
Stores user account information for both students and administrators.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique user identifier |
| email | text | UNIQUE, NOT NULL | User email address |
| password_hash | text | NOT NULL | Hashed password (plain text in current implementation) |
| full_name | text | NOT NULL | User's full name |
| role | text | NOT NULL, DEFAULT 'student', CHECK (role IN ('admin', 'student')) | User role |
| created_at | timestamptz | DEFAULT now() | Account creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Unique constraint on `email`

**RLS Policies:**
- Users can read and update their own profile

---

#### 2. tests
Stores test metadata and configuration.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique test identifier |
| title | text | NOT NULL | Test title |
| description | text | NULL | Test description |
| duration_minutes | integer | NOT NULL, CHECK (duration_minutes > 0) | Test duration in minutes |
| total_marks | integer | NOT NULL, DEFAULT 0 | Total marks for the test |
| is_active | boolean | DEFAULT false | Whether test is visible to students |
| created_by | uuid | FOREIGN KEY → users(id) ON DELETE SET NULL | Admin who created the test |
| created_at | timestamptz | DEFAULT now() | Creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Index on `created_by`
- Index on `is_active`

**RLS Policies:**
- Admins can perform all operations
- Students can only view active tests

---

#### 3. questions
Stores questions for each test with options and correct answers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique question identifier |
| test_id | uuid | NOT NULL, FOREIGN KEY → tests(id) ON DELETE CASCADE | Associated test |
| question_text | text | NOT NULL | The question text |
| question_type | text | NOT NULL, CHECK (question_type IN ('mcq', 'multiple_correct')) | Question type |
| options | jsonb | NOT NULL | Array of option objects: [{id: string, text: string}] |
| correct_answers | jsonb | NOT NULL | Array of correct option IDs |
| marks | integer | NOT NULL, CHECK (marks >= 0) | Marks awarded for correct answer |
| order_index | integer | NOT NULL, DEFAULT 0 | Display order of question |
| created_at | timestamptz | DEFAULT now() | Creation timestamp |

**Indexes:**
- Primary key on `id`
- Index on `test_id`

**RLS Policies:**
- Admins can manage all questions
- Students can view questions of active tests only

---

#### 4. test_attempts
Tracks student test attempts and scores.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique attempt identifier |
| test_id | uuid | NOT NULL, FOREIGN KEY → tests(id) ON DELETE CASCADE | Test being attempted |
| user_id | uuid | NOT NULL, FOREIGN KEY → users(id) ON DELETE CASCADE | Student attempting |
| started_at | timestamptz | DEFAULT now() | When attempt started |
| submitted_at | timestamptz | NULL | When test was submitted |
| time_taken_seconds | integer | NULL | Actual time taken in seconds |
| score | integer | DEFAULT 0 | Score obtained |
| total_marks | integer | NOT NULL | Total marks of the test |
| status | text | NOT NULL, DEFAULT 'in_progress', CHECK (status IN ('in_progress', 'submitted', 'auto_submitted')) | Attempt status |
| created_at | timestamptz | DEFAULT now() | Creation timestamp |

**Indexes:**
- Primary key on `id`
- Index on `user_id`
- Index on `test_id`

**RLS Policies:**
- Admins can view all attempts
- Students can view, create, and update their own attempts

---

#### 5. attempt_answers
Stores individual answers for each question in an attempt.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique answer identifier |
| attempt_id | uuid | NOT NULL, FOREIGN KEY → test_attempts(id) ON DELETE CASCADE | Associated attempt |
| question_id | uuid | NOT NULL, FOREIGN KEY → questions(id) ON DELETE CASCADE | Question being answered |
| selected_answers | jsonb | NULL | Array of selected option IDs |
| is_correct | boolean | DEFAULT false | Whether answer is correct |
| marks_obtained | integer | DEFAULT 0 | Marks obtained for this question |
| created_at | timestamptz | DEFAULT now() | Creation timestamp |
| updated_at | timestamptz | DEFAULT now() | Last update timestamp |

**Constraints:**
- UNIQUE(attempt_id, question_id) - One answer per question per attempt

**Indexes:**
- Primary key on `id`
- Index on `attempt_id`

**RLS Policies:**
- Admins can view all answers
- Students can view, create, and update their own answers

---

## Features Specification

### Authentication System

#### Login
- Email and password-based authentication
- Plain text password comparison (for demo purposes)
- Session management via localStorage
- Automatic role-based routing

#### Signup
- Student registration with email, full name, and password
- Automatic role assignment as 'student'
- Email uniqueness validation
- Immediate login after successful registration

#### Session Management
- User ID stored in localStorage
- Session persists across page refreshes
- Logout clears localStorage and resets state

---

### Admin Portal Features

#### 1. Test Management Dashboard
- **View All Tests**: List of all tests with metadata
- **Create Test**: Modal-based test creation workflow
- **Edit Test**: Modify existing test details and questions
- **Delete Test**: Remove test with cascade deletion of all related data
- **Activate/Deactivate**: Toggle test visibility to students
- **Visual Status**: Active/Inactive badges on each test

#### 2. Test Creation Interface
**Basic Information:**
- Test title (required)
- Test description (optional)
- Duration in minutes (required, minimum 1)

**Question Management:**
- Add unlimited questions
- Remove individual questions
- For each question:
  - Question text (required)
  - Question type: Single Correct (MCQ) or Multiple Correct
  - 4 options per question (required)
  - Select correct answer(s) via radio/checkbox
  - Marks per question (required, minimum 1)
  - Order/sequence maintained automatically

**Validation:**
- All fields must be filled
- At least one question required
- At least one correct answer per question
- All options must have text

**Auto-calculation:**
- Total marks calculated from sum of all question marks

#### 3. Test Editing Interface
- Pre-loaded with existing test data
- Load existing questions from database
- Add new questions to existing test
- Delete questions (with database removal)
- Update question order
- Save changes updates both test and questions

#### 4. Results & Analytics Dashboard
**Results Table:**
- Student name and email
- Score and total marks
- Percentage with color coding (green ≥60%, red <60%)
- Time taken in minutes
- Status badge (Submitted/Auto Submitted)
- Actions: View detailed answers

**Detailed Answer View:**
- Question-by-question breakdown
- Shows selected vs correct answers
- Color coding:
  - Green: Correct answer
  - Red: Incorrect selected answer
  - Gray: Unselected answer
- Marks obtained per question

**CSV Export:**
- One-click download
- Includes: Name, Email, Score, Total, Percentage, Time, Status, Timestamps
- Filename: `{test_title}_results.csv`

---

### Student Portal Features

#### 1. Dashboard

**Active Tests Tab:**
- Display all active tests
- Test information:
  - Title and description
  - Duration in minutes
  - Total marks
  - Completion status badge
- For completed tests:
  - Display score and percentage
  - Prevent re-attempting
- Start Test button (disabled if already completed)

**Test History Tab:**
- Table view of all completed tests
- Columns:
  - Test name
  - Score (x/y format)
  - Percentage with color badge
  - Time taken
  - Status (Submitted/Auto Submitted)
  - Submission date
- Empty state for new users

#### 2. Test Taking Interface

**Header:**
- Test title
- Current question number (x of y)
- Answered count
- Countdown timer with color coding:
  - Blue: >10 minutes remaining
  - Orange: 5-10 minutes remaining
  - Red: <5 minutes remaining
- Submit Test button

**Time Warning:**
- Alert banner appears when <5 minutes remaining
- Warning message about auto-submit

**Question Display:**
- Question number badge
- Question text
- Question type indicator (for multiple correct)
- Marks value
- Option list with radio buttons (MCQ) or checkboxes (Multiple Correct)
- Selected options highlighted
- Check mark on selected options

**Navigation:**
- Previous/Next buttons
- Question number grid:
  - Blue: Current question
  - Green: Answered questions
  - Gray: Unanswered questions
  - Click any number to jump to that question

**Auto-Save:**
- Answers saved to database in real-time
- Persists if browser is closed
- Can resume in-progress test

**Timer Logic:**
- Counts down from test duration
- Updates every second
- Continues tracking even if browser closed (server-side start time)
- Auto-submits when reaches 0
- Cannot be paused or stopped

**Submission:**
- Manual: Click "Submit Test" button
- Automatic: When timer reaches 0
- Both trigger:
  - Calculate total score
  - Mark each answer as correct/incorrect
  - Calculate marks per question
  - Update attempt status
  - Record submission time and duration
  - Redirect to dashboard

---

## Technical Implementation Details

### Authentication Flow

```typescript
1. User enters credentials
2. Query users table for matching email
3. Compare password_hash field
4. If match:
   - Store user ID in localStorage
   - Set user state in AuthContext
   - Route to appropriate dashboard
5. If no match:
   - Display error message
```

### Test Taking Flow

```typescript
1. Student clicks "Start Test"
2. System checks for existing in-progress attempt
3. If exists: Resume from last saved state
4. If not: Create new attempt record with:
   - test_id
   - user_id
   - started_at (current timestamp)
   - status: 'in_progress'
5. Load all questions for test
6. Load existing answers (if resuming)
7. Calculate time remaining from started_at
8. Start countdown timer
9. On answer selection:
   - Update local state
   - Upsert to attempt_answers table
10. On submit (manual or auto):
    - Stop timer
    - Calculate score for each question
    - Update attempt with:
      - submitted_at
      - time_taken_seconds
      - score
      - status ('submitted' or 'auto_submitted')
    - Update all attempt_answers with is_correct and marks_obtained
    - Redirect to dashboard
```

### Scoring Algorithm

```typescript
For each question:
  1. Get user's selected answers (array of option IDs)
  2. Get correct answers from question record
  3. Sort both arrays for comparison
  4. Check if arrays are identical:
     - Length must match
     - All elements must match in sorted order
  5. If correct:
     - Award full marks for question
     - Set is_correct = true
  6. If incorrect:
     - Award 0 marks
     - Set is_correct = false
  7. Sum marks from all questions = total score
```

### CSV Export Implementation

```typescript
1. Format headers array
2. Map each result to row array with formatted values
3. Convert 2D array to CSV string with:
   - Comma-separated values
   - Quoted fields to handle commas in content
   - Newline-separated rows
4. Create Blob with CSV content
5. Create temporary download link
6. Trigger download with formatted filename
7. Clean up temporary link
```

---

## Security Specifications

### Row Level Security (RLS)

All tables have RLS enabled with the following policies:

**users:**
- Users can read and update only their own profile
- No public insert (registration handled separately)

**tests:**
- Admins: Full CRUD access
- Students: Read access to active tests only

**questions:**
- Admins: Full CRUD access
- Students: Read access to questions of active tests only

**test_attempts:**
- Admins: Read access to all attempts
- Students: Full access to their own attempts only

**attempt_answers:**
- Admins: Read access to all answers
- Students: Full access to their own answers only

### Data Validation

**Client-Side:**
- Required field validation
- Email format validation
- Minimum value constraints
- Array length validation

**Database-Side:**
- NOT NULL constraints
- CHECK constraints on enums
- CHECK constraints on numeric ranges
- Foreign key constraints
- Unique constraints

### Data Integrity

**Cascade Deletes:**
- Deleting test → deletes all questions, attempts, and answers
- Deleting user → deletes all their attempts and answers
- Deleting attempt → deletes all related answers

**Referential Integrity:**
- All foreign keys enforced
- ON DELETE CASCADE for dependent records
- ON DELETE SET NULL for optional references (e.g., test creator)

---

## Performance Considerations

### Database Indexes
- Primary key indexes on all tables
- Foreign key indexes for joins
- Commonly queried fields (is_active, user_id, test_id)

### Query Optimization
- Use of `maybeSingle()` for 0-or-1 results
- Selective column fetching with `select()`
- Proper use of `order()` clauses
- Batched operations where possible

### Frontend Optimization
- Component-based architecture for reusability
- Conditional rendering to minimize DOM updates
- Debouncing not needed (Supabase handles rate limiting)
- Loading states for async operations

---

## Edge Cases Handled

### Timer & Submission
1. **Browser closure during test**: Time continues server-side, can resume
2. **Timer expiration**: Automatic submission with status 'auto_submitted'
3. **Network failure during answer save**: Uses Supabase retry logic
4. **Multiple rapid submissions**: Prevented by setting submitting state
5. **Time manipulation**: Server-side time calculation from started_at

### Test Management
1. **Deleting test with attempts**: Cascade delete ensures data consistency
2. **Editing test with in-progress attempts**: Only metadata updated, not questions
3. **Deactivating test during student attempt**: Student can complete
4. **Zero questions in test**: Validation prevents creation

### User Experience
1. **Unanswered questions**: Counted as incorrect, 0 marks
2. **Navigating away from test**: Answers preserved via auto-save
3. **Duplicate email registration**: Database constraint prevents, error shown
4. **Invalid credentials**: Generic error message for security
5. **Empty test results**: Appropriate empty states shown

---

## Limitations & Future Enhancements

### Current Limitations
1. **Authentication**: Plain text passwords (not production-ready)
2. **Single attempt**: Students can only attempt each test once
3. **No question bank**: Questions created per-test, no reusability
4. **Limited question types**: Only MCQ and multiple correct
5. **No negative marking**: Incorrect answers score 0
6. **No test scheduling**: Tests are either active or inactive
7. **No email notifications**: No automated communications
8. **No proctoring**: No monitoring during test

### Potential Enhancements
1. Password hashing with bcrypt or Supabase Auth
2. Multiple attempt support with best score tracking
3. Question bank with tagging and categories
4. Additional question types (fill-in-blank, essay, coding)
5. Configurable marking schemes (negative marking, partial credit)
6. Schedule tests with start/end dates and times
7. Email notifications for test activation and results
8. Webcam proctoring and browser lockdown
9. Analytics dashboard with charts and graphs
10. Bulk student import via CSV
11. Test templates and duplication
12. Question difficulty levels and adaptive testing
13. Mobile app for students
14. Real-time test monitoring for admins
15. Detailed reports and certificates

---

## Environment Variables

Required in `.env` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Deployment Specifications

### Build Process
```bash
npm install          # Install dependencies
npm run build        # Build for production
```

### Output
- Static files in `dist/` directory
- Single-page application
- Pre-rendered HTML with asset hashing

### Hosting Requirements
- Static file hosting (Netlify, Vercel, etc.)
- Client-side routing support
- HTTPS required for Supabase connection

### Database Requirements
- PostgreSQL 12+ (provided by Supabase)
- Row Level Security support
- JSONB data type support
- UUID generation support

---

## Browser Compatibility

### Supported Browsers
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

### Required Features
- ES6+ JavaScript support
- localStorage API
- Fetch API
- CSS Grid and Flexbox
- WebSocket (for Supabase realtime, if needed)

---

## Testing Recommendations

### Unit Testing
- Authentication context functions
- Scoring algorithm
- CSV export generation
- Timer calculations

### Integration Testing
- Login/Signup flows
- Test creation and editing
- Test taking complete flow
- Results viewing and export

### End-to-End Testing
- Admin creates test → Student takes test → Admin views results
- Timer expiration and auto-submit
- Resume in-progress test
- Multiple concurrent users

### Security Testing
- RLS policy enforcement
- SQL injection prevention (handled by Supabase)
- XSS prevention (handled by React)
- CSRF protection

---

## Maintenance & Monitoring

### Recommended Monitoring
- Database connection health
- Query performance (slow queries)
- Error rates and types
- User session durations
- Test completion rates

### Backup Strategy
- Automatic Supabase backups (built-in)
- Export critical data periodically
- Version control for database migrations

### Update Strategy
- Regular dependency updates
- Database migration versioning
- Feature flags for gradual rollout
- Staging environment for testing

---

## Accessibility Considerations

### Current Implementation
- Semantic HTML structure
- Form labels for all inputs
- Button descriptions
- Keyboard navigation support (native browser)
- Color contrast for readability

### Recommended Improvements
- ARIA labels for complex components
- Screen reader announcements for timer
- Focus management during navigation
- Skip to content links
- High contrast mode support

---

## License & Credits

This project is built for educational purposes for JNTUH UCES.

**Technologies Used:**
- React & TypeScript
- Vite
- Tailwind CSS
- Supabase
- Lucide React

---

**Document Version**: 1.0
**Last Updated**: 2025-10-30
**Project Status**: Production Ready (with noted limitations)
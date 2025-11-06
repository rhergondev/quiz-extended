# Quiz Extended

Tutor LMS extension for advanced questionnaires with risk-based scoring and comprehensive analytics.

## Features

- 📝 **Advanced Quiz Creation**: Create custom quizzes with multiple question types
- 🎯 **Risk-Based Scoring**: Optional risk-taking system that penalizes incorrect answers unless marked as "risky"
- 📊 **Comprehensive Analytics**: Track student performance, quiz statistics, and progress
- 🏆 **Ranking System**: Course-based rankings with fake user generation for testing
- 🔒 **Security Features**: Audit logging, rate limiting, and permission management
- 📱 **React-Powered Admin**: Modern admin interface built with React

## Version 2.0 - Base 10 Scoring System ⚡

**IMPORTANT CHANGE**: Starting from version 2.0, the scoring system works internally in **0-10 scale**.

### What Changed?

- **Database Storage**: Scores are now stored as 0-10 (e.g., 7.5 instead of 75)
- **API Responses**: Backend returns scores in 0-10 format
- **Display Format**: User can choose between:
  - **Base 10** (0-10): Shows scores directly (e.g., 7.5)
  - **Percentage** (0-100%): Multiplies by 10 for display (e.g., 75%)

### Migration

If you're upgrading from an older version with scores in 0-100:

1. **Backup your database** before proceeding
2. Read the migration guide: [`MIGRATION_TO_BASE10.md`](./MIGRATION_TO_BASE10.md)
3. Run the SQL conversion scripts provided
4. Optional: Run `php migrate-passing-scores.php` to update passing scores

### Documentation

- 📖 **Complete Score System Guide**: [`SCORE_SYSTEM.md`](./SCORE_SYSTEM.md)
- 🔄 **Migration Instructions**: [`MIGRATION_TO_BASE10.md`](./MIGRATION_TO_BASE10.md)
- 📊 **Enrollment System**: [`ENROLLMENT_SYSTEM.md`](./ENROLLMENT_SYSTEM.md)

## Installation

1. Upload the `quiz-extended` folder to `/wp-content/plugins/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Ensure Tutor LMS is installed and activated
4. Configure quiz settings from the admin panel

## Development

### Building the React Admin App

```bash
cd admin/react-app
npm install
npm run build
```

### File Structure

```
quiz-extended/
├── admin/                       # Admin interface
│   ├── react-app/              # React application
│   │   ├── src/
│   │   │   ├── contexts/       # React contexts (ScoreFormatContext, etc.)
│   │   │   ├── components/     # React components
│   │   │   ├── pages/          # Page components
│   │   │   └── api/            # API service layer
│   │   └── build/              # Compiled assets
├── includes/
│   ├── api/                    # REST API endpoints
│   │   ├── class-qe-quiz-attempts-api.php
│   │   ├── class-qe-course-ranking-api.php
│   │   └── ...
│   ├── post-types/             # Custom post types (Quiz, Question, etc.)
│   ├── security/               # Security features
│   └── templates/              # Template files
├── languages/                  # Translations
├── SCORE_SYSTEM.md            # Score system documentation
├── MIGRATION_TO_BASE10.md     # Migration guide
└── README.md                  # This file
```

## API Endpoints

### Quiz Attempts

- `POST /wp-json/qe/v1/quiz-attempts/start` - Start a quiz attempt
- `POST /wp-json/qe/v1/quiz-attempts/submit` - Submit quiz attempt
- `GET /wp-json/qe/v1/quiz-attempts/{id}` - Get attempt details
- `GET /wp-json/qe/v1/my-quiz-attempts` - Get user's quiz attempts

### Rankings

- `GET /wp-json/qe/v1/course-ranking/{course_id}` - Get course rankings
- `POST /wp-json/qe/v1/feedback-rankings/quiz/{quiz_id}` - Populate fake rankings

### Questions

- `GET /wp-json/qe/v1/questions` - List questions
- `POST /wp-json/qe/v1/questions/batch` - Get questions by IDs

### Enrollments

- `POST /wp-json/qe/v1/enrollments` - Enroll user in course
- `GET /wp-json/qe/v1/enrollments/user` - Get user enrollments

## Scoring System

### How It Works (Version 2.0)

1. **Question Scoring**: Each question is worth 1 point
2. **Correct Answer**: +1 point
3. **Incorrect Answer**: -1/n points (where n = number of options)
   - **Without Risk**: Penalty applies
   - **With Risk**: No penalty (risky guess)
4. **Unanswered**: 0 points (no penalty)

### Example

Quiz with 10 questions, 4 options each:

- Answer 7 correctly: +7 points
- Answer 2 incorrectly (not risked): -0.5 points (2 × 0.25)
- Leave 1 unanswered: 0 points
- **Score without risk**: (7 - 0.5) / 10 × 10 = **6.5**
- If those 2 were risked: 7 / 10 × 10 = **7.0**

### Score Format Context

Users can switch between formats using `ScoreFormatContext`:

```javascript
import { useScoreFormat } from "@contexts/ScoreFormatContext";

function MyComponent() {
  const { format, setFormat, formatScore, toBase10 } = useScoreFormat();

  // Display score (receives 0-10, outputs based on format)
  const displayValue = formatScore(7.5); // "7.5" or "75"

  // Convert user input to storage format
  const storageValue = toBase10(75); // 7.5 (if in percentage mode)
}
```

## Testing

### Run Quiz Tests

```bash
# Test quiz creation and submission
php test-enrollments.php

# Verify permissions
php test-admin-permissions.php

# Check API routes
php quick-api-check.php
```

### Frontend Testing

1. Create a test quiz with 10 questions
2. Set passing score to 7.0 (70%)
3. Take the quiz:
   - Answer 8 correctly
   - Answer 1 incorrectly (not risked)
   - Answer 1 incorrectly (risked)
4. Verify final scores:
   - Score without risk: 7.75 (8 - 0.25)
   - Score with risk: 8.0

## Troubleshooting

### Scores Display Issues

**Problem**: Scores show as 0.X instead of X.X

**Solution**: Check that backend API is returning scores in 0-10:

```bash
tail -f wp-content/debug.log | grep "score"
```

### Import Issues

**Problem**: Imported quiz attempts show wrong scores

**Solution**: Verify your import data is in 0-10 scale. If your data is in 0-100, divide by 10:

```php
$correct_score = $imported_score / 10;
```

See [`SCORE_SYSTEM.md`](./SCORE_SYSTEM.md) for detailed import instructions.

### Frontend Not Updating

**Problem**: Changes not reflected after editing code

**Solution**: Rebuild the React app:

```bash
cd admin/react-app
npm run build
```

Clear WordPress cache if using caching plugins.

## License

This plugin is proprietary software. All rights reserved.

## Support

For issues, questions, or feature requests, please contact the development team.

## Changelog

### Version 2.0.0 (November 2025)

- 🎯 **Major Change**: Migrated to Base 10 (0-10) scoring system
- 📊 Inverted ScoreFormatContext logic for cleaner architecture
- 🔧 Updated all backend APIs to return scores in 0-10
- 📖 Added comprehensive documentation (SCORE_SYSTEM.md, MIGRATION_TO_BASE10.md)
- 🛠️ Added migration script for passing scores
- ⚡ Improved quiz question loading for imported data
- 🐛 Fixed title/category display in quiz editor
- ♻️ Removed unnecessary ranking API calls

### Version 1.0.0

- Initial release
- Risk-based scoring system
- React admin interface
- Course rankings
- Student progress tracking

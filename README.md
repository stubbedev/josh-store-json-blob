# Josh Store JSON Blob

Express server to store JSON blobs keyed by session UUID in MongoDB.

## Features

- Store arbitrary JSON data with UUID session identifiers
- MongoDB persistence with automatic indexing
- Health check endpoint for monitoring
- CORS enabled for all origins
- Method enforcement (POST only for data endpoints)
- UUID validation
- Comprehensive JSDoc documentation

## Prerequisites

- Node.js (v14 or higher)
- MongoDB instance (local or remote)

## Installation

```bash
npm install
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://mongo:27017/jsonblobs` |

## Usage

### Starting the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start

# With custom environment variables
PORT=8080 MONGO_URI=mongodb://localhost:27017/mydb npm start
```

### Docker Deployment

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## API Endpoints

### Health Check

Check server and database connectivity.

```bash
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "mongo": "connected",
  "uptime": 123.456
}
```

### Store JSON Blob

Store a JSON blob with a session UUID.

```bash
POST /:sessionId
Content-Type: application/json

{
  "your": "data",
  "goes": "here"
}
```

**Parameters:**
- `sessionId` (path) - Valid UUID (e.g., `550e8400-e29b-41d4-a716-446655440000`)

**Request Body:**
- Any valid JSON object

**Success Response (201):**
```json
{
  "message": "Log stored successfully",
  "id": "507f1f77bcf86cd799439011",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2025-12-23T10:30:00.000Z"
}
```

**Error Responses:**
- `400` - Invalid session ID format
- `405` - Method not allowed (only POST accepted)
- `500` - Internal server error

### Example Usage

```bash
# Store a log entry
curl -X POST http://localhost:3000/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "event": "user_login",
    "timestamp": "2025-12-23T10:30:00Z",
    "userId": 12345
  }'

# Check health
curl http://localhost:3000/health
```

## CORS Configuration

The server is configured to accept requests from any origin with the following headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization`

## Data Export

When SSH'd onto the server, you can export all data from MongoDB using the provided script.

### Export Script Usage

```bash
# Basic usage (connects to default MongoDB instance)
node scripts/export-all-data.js

# With custom MongoDB URI
MONGO_URI=mongodb://localhost:27017/jsonblobs node scripts/export-all-data.js

# Custom output directory
OUTPUT_DIR=/tmp/exports node scripts/export-all-data.js

# Full example with all options
MONGO_URI=mongodb://mongo:27017/jsonblobs \
OUTPUT_DIR=/home/user/backups \
node scripts/export-all-data.js
```

### Export Output

The script creates multiple export formats:

1. **JSON Array** - `exports/all-data-YYYY-MM-DD.json`
   - All records in a single JSON array
   - Pretty-printed for readability

2. **NDJSON** - `exports/all-data-YYYY-MM-DD.ndjson`
   - Newline-delimited JSON
   - One record per line
   - Ideal for streaming/processing

3. **By Session** - `exports/by-session/{sessionId}.json`
   - Individual JSON files per session
   - Groups all logs for each session together

### Export Statistics

The script displays:
- Total number of records
- Number of unique sessions
- Total data size in MB
- Date range of stored data

**Example output:**
```
=== Statistics ===
Total records: 1234
Unique sessions: 56
Total data size: 2.45 MB
Date range: 2025-12-01T00:00:00.000Z to 2025-12-23T10:30:00.000Z
==================
```

## Database Schema

### Log Document

```javascript
{
  sessionId: String,    // UUID - indexed
  data: Mixed,          // Any JSON data
  createdAt: Date      // Auto-generated timestamp
}
```

## Development

The codebase uses JSDoc for inline documentation. All functions, routes, and schemas are documented with:
- Parameter types
- Return types
- Route information
- Error responses

## License

ISC

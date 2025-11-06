# CodeVisualizer

A web application that analyzes uploaded codebases and creates interactive visualizations of code architecture, dependencies, and relationships.

## Features

- **File Upload**: Upload code files directly or analyze GitHub repositories
- **Multi-language Support**: Supports JavaScript, TypeScript, Python, Java, C++, and more
- **Architecture Analysis**: Automatically parse codebase structure and dependencies
- **Interactive Visualizations**: Generate dynamic diagrams showing:
  - Dependency graphs
  - Call hierarchies
  - Component relationships
  - Complexity metrics
- **Code Insights**: Get detailed metrics about maintainability and refactoring opportunities

## Tech Stack

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Dropzone** for file uploads
- **Vitest** for testing

### Backend
- **Express.js** with TypeScript
- **Multer** for file upload handling
- **CORS** for cross-origin requests
- **Jest** for testing

### Shared
- **TypeScript** types shared between frontend and backend
- **Common utilities** for file processing and analysis

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/CodeVisualizer.git
cd CodeVisualizer
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install backend dependencies:
```bash
cd ../backend
npm install
```

4. Set up environment variables:
```bash
# In the backend directory
cp .env.example .env

# In the frontend directory
cd ../frontend
cp .env.example .env.local
```

### Development

Start the development servers:

1. **Backend** (runs on http://localhost:3001):
```bash
cd backend
npm run dev
```

2. **Frontend** (runs on http://localhost:3000):
```bash
cd frontend
npm run dev
```

### Testing

Run tests for both frontend and backend:

```bash
# Frontend tests
cd frontend
npm test

# Backend tests
cd backend
npm test

# Run tests with coverage
npm run test:coverage
```

### Building for Production

1. **Backend**:
```bash
cd backend
npm run build
npm start
```

2. **Frontend**:
```bash
cd frontend
npm run build
npm start
```

## Project Structure

```
CodeVisualizer/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # Next.js app router pages
│   │   └── components/      # React components
│   │       ├── ui/          # Reusable UI components
│   │       └── upload/      # File upload components
│   ├── __tests__/           # Frontend tests
│   └── package.json
├── backend/                 # Express.js backend API
│   ├── src/
│   │   ├── parsers/         # Code parsing logic
│   │   ├── __tests__/       # Backend tests
│   │   └── app.ts           # Main server file
│   └── package.json
├── shared/                  # Shared TypeScript types and utilities
│   ├── types/               # Type definitions
│   └── utils/               # Common utilities
├── .gitignore
└── README.md
```

## API Endpoints

### File Upload
- `POST /api/upload` - Upload code files for analysis
- `POST /api/analyze-github` - Analyze a GitHub repository by URL

### Analysis
- `POST /api/analyze` - Start code analysis on uploaded files
- `GET /api/analysis/:id` - Get analysis results by ID

### Health Check
- `GET /health` - Server health status

## Usage

1. **Upload Files**:
   - Visit http://localhost:3000
   - Upload code files using drag-and-drop or file picker
   - Alternatively, enter a GitHub repository URL

2. **Analysis**:
   - Click "Upload and Analyze" or "Analyze Repository"
   - The system will parse your code and extract:
     - Function definitions
     - Class structures
     - Import/export relationships
     - Dependency mappings

3. **Visualizations** (Coming Soon):
   - Interactive dependency graphs
   - Architecture tree views
   - Complexity heatmaps
   - File structure diagrams

## Supported File Types

- **JavaScript**: .js, .jsx
- **TypeScript**: .ts, .tsx
- **Python**: .py
- **Java**: .java
- **C/C++**: .c, .cpp
- **C#**: .cs
- **PHP**: .php
- **Ruby**: .rb
- **Go**: .go
- **Rust**: .rs
- **Kotlin**: .kt
- **Swift**: .swift
- **Dart**: .dart
- **Scala**: .scala
- **Configuration**: .json, .xml, .yaml, .yml

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and add tests
4. Run tests: `npm test`
5. Commit your changes: `git commit -am 'Add some feature'`
6. Push to the branch: `git push origin feature/your-feature`
7. Submit a pull request

## Development Roadmap

### Phase 1 (Current)
- [x] Basic project setup
- [x] File upload functionality
- [x] Basic code parsing
- [x] REST API endpoints
- [x] Test infrastructure

### Phase 2 (Next)
- [ ] Enhanced code parsing for more languages
- [ ] Real-time analysis progress
- [ ] Database integration for analysis storage
- [ ] GitHub API integration for repository cloning

### Phase 3 (Future)
- [ ] Interactive visualization components
- [ ] Multiple visualization types
- [ ] Export functionality
- [ ] User accounts and project management
- [ ] Collaborative features

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with Next.js and Express.js
- Uses React Dropzone for file uploads
- Inspired by code analysis tools like Sourcetrail and Understand
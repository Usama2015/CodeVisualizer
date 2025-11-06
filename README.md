# CodeVisualizer

A powerful web application for visualizing and analyzing code structure, dependencies, and architecture patterns. Built with Next.js and React, CodeVisualizer helps developers understand complex codebases through interactive visualizations.

## Features

### Core Capabilities
- **Code Analysis**: Deep analysis of code structure, complexity, and patterns
- **Dependency Visualization**: Interactive graphs showing module and file dependencies
- **Architecture Mapping**: Visual representation of system architecture and service relationships
- **Metrics Dashboard**: Comprehensive code metrics including complexity, lines of code, and maintainability scores
- **File Tree Explorer**: Navigate and explore project structure visually

### Visualization Types
- **Dependency Graphs**: 2D and 3D interactive dependency visualizations
- **Service Maps**: Visual service architecture diagrams
- **Call Hierarchy**: Function and method call relationships
- **Complexity Heatmaps**: Visual representation of code complexity
- **Architecture Patterns**: Identification and visualization of design patterns

## Tech Stack

### Frontend
- **Framework**: Next.js 15.5 with TurboPack
- **Language**: TypeScript
- **UI Library**: React 19.1
- **Styling**: Tailwind CSS v4
- **3D Graphics**: Three.js with React Three Fiber
- **Data Visualization**: D3.js, Recharts, React Flow
- **Testing**: Vitest with React Testing Library

### Key Dependencies
- `@react-three/fiber` & `@react-three/drei` - 3D visualizations
- `d3` - Data-driven visualizations
- `reactflow` - Interactive node-based graphs
- `recharts` - Chart components
- `react-dropzone` - File upload handling
- `lucide-react` - Icon library

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone git@github.com:Usama2015/CodeVisualizer.git
cd CodeVisualizer/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Available Scripts

```bash
# Development
npm run dev          # Start development server with TurboPack

# Testing
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
npm run test:ui      # Open Vitest UI
npm run test:integration # Run integration tests
npm run test:all     # Build and run all tests

# Build & Production
npm run build        # Build for production
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
```

## Project Structure

```
frontend/
├── __tests__/           # Test files
│   ├── components/      # Component tests
│   └── integration/     # Integration tests
├── components/          # React components
│   ├── analysis/        # Analysis result components
│   ├── ui/             # Reusable UI components
│   ├── upload/         # File upload components
│   └── visualizations/ # Visualization components
│       └── components/ # Sub-visualization components
├── lib/                # Utility functions and configs
├── src/                # Next.js app directory
│   └── app/            # App router pages
└── public/             # Static assets
```

## Key Components

### Visualizations
- **EnhancedDependencyGraph**: Advanced dependency visualization with clustering
- **ServiceMap3D/ServiceMap2D**: 3D and 2D service architecture views
- **CodeMetricsDashboard**: Comprehensive metrics display
- **FileTreeExplorer**: Interactive file structure navigation
- **ArchitecturePatterns**: Pattern detection and visualization

### Core Features
- **FileUpload**: Drag-and-drop file/folder upload
- **AnalysisResults**: Display analysis outcomes
- **VisualizationProvider**: Context provider for visualization state
- **VisualizationControls**: Interactive controls for visualizations

## Testing

The project includes comprehensive test coverage:

- **Unit Tests**: Component-level testing
- **Integration Tests**: Full workflow testing
- **API Tests**: Endpoint testing
- **UI Tests**: User interaction testing

Run tests with:
```bash
npm run test              # Run all tests
npm run test:coverage     # Generate coverage report
npm run test:integration  # Run integration tests only
```

## Configuration

Key configuration files:
- `vitest.config.ts` - Test configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `next.config.js` - Next.js configuration

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Author

**Usama2015**

## Acknowledgments

- Built with Next.js and React
- Visualization powered by D3.js and Three.js
- UI components styled with Tailwind CSS

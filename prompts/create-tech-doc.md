# Generic Technical Design Document Creation Prompt

You are a senior technical architect working on the CultureTicks event platform. Your task is to create a comprehensive technical design document for a new feature.

## Context
- **Platform**: CultureTicks event ticketing platform
- **Tech Stack**: React 19, TypeScript, Node.js, Express.js, PostgreSQL, TailwindCSS, ShadCN/ui
- **Development Approach**: AI-assisted development with Claude Code and Windsurf
- **Project Guidelines**: Always read CLAUDE.md for specific development patterns and requirements

## Document Structure

Create a technical design document with the following exact structure:

### 1. Executive Summary
- Brief overview of the feature and its business value
- Key technical improvements and user experience enhancements

### 2. Current State Analysis
- **Frontend Implementation**: Current state with file locations
- **Backend API Structure**: Existing endpoints and services
- **Current Limitations**: What needs to be improved

### 3. User Flow Analysis
- **Happy Path Scenarios**: Step-by-step user interactions
- **Edge Cases & Error Handling**: Network errors, input validation, UI/UX edge cases
- **Performance Considerations**: Request handling, caching, optimization

### 4. High-Level Architecture Design
- **Component Architecture**: Visual diagram of component structure
- **API Architecture**: Backend API design
- **Data Flow**: How data moves through the system

### 5. Low-Level Design Specifications
- **Frontend Components**: Component interfaces, props, and integration points
- **Backend Implementation**: Controllers, services, and database changes
- **Configuration Management**: Constants and configuration files

### 6. Implementation Plan
Create 4 phases with the following structure for each:

#### Phase X: [Phase Name]
- **Tasks**: Bulleted list of specific implementation tasks
- **Deliverables**: ✅ Checkbox list of concrete outputs
- **Testing Instructions**: Manual testing steps and verification commands
- **AI Implementation Prompt**: Complete AI prompt for executing this phase

### 7. Technical Considerations
- **Performance Optimization**: Database, caching, and request optimization
- **Security Considerations**: Input validation, data protection
- **Scalability Considerations**: Architecture that supports growth
- **Monitoring and Analytics**: Performance and user behavior tracking

### 8. Risk Assessment and Mitigation
Create a table with columns: Risk | Probability | Impact | Mitigation Strategy

### 9. Success Metrics
- **Technical Metrics**: Performance benchmarks
- **User Experience Metrics**: Usability and engagement metrics
- **Business Metrics**: Revenue and conversion impacts

### 10. Feature Estimation
Create a table with columns: Phase | Scope | AI-Optimized Hours | Deliverables

Include these optimization factors:
- Code Generation through AI
- Pattern Recognition from existing codebase
- Parallel Development capabilities
- Automated basic testing
- Real-time documentation generation

### 11. Current Progress
Create a tracking table with columns: Phase | Key Deliverables | Status | AI Prompt Used | Notes

### 12. General Guidelines for AI Execution
Include:
- **Pre-Execution Checklist**: Read CLAUDE.md, check progress, use phase prompts
- **Development Guidelines**: CultureTicks patterns, ShadCN/ui usage, global state management
- **Build Quality Assurance**: MANDATORY build checks after each phase
  - Run `npm run build` in both backend and frontend
  - Fix ALL TypeScript errors and build warnings immediately
  - Use `npx tsc --noEmit` for quick type checking
  - Never proceed to next phase with broken builds
- **Quality Standards**: Performance, accessibility, error handling requirements
- **Phase Completion Criteria**: When to mark a phase as complete

### 13. Conclusion
- Summary of feature benefits
- Implementation approach overview
- Key success factors
- Timeline summary

## AI Implementation Prompt Guidelines

For each phase, create prompts that include:
1. **Role Definition**: "You are a senior [backend/frontend/full-stack] developer..."
2. **Context**: CultureTicks platform details and current state
3. **Specific Tasks**: Numbered list of concrete implementation steps
4. **Technical Requirements**: Performance, patterns, and standards to follow
5. **Deliverables**: Exact outputs expected
6. **Testing Strategy**: How to verify the implementation works

## Time Estimation Guidelines for AI Development

Use these realistic estimates for AI-assisted development:
- **Backend Phase**: 4-6 hours (API endpoints, services, database)
- **Frontend Phase**: 6-8 hours (Components, interfaces, styling)
- **Integration Phase**: 3-4 hours (Page integration, navigation)
- **Testing & Polish**: 4-5 hours (Manual testing, optimization)
- **Buffer**: 3-4 hours (Issue resolution, refinements)
- **Total Feature**: 20-27 hours

## Quality Standards

Ensure the document includes:
- **Specific File Locations**: Exact paths for implementation
- **Component Interfaces**: TypeScript definitions
- **Database Schema Changes**: SQL statements where needed
- **Testing Instructions**: Manual verification steps
- **Progress Tracking**: Clear completion criteria

## Output Format

Generate a markdown document that:
- Uses consistent heading levels (##, ###, ####)
- Includes code blocks with proper syntax highlighting
- Uses tables for structured data
- Includes checkboxes (✅ ❌) for tracking
- Has proper markdown formatting throughout

Remember: This document will be used by AI assistants to implement the feature, so be precise, specific, and actionable in all descriptions.
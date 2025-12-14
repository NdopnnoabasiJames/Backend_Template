# Contributing to NestJS Auth Starter

First off, thank you for considering contributing to NestJS Auth Starter! It's people like you that make this template better for everyone.

## Code of Conduct

This project and everyone participating in it is governed by our commitment to providing a welcoming and inclusive environment. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (code snippets, configuration files, etc.)
- **Describe the behavior you observed and what you expected**
- **Include screenshots** if relevant
- **List your environment** (Node version, MongoDB version, OS, etc.)

**Bug Report Template:**
```markdown
## Bug Description
A clear description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Run command '...'
3. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
- Node.js version:
- MongoDB version:
- OS:
- Package version:

## Additional Context
Any other relevant information.
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the proposed enhancement
- **Explain why this enhancement would be useful**
- **List any alternatives you've considered**

### Pull Requests

1. **Fork the repository** and create your branch from `main`:
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Make your changes**:
   - Follow the existing code style
   - Write clear, descriptive commit messages
   - Add tests if applicable
   - Update documentation as needed

3. **Test your changes**:
   ```bash
   npm run lint
   npm run format
   npm run test
   ```

4. **Commit your changes**:
   ```bash
   git commit -m "feat: add amazing new feature"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/my-new-feature
   ```

6. **Open a Pull Request**

## Development Setup

1. **Clone your fork:**
   ```bash
   git clone https://github.com/your-username/nestjs-auth-starter.git
   cd nestjs-auth-starter
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. **Start MongoDB:**
   ```bash
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Run the development server:**
   ```bash
   npm run start:dev
   ```

## Code Style

This project uses:
- **Prettier** for code formatting
- **ESLint** for code linting
- **TypeScript** for type safety

### Code Formatting

Run before committing:
```bash
npm run format
npm run lint
```

### Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation only changes
- `style:` Code style changes (formatting, semicolons, etc.)
- `refactor:` Code refactoring without feature changes
- `perf:` Performance improvements
- `test:` Adding or updating tests
- `chore:` Maintenance tasks, dependency updates

**Examples:**
```
feat: add support for PostgreSQL database
fix: resolve JWT token expiration issue
docs: update README with Docker instructions
refactor: extract OTP logic into separate service
```

## Project Structure Guidelines

When adding new features:

1. **Follow the modular pattern**:
   ```
   src/
   └── feature-name/
       ├── feature.module.ts
       ├── feature.service.ts
       ├── feature.controller.ts
       ├── dto/
       │   └── create-feature.dto.ts
       └── schemas/
           └── feature.schema.ts
   ```

2. **Use dependency injection** properly
3. **Add proper validation** to DTOs
4. **Handle errors** with appropriate HTTP exceptions
5. **Document complex logic** with comments

## Testing

- Write unit tests for services
- Write e2e tests for controllers
- Ensure tests pass before submitting PR:
  ```bash
  npm run test
  npm run test:e2e
  ```

## Documentation

- Update README.md if you change functionality
- Update ONBOARDING.md for architectural changes
- Add JSDoc comments for complex functions
- Include code examples for new features

## What to Contribute

### Good First Issues

Look for issues labeled `good first issue` - these are perfect for newcomers.

### Priority Areas

- **Tests**: Improving test coverage
- **Documentation**: Better examples, tutorials, guides
- **Features**: New authentication providers, notification channels
- **Performance**: Optimization improvements
- **Security**: Security enhancements and fixes

### Not Accepting

- Breaking changes without discussion
- Features that add significant dependencies
- Product-specific implementations
- Changes that reduce template flexibility

## Questions?

Feel free to open a GitHub issue with your question or reach out to the maintainers.

## Recognition

Contributors will be recognized in the README.md file.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for helping make this template better!

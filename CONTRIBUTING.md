# Contributing to `masonry-snap-grid-layout`

Thanks for your interest in contributing! We welcome bug reports, feature requests, and pull requests. Please follow these guidelines to ensure a smooth collaboration.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [How to Contribute](#how-to-contribute)
3. [Bug Reports](#bug-reports)
4. [Feature Requests](#feature-requests)
5. [Pull Requests](#pull-requests)
6. [Development Setup](#development-setup)
7. [Testing](#testing)
8. [Code Style](#code-style)

---

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md). We expect all contributors to maintain a friendly and inclusive environment.

---

## How to Contribute

There are several ways to contribute:

* Report bugs or issues
* Suggest new features or improvements
* Fix bugs or implement features via pull requests
* Improve documentation or examples

---

## Bug Reports

When reporting a bug, please include:

* A clear **description** of the problem
* Steps to **reproduce** the issue
* The **expected** behavior vs. **actual** behavior
* Screenshots or code snippets if applicable
* Your environment details (Node version, browser, OS)

Create a new issue in the [GitHub Issues](https://github.com/yourusername/masonry-snap-grid-layout/issues) section.

---

## Feature Requests

When requesting a new feature, please include:

* A clear **description** of the feature
* **Use cases** and why it’s needed
* Examples or mockups if applicable

Feature requests should also be submitted as GitHub Issues.

---

## Pull Requests

Before submitting a PR:

1. Fork the repository.
2. Create a new branch with a descriptive name (e.g., `fix/resize-bug` or `feat/virtualization`).
3. Make your changes following the code style and project conventions.
4. Run all tests to ensure nothing is broken.
5. Ensure your code passes linting and formatting.
6. Submit a pull request against the `main` branch.

PR Description should include:

* Purpose of the PR
* What changes were made
* Any related issues (`Fixes #123`)
* Screenshots or examples if relevant

---

## Development Setup

To set up the project locally:

```bash
# Clone the repository
git clone https://github.com/yourusername/masonry-snap-grid-layout.git
cd masonry-snap-grid-layout

# Install dependencies
npm install

# Run the development server
npm run dev
```

The package uses TypeScript, React, and Vite (or CRA for examples). Ensure your editor supports TS for type checking.

---

## Testing

We use Vitest for unit testing:

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch
```

Add tests for any bug fixes or new features.

---

## Code Style

* TypeScript with strict type checks
* Prettier for formatting
* ESLint for linting
* Use meaningful variable and function names
* Include JSDoc comments for all public functions and components

```bash
# Run lint
npm run lint
# Format code
npm run format
```

---

Thank you for contributing! Your help keeps `masonry-snap-grid-layout` reliable, fast, and easy to use.

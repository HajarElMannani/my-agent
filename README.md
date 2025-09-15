# My Agent Project

## Project Overview
This project provides a comprehensive AI-powered agent solution designed for automating development tasks such as code reviews, commit message generation, and documentation. It leverages the power of large language models to enhance code quality and streamline workflows.

### Key Features
*   **AI Code Reviewer**: An intelligent agent that provides constructive feedback on code changes, focusing on correctness, clarity, maintainability, and best practices.
*   **Conventional Commit Message Generator**: Automatically generates high-quality, Conventional Commit-compliant messages based on staged Git diffs.
*   **README Generator**: A tool to generate a comprehensive and skimmable `README.md` file for the project, grounded in the repository's content.

## Requirements
Before you begin, ensure you have the following installed:

*   **Bun**: A fast all-in-one JavaScript runtime (https://bun.sh/)
*   **Git**: Version control system

## Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/my-agent.git
    cd my-agent
    ```

2.  **Install dependencies**:
    ```bash
    bun install
    ```

## Setup and Configuration

1.  **Environment Variables**: This project utilizes AI models, which typically require an API key. Create a `.env` file in the root directory and add your API key:
    ```ini
    # .env
    GOOGLE_API_KEY=your_google_api_key_here
    ```
    (Replace `GOOGLE_API_KEY` with the actual environment variable name required by `@ai-sdk/google` if different).

## Usage

This section demonstrates how to use the various features of the agent.

### Default Mode: AI Code Review
If no specific command is provided, the agent runs in code review mode.
```bash
bun run index.ts
# It will then prompt for a directory to review or use the current directory.
# Example with a specific directory:
bun run index.ts "/path/to/your/project"
```

### Generate Conventional Commit Message
To generate a commit message based on your staged changes:

```bash
bun run index.ts commit [rootDir]
# Example:
bun run index.ts commit .
```
*Description*: This command will analyze your staged files and output a Conventional Commit message to your console.

### Generate/Update README.md
To generate a comprehensive `README.md` file for your project:

```bash
bun run index.ts readme [rootDir] [--overwrite true|false]
# Example:
bun run index.ts readme .
# To overwrite an existing README.md:
bun run index.ts readme . --overwrite true
```
*Description*: This command will read your project files and generate a `README.md` with sections like Project Overview, Requirements, Installation, Usage, etc. By default, it will overwrite `README.md` if it exists.

## Scripts / Commands

*   `bun run index.ts`: Runs the AI code review agent.
*   `bun run index.ts commit <directory>`: Generates a Conventional Commit message for staged changes in the specified directory.
*   `bun run index.ts readme <directory> [--overwrite true|false]`: Generates or updates the `README.md` file in the specified directory.

## Contributing
We welcome contributions to My Agent Project! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes and write tests.
4.  Commit your changes using the `bun run index.ts commit` command to ensure Conventional Commit standards.
5.  Push to the branch (`git push origin feature/your-feature-name`).
6.  Open a Pull Request.

Please ensure your code adheres to our project's style and all tests pass.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
(Note: A `LICENSE` file would need to be present in the root directory for this link to be valid.)
# Git Workflow Guide

## Current Setup

✅ Git repository initialized
✅ `.gitignore` configured (excludes: `.env`, `node_modules/`, `.venv/`, `*.db`, etc.)
✅ Initial commit created on `master` branch (v0.1.1)

## Branch Strategy

### Main Branches

**`master`** - Production-ready code
- Always stable and deployable
- Tagged with version numbers (v0.1.0, v0.1.1, etc.)
- Only merge from `develop` or hotfix branches

**`develop`** - Integration branch for features
- Latest development changes
- Where feature branches merge into
- Periodically merged into `master` for releases

### Supporting Branches

**Feature branches** - `feature/feature-name`
- Created from: `develop`
- Merge back into: `develop`
- Naming: `feature/add-price-charts`, `feature/user-auth`

**Experimental branches** - `experiment/experiment-name`
- Created from: `develop` or `master`
- For testing different implementations
- May be discarded or merged
- Naming: `experiment/react-query`, `experiment/zustand-state`

**Hotfix branches** - `hotfix/issue-description`
- Created from: `master`
- Merge back into: `master` AND `develop`
- For urgent production fixes
- Naming: `hotfix/fix-api-crash`

## Common Commands

### Creating Branches

```bash
# Create develop branch from master
git checkout -b develop

# Create a feature branch
git checkout develop
git checkout -b feature/add-price-charts

# Create an experimental branch
git checkout -b experiment/try-react-query
```

### Working on Branches

```bash
# Check current branch
git branch

# Switch branches
git checkout develop
git checkout feature/add-price-charts

# See all branches
git branch -a

# Stage and commit changes
git add .
git commit -m "feat: add price chart component"

# Push branch to remote (when you add a remote)
git push origin feature/add-price-charts
```

### Merging Branches

```bash
# Merge feature into develop
git checkout develop
git merge feature/add-price-charts

# Delete merged feature branch
git branch -d feature/add-price-charts

# Force delete unmerged branch
git branch -D experiment/failed-attempt
```

### Viewing History

```bash
# View commit history
git log --oneline --graph --all

# View changes
git diff
git diff master develop

# View status
git status
```

## Recommended Workflow for Experiments

### Testing Different Implementations

1. **Create experiment branch from current state**
   ```bash
   git checkout -b experiment/try-implementation-a
   ```

2. **Make changes and commit**
   ```bash
   # Make your changes
   git add .
   git commit -m "experiment: try implementation A"
   ```

3. **Switch back to create another experiment**
   ```bash
   git checkout master  # or develop
   git checkout -b experiment/try-implementation-b
   # Make different changes
   git commit -am "experiment: try implementation B"
   ```

4. **Compare implementations**
   ```bash
   git diff experiment/try-implementation-a experiment/try-implementation-b
   ```

5. **Choose winner and merge**
   ```bash
   git checkout develop
   git merge experiment/try-implementation-a
   git branch -D experiment/try-implementation-b  # Delete the other
   ```

## Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

[optional body]
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, no logic change)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks (dependencies, build, etc.)
- `experiment:` - Experimental changes

**Examples:**
```bash
git commit -m "feat: add price history chart to dashboard"
git commit -m "fix: resolve API timeout on large datasets"
git commit -m "refactor: extract chart component for reusability"
git commit -m "experiment: try React Query for data fetching"
```

## Quick Start: Setting Up Development Workflow

```bash
# 1. Create develop branch
git checkout -b develop

# 2. Create your first feature branch
git checkout -b feature/my-new-feature

# 3. Make changes and commit
git add .
git commit -m "feat: implement my new feature"

# 4. Merge back to develop
git checkout develop
git merge feature/my-new-feature

# 5. When ready for release, merge to master
git checkout master
git merge develop
git tag v0.1.2
```

## Tips

- **Commit often** - Small, focused commits are easier to review and revert
- **Write clear messages** - Future you will thank you
- **Branch for experiments** - Don't be afraid to create branches
- **Keep master clean** - Only merge tested, working code
- **Use tags for versions** - Easy to reference specific releases

## Current Repository State

```
master (v0.1.1) ← You are here
  └─ Initial commit with complete project structure
```

## Next Steps

1. Create `develop` branch: `git checkout -b develop`
2. Create feature/experiment branches as needed
3. Set up remote repository (GitHub/GitLab) when ready
4. Push branches: `git push -u origin develop`

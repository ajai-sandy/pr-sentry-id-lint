# PR Sentry ID Lint

GitHub action to automatically add sentry ID on pull requests title.
## Usage

### Create Workflow

Create a workflow (eg: `.github/workflows/pr-sentry-id-lint.yml`, see [Creating a Workflow file](https://help.github.com/en/articles/configuring-a-workflow#creating-a-workflow-file)) to utilize the action with content:

```
# This workflow will enforce auto adding of sentry ID on pull requests title.

name: PR Sentry ID Lint
on:
  pull_request:
    types: [opened, edited, reopened]
  push:
    branches:
    - main
    - master
jobs:
  main:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - uses: "ajai-sandy/pr-sentry-id-lint@main"
      with:
        repo-token: "${{ secrets.GITHUB_TOKEN }}"


```

_Note: This grants access to the `GITHUB_TOKEN` so the action can make calls to GitHub's rest API_

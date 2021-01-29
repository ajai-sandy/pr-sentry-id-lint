// NPM IMPORTS
const core = require("@actions/core");
const github = require("@actions/github");

// Declarations
const regex = /^(((build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([a-zA-Z0-9-\s]+\))?))(:\s)([a-zA-Z0-9-_.&\s]+)/;

/**
 * Pull request number extractor
 */
const getPrNumber = () => {
  const pullRequest = github.context.payload.pull_request;

  if (!pullRequest) {
    return undefined;
  }
  return pullRequest.number;
};

/**
 * Pull request details extractor based on pull request number
 * @param {Object} client - github user details
 */
const getPrDetails = async (client) => {
  const prNumber = getPrNumber();

  core.info(`prNumber: ${prNumber}`);

  if (!prNumber) {
    core.error("Could not get pull request number from context, exiting");
    return;
  }

  const { data: pullRequest } = await client.pulls.get({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: prNumber,
  });

  return pullRequest;
};

/**
 * Pull request template extracted from pull_request_template.md file
 * @param {Object} client - github user details
 */
const getPrTemplate = async (client) => {
  const prTemplatePath = ".github/pull_request_template.md";

  try {
    const { data: content } = await client.repos.getContent({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      path: prTemplatePath,
      mediaType: {
        format: "raw",
      },
    });
    core.info("Successfully featched pull request template!");
    return content;
  } catch (error) {
    core.error(
      `Error getting pr template (${prTemplatePath}): ${error.message}`
    );
    return;
  }
};

/**
 * Validate pull request type is a fix
 * @param {String} prTitle - pull request title
 */
const getPrType = (prTitle) => prTitle.includes("fix:");

/**
 * Validate pull request & append id to title or handle the error cases
 * @param {Object} prDescription - pull request description
 * @param {Object} client - user details
 */
const validatePullRequest = async (prTitle, prDescription, client) => {
  if (prDescription.includes("Sentry Bug ID: **_ADD SENTRY BUG ID HERE_**")) {
    core.setFailed("Replace 'ADD SENTRY BUG ID HERE' with actual bug id");
  } else {
    const sentryBugID = prDescription
      .replace(/(\r\n)/g, "\n")
      .split("**_")
      .pop()
      .split("_**")[0];

    core.info(`sentryBugID: ${sentryBugID}`);

    if (!sentryBugID || sentryBugID.length > 8) {
      core.setFailed(
        "Check if sentry id is added proper, as provided in the example!"
      );
    } else {
      const prNumber = getPrNumber();
      const isConventionalCommitMsgFollowed = regex.test(prTitle);

      if (isConventionalCommitMsgFollowed) {
        const newTitle = prTitle.split(":").join(`: fixes ${sentryBugID} -`);

        const request = {
          owner: github.context.repo.owner,
          repo: github.context.repo.repo,
          pull_number: prNumber,
          title: newTitle,
        };

        const response = await client.pulls.update(request);

        if (response.status !== 200) {
          core.error(
            "There was an issue while trying to update the pull-request."
          );
        }

        core.info("Successfully update pr title!");
      } else {
        core.setFailed("Follow conventional commit message!");
      }
    }
  }
};

/**
 * Validate pull request template is filled & has matching pr title
 */
async function run() {
  try {
    const token = core.getInput("repo-token", { required: true });
    const client = github.getOctokit(token);

    const prDetails = await getPrDetails(client);

    const isPrTypeFix = getPrType(prDetails.title);

    /**
     * Check if the PR resolves sentry bug & append the bug id in PR title
     */
    if (isPrTypeFix) {
      const prTemplate = await getPrTemplate(client);
      const prTitle = prDetails.title;
      const prDescription = prDetails.body.replace(/(\r\n)/g, "\n"); // github adds \r\n on pr body

      /**
       * If PR description is empty throw error
       */
      if (!prDescription) {
        core.setFailed(
          "PR description missing, kindly use the template provided in '.github/pull_request_template.md' path in your repo!"
        );
      }

      /**
       * If PR description is untouched throw error
       */
      if (prDescription.includes(prTemplate)) {
        core.setFailed(
          "Verify if this pull request resolves a sentry bug in production!"
        );
      }

      /**
       * If user confirms this PR resolves a sentry bug
       */
      if (prDescription.includes("Does this PR resolves a sentry bug?: Y")) {
        validatePullRequest(prTitle, prDescription, client);
      }
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

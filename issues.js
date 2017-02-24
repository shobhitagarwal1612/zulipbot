const GitHubApi = require("github"); // NodeJS wrapper for GitHub API
const github = new GitHubApi(); // API client
const cfg = require("./config.js"); // hidden config file

github.authenticate({ // Authentication
  type: "basic",
  username: cfg.username,
  password: cfg.password
});

module.exports = exports = function(payload) {
  // get necessary information from request body
  let commenter, body;
  if (payload.action === "opened") { // if issue was opened
    commenter = payload.issue.user.login; // issue creator's username
    body = payload.issue.body; // contents of issue body
  } else if (payload.action === "created") { // if issue comment was created
    commenter = payload.comment.user.login; // commenter's username
    body = payload.comment.body; // contents of issue comment
  }
  const issueNumber = payload.issue.number; // number of issue
  const issueCreator = payload.issue.user.login;
  const repoName = payload.repository.name; // issue repository
  const repoOwner = payload.repository.owner.login; // repository owner
  if (body && body.includes("@zulipbot claim")) { // check body content for "@zulipbot claim"
    claimIssue(commenter, body, issueNumber, repoName, repoOwner);
  }
  if (body && body.includes("@zulipbot label") && commenter === issueCreator) { // check bodycontent for "@zulipbot label" and ensure commenter opened the issue
    addLabels(body, issueNumber, repoName, repoOwner);
  }
}

function addLabels(body, issueNumber, repoName, repoOwner) {
  let addedLabels = []; // initialize array for labels to be added to issue
  let rejectedLabels = [];
  let repoLabels = [];
  github.issues.getLabels({
    owner: repoOwner,
    repo: repoName
  }).then((repoLabelArray) => {
    repoLabelArray.forEach((repoLabel) => {
      repoLabels.push(repoLabel.name);
    })
    body.match(/"(.*?)"/g).forEach((label) => { // global regex search for content between double quotes ("")
      if (repoLabels.includes(label.replace(/"/g, ""))) {
        addedLabels.push(label.replace(/"/g, "")); // push each element to labels array
      } else {
        rejectedLabels.push(label);
      }
    });
    github.issues.addLabels({ // add labels
        owner: repoOwner,
        repo: repoName,
        number: issueNumber,
        labels: addedLabels
      })
      .catch(console.error)
      .then((response) => {
        const rejectedLabelsString = rejectedLabels.join(', ');
        let rejectedLabelError;
        if (rejectedLabels.length > 1) {
          rejectedLabelError = `**Error:** Labels ${rejectedLabelsString} do not exist and were thus not added to this issue.`
        } else if (rejectedLabels.length = 1) {
          rejectedLabelError = `**Error:** Label ${rejectedLabelsString} does not exist and was thus not added to this issue.`
        }
        github.issues.createComment({
            owner: repoOwner,
            repo: repoName,
            number: issueNumber,
            body: rejectedLabelError
          })
          .catch(console.error)
      });
  })
}

function claimIssue(commenter, body, issueNumber, repoName, repoOwner) {
  const issueLabels = ["in progress"]; // create array for new issue labels
  const issueAssignees = [commenter]; // create array for new assignees
  github.repos.checkCollaborator({ // check if commenter is a collaborator
      owner: repoOwner,
      repo: repoName,
      username: commenter
    })
    .catch( // if commenter is not collaborator
      github.repos.addCollaborator({ // give commenter read-only (pull) access
        owner: repoOwner,
        repo: repoName,
        username: commenter,
        permission: "pull"
      })
      .catch(console.error)
      .then(
        github.issues.addAssigneesToIssue({ // add assignee
          owner: repoOwner,
          repo: repoName,
          number: issueNumber,
          assignees: issueAssignees
        })
        .catch(console.error)
        .then(
          github.issues.createComment({
            owner: repoOwner,
            repo: repoName,
            number: issueNumber,
            body: `Congratulations @${commenter}, you\'ve successfully claimed your first issue! \
Since you\'re a new contributor, you now have pull (read-only) access to this repository.\
\n\nPlease review our [code contribution guidelines](http://zulip.readthedocs.io/en/latest/index.html#code-docs) \
and sign the [Dropbox Contributor License Agreement](https://opensource.dropbox.com/cla/) \
before opening any pull requests for any issues that you\'re working on.\
\n\nAlso, if you haven\'t done so already, please join us on the Zulip development server at [chat.zulip.org](https://chat.zulip.org/)! \
Our community of developers use **chat.zulip.org** as our primary communication forum for developing Zulip; \
you can read more about the **chat.zulip.org** community in our [documentation](http://zulip.readthedocs.io/en/latest/chat-zulip-org.html).\
\n\n**Note:** Depending on your [notification settings](https://github.com/settings/notifications), you might be \
automatically watching this repository, which means that you\'ll get notifications for any new pull requests and \
issues that are created. If you don\'t want to receive notifications for this repository, you should unwatch this repository.`
          })
          .catch(console.error)
        )
      )
    )
    .then(
      github.issues.addAssigneesToIssue({ // add assignee
        owner: repoOwner,
        repo: repoName,
        number: issueNumber,
        assignees: issueAssignees
      })
      .catch(console.error)
      .then(
        github.issues.addLabels({ // add labels
          owner: repoOwner,
          repo: repoName,
          number: issueNumber,
          labels: issueLabels
        })
        .catch(console.error)
      )
    )
}
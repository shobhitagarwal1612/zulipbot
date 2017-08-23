exports.run = async function(client, repository) {
  const repoName = repository.name;
  const repoOwner = repository.owner.login;
  const func = client.pullRequests.getAll({
    owner: repoOwner, repo: repoName, per_page: 100
  });
  const pullRequests = await client.getAll(client, [], func);
  pullRequests.forEach(async p => exports.check(client, p.number, repoName, repoOwner));
};

exports.check = async function(client, number, repoName, repoOwner) {
  const pull = await client.pullRequests.get({
    owner: repoOwner, repo: repoName, number: number
  });
  const mergeable = pull.data.mergeable;
  const author = pull.data.user.login;
  const comment = client.templates.get("mergeConflictWarning").replace("[username]", author)
  .replace("[repoOwner]", repoOwner).replace("[repoName]", repoName);
  const commits = await client.pullRequests.getCommits({
    owner: repoOwner, repo: repoName, number: number, per_page: 100
  });
  const lastCommitTime = Date.parse(commits.data.slice(-1).pop().commit.committer.date);
  const comments = await client.issues.getComments({
    owner: repoOwner, repo: repoName, number: number, per_page: 100
  });
  const labelComment = comments.data.find((c) => {
    const synchCheck = lastCommitTime < Date.parse(c.updated_at);
    return c.body.includes(comment) && synchCheck && c.user.login === client.cfg.username;
  });
  if (!labelComment && !mergeable) {
    client.newComment(pull.data, pull.data.base.repo, comment);
  } else if (mergeable) {
    const oldComments = comments.data.filter((c) => {
      return c.body.includes(comment) && c.user.login === client.cfg.username;
    }).map(c => c.id);
    oldComments.forEach((c) => {
      client.issues.deleteComment({
        owner: repoOwner, repo: repoName, id: c
      });
    });
  }
};

const simple = require("simple-mock");
const test = require("tap").test;

const abandon = require(`${__dirname}/../../src/commands/abandon.js`);

const payload = {
  repository: {
    owner: {
      login: "zulip"
    },
    name: "zulipbot"
  },
  issue: {
    number: "69",
    assignees: [{
      login: "octocat"
    }]
  }
};

const client = {
  issues: {
    createComment: () => {},
    removeAssigneesFromIssue: () => {}
  }
};

test("Reject if commenter isn't an assignee", async t => {
  const commenter = "octokitten";

  const error = "**ERROR:** You have not claimed this issue to work on yet.";
  const request = simple.mock(client.issues, "createComment").resolveWith({
    data: {
      body: error
    }
  });

  const response = await abandon.run.apply(client, [payload, commenter]);

  t.equals(request.lastCall.arg.owner, "zulip");
  t.equals(request.lastCall.arg.repo, "zulipbot");
  t.equals(request.lastCall.arg.number, "69");
  t.equals(response.data.body, error);

  simple.restore();
  t.end();
});

test("Remove if commenter is assigned", async t => {
  const commenter = "octocat";

  const request = simple.mock(client.issues, "removeAssigneesFromIssue")
    .resolveWith({
      data: {
        assignees: []
      }
    });

  const response = await abandon.run.apply(client, [payload, commenter]);

  abandon.run.apply(client, [payload, commenter]);

  t.equals(request.lastCall.arg.owner, "zulip");
  t.equals(request.lastCall.arg.repo, "zulipbot");
  t.equals(request.lastCall.arg.number, "69");
  t.same(request.lastCall.arg.assignees, ["octocat"]);
  t.same(response.data.assignees, []);

  simple.restore();
  t.end();
});

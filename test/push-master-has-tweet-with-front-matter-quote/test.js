/**
 * This test checks the happy path of a commit to the main branch (master)
 * which includes a new *.tweet file that is making use of the front matter to quote retweet.
 */

const assert = require("assert");
const path = require("path");

const nock = require("nock");
const tap = require("tap");

// SETUP
process.env.GITHUB_EVENT_NAME = "push";
process.env.GITHUB_TOKEN = "secret123";
process.env.GITHUB_EVENT_PATH = require.resolve("./event.json");
process.env.GITHUB_REF = "refs/heads/master";
process.env.GITHUB_WORKSPACE = path.dirname(process.env.GITHUB_EVENT_PATH);

// set other env variables so action-toolkit is happy
process.env.GITHUB_WORKFLOW = "";
process.env.GITHUB_ACTION = "twitter-together";
process.env.GITHUB_ACTOR = "";
process.env.GITHUB_REPOSITORY = "";
process.env.GITHUB_SHA = "";

// MOCK
nock("https://api.github.com", {
  reqheaders: {
    authorization: "token secret123",
  },
})
  // get changed files
  .get(
    "/repos/gr2m/twitter-together/compare/0000000000000000000000000000000000000001...0000000000000000000000000000000000000002"
  )
  .reply(200, {
    files: [
      {
        status: "added",
        filename: "tweets/hello-world.tweet",
      },
    ],
  })

  // post comment
  .post(
    "/repos/gr2m/twitter-together/commits/0000000000000000000000000000000000000002/comments",
    (body) => {
      tap.equal(
        body.body,
        "Tweeted:\n\n- https://twitter.com/gr2m/status/0000000000000000002"
      );
      return true;
    }
  )
  .reply(201);

nock("https://api.twitter.com")
  .post("/1.1/statuses/update.json", (body) => {
    tap.equal(body.status, "Smart thinking!");
    tap.equal(
      body.attachment_url,
      "https://twitter.com/m2rg/status/0000000000000000001"
    );
    return true;
  })
  .reply(201, {
    id_str: "0000000000000000002",
    user: {
      screen_name: "gr2m",
    },
  });

process.on("exit", (code) => {
  assert.equal(code, 0);
  assert.deepEqual(nock.pendingMocks(), []);
});

require("../../lib");

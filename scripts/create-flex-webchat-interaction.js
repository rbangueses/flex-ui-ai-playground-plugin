#!/usr/bin/env node

const fs = require("fs");
const https = require("https");
const path = require("path");
const { URLSearchParams } = require("url");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_ENV_PATH = path.join(ROOT, "serverless-ai-playground-plugin", ".env");
const VALID_SID = /^[A-Z]{2}[0-9a-fA-F]{32}$/;

function parseArgs(argv) {
  const args = {
    mode: "create",
    envPath: DEFAULT_ENV_PATH,
    taskChannel: "chat",
    channelType: "web",
    customerName: "Test Customer",
    message: "Hi, I need help registering a new device on my account.",
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const readValue = () => {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }
      i += 1;
      return value;
    };

    if (arg === "--inspect") args.mode = "inspect";
    else if (arg === "--find-task") {
      args.mode = "findTask";
      args.findConversationSid = readValue();
    }
    else if (arg === "--env") args.envPath = path.resolve(readValue());
    else if (arg === "--workspace-sid") args.workspaceSid = readValue();
    else if (arg === "--workflow-sid") args.workflowSid = readValue();
    else if (arg === "--task-channel") args.taskChannel = readValue();
    else if (arg === "--channel-type") args.channelType = readValue();
    else if (arg === "--name") args.customerName = readValue();
    else if (arg === "--message") args.message = readValue();
    else if (arg === "--help" || arg === "-h") args.mode = "help";
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/create-flex-webchat-interaction.js --inspect
  node scripts/create-flex-webchat-interaction.js --find-task CH...
  node scripts/create-flex-webchat-interaction.js [--workspace-sid WS...] [--workflow-sid WW...]

Options:
  --inspect              List available TaskRouter workspaces and workflows.
  --find-task CH         Find recent TaskRouter tasks for a Conversation SID.
  --env PATH             Env file to read. Defaults to serverless-ai-playground-plugin/.env.
  --workspace-sid WS     TaskRouter Workspace SID. Auto-selected only when one exists.
  --workflow-sid WW      TaskRouter Workflow SID. Auto-selected only when one exists.
  --task-channel NAME    Task channel unique name. Defaults to chat.
  --channel-type TYPE    Flex channel type. Defaults to web.
  --name TEXT            Customer display name.
  --message TEXT         Initial customer message.`);
}

function readEnv(envPath) {
  const fromFile = {};
  if (fs.existsSync(envPath)) {
    const text = fs.readFileSync(envPath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      fromFile[key] = value;
    }
  }

  return { ...fromFile, ...process.env };
}

function getCredential(env, keys) {
  for (const key of keys) {
    if (env[key]) return env[key];
  }
  return null;
}

function requireCredentialGroup(env, keys) {
  const value = getCredential(env, keys);
  if (!value) {
    throw new Error(`Missing ${keys.join(" or ")}. Add it to ${DEFAULT_ENV_PATH} or your shell env.`);
  }
  return value;
}

function isUsableSid(value, prefix) {
  return typeof value === "string" && value.startsWith(prefix) && VALID_SID.test(value);
}

function requestJson({ method = "GET", host, path: requestPath, accountSid, authToken, body }) {
  const encodedBody = body ? new URLSearchParams(body).toString() : null;
  const options = {
    method,
    host,
    path: requestPath,
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      Accept: "application/json",
    },
  };

  if (encodedBody) {
    options.headers["Content-Type"] = "application/x-www-form-urlencoded";
    options.headers["Content-Length"] = Buffer.byteLength(encodedBody);
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let json = {};
        try {
          json = text ? JSON.parse(text) : {};
        } catch (error) {
          reject(new Error(`Non-JSON response from ${host}${requestPath}: ${text.slice(0, 500)}`));
          return;
        }

        if (res.statusCode < 200 || res.statusCode >= 300) {
          const message = json.message || json.detail || text || `HTTP ${res.statusCode}`;
          reject(new Error(`${method} ${host}${requestPath} failed (${res.statusCode}): ${message}`));
          return;
        }

        resolve(json);
      });
    });

    req.on("error", reject);
    if (encodedBody) req.write(encodedBody);
    req.end();
  });
}

async function listWorkspaces(accountSid, authToken) {
  const response = await requestJson({
    host: "taskrouter.twilio.com",
    path: "/v1/Workspaces?PageSize=50",
    accountSid,
    authToken,
  });
  return response.workspaces || [];
}

async function listWorkflows(accountSid, authToken, workspaceSid) {
  const response = await requestJson({
    host: "taskrouter.twilio.com",
    path: `/v1/Workspaces/${encodeURIComponent(workspaceSid)}/Workflows?PageSize=100`,
    accountSid,
    authToken,
  });
  return response.workflows || [];
}

async function listTasks(accountSid, authToken, workspaceSid) {
  const response = await requestJson({
    host: "taskrouter.twilio.com",
    path: `/v1/Workspaces/${encodeURIComponent(workspaceSid)}/Tasks?PageSize=100`,
    accountSid,
    authToken,
  });
  return response.tasks || [];
}

function selectWorkspace(args, env, workspaces) {
  const explicit = args.workspaceSid || env.TASKROUTER_WORKSPACE_SID || env.TWILIO_FLEX_WORKSPACE_SID;
  if (explicit) {
    if (!isUsableSid(explicit, "WS")) throw new Error(`Workspace SID is not valid: ${explicit}`);
    return explicit;
  }

  if (workspaces.length === 1) return workspaces[0].sid;

  throw new Error(
    `Found ${workspaces.length} workspaces. Re-run with --workspace-sid WS... after choosing one from --inspect.`
  );
}

function parseTaskAttributes(task) {
  if (!task.attributes) return {};
  if (typeof task.attributes === "object") return task.attributes;
  try {
    return JSON.parse(task.attributes);
  } catch (error) {
    return {};
  }
}

function taskMatchesConversation(task, conversationSid) {
  const attrs = parseTaskAttributes(task);
  return (
    attrs.conversationSid === conversationSid ||
    attrs.flexInteractionConversationSid === conversationSid ||
    attrs.source === "codex-flex-webchat-poc" ||
    JSON.stringify(attrs).includes(conversationSid)
  );
}

function selectWorkflow(args, env, workflows) {
  const explicit = args.workflowSid || env.FLEX_WORKFLOW_SID || env.TASKROUTER_WORKFLOW_SID;
  const legacy = env.WORKFLOW_SID;
  const candidate = explicit || (isUsableSid(legacy, "WW") ? legacy : null);

  if (candidate) {
    if (!isUsableSid(candidate, "WW")) throw new Error(`Workflow SID is not valid: ${candidate}`);
    return candidate;
  }

  if (workflows.length === 1) return workflows[0].sid;

  throw new Error(
    `Found ${workflows.length} workflows. Re-run with --workflow-sid WW... after choosing one from --inspect.`
  );
}

async function createConversation(accountSid, authToken, args) {
  const attributes = {
    source: "codex-flex-webchat-poc",
    createdBy: "create-flex-webchat-interaction.js",
    customerName: args.customerName,
  };

  return requestJson({
    method: "POST",
    host: "conversations.twilio.com",
    path: "/v1/Conversations",
    accountSid,
    authToken,
    body: {
      FriendlyName: `POC webchat - ${args.customerName} - ${new Date().toISOString()}`,
      Attributes: JSON.stringify(attributes),
    },
  });
}

async function addCustomerParticipant(accountSid, authToken, conversationSid, identity, customerName) {
  return requestJson({
    method: "POST",
    host: "conversations.twilio.com",
    path: `/v1/Conversations/${encodeURIComponent(conversationSid)}/Participants`,
    accountSid,
    authToken,
    body: {
      Identity: identity,
      Attributes: JSON.stringify({ role: "customer", name: customerName }),
    },
  });
}

async function addCustomerMessage(accountSid, authToken, conversationSid, identity, body) {
  return requestJson({
    method: "POST",
    host: "conversations.twilio.com",
    path: `/v1/Conversations/${encodeURIComponent(conversationSid)}/Messages`,
    accountSid,
    authToken,
    body: {
      Author: identity,
      Body: body,
    },
  });
}

async function createInteraction(accountSid, authToken, args, workspaceSid, workflowSid, conversationSid, identity) {
  const channel = {
    type: args.channelType,
    initiated_by: "customer",
    properties: {
      media_channel_sid: conversationSid,
    },
  };

  const routing = {
    properties: {
      workspace_sid: workspaceSid,
      workflow_sid: workflowSid,
      task_channel_unique_name: args.taskChannel,
      attributes: {
        from: args.customerName,
        customerName: args.customerName,
        customerAddress: identity,
        subject: "POC AI Playground webchat",
        channelType: args.channelType,
        source: "codex-flex-webchat-poc",
      },
    },
  };

  return requestJson({
    method: "POST",
    host: "flex-api.twilio.com",
    path: "/v1/Interactions",
    accountSid,
    authToken,
    body: {
      Channel: JSON.stringify(channel),
      Routing: JSON.stringify(routing),
    },
  });
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.mode === "help") {
    printHelp();
    return;
  }

  const env = readEnv(args.envPath);
  const accountSid = requireCredentialGroup(env, ["ACCOUNT_SID", "TWILIO_ACCOUNT_SID"]);
  const authToken = requireCredentialGroup(env, ["AUTH_TOKEN", "TWILIO_AUTH_TOKEN"]);

  const workspaces = await listWorkspaces(accountSid, authToken);
  const workspaceSid = args.mode === "inspect" ? args.workspaceSid || workspaces[0]?.sid : selectWorkspace(args, env, workspaces);
  const workflows = workspaceSid ? await listWorkflows(accountSid, authToken, workspaceSid) : [];

  console.log("TaskRouter workspaces:");
  for (const workspace of workspaces) {
    console.log(`- ${workspace.sid}  ${workspace.friendly_name || workspace.friendlyName || "(unnamed)"}`);
  }

  if (workspaceSid) {
    console.log(`\nWorkflows for ${workspaceSid}:`);
    for (const workflow of workflows) {
      console.log(`- ${workflow.sid}  ${workflow.friendly_name || workflow.friendlyName || "(unnamed)"}`);
    }
  }

  if (args.mode === "inspect") return;

  if (args.mode === "findTask") {
    const tasks = await listTasks(accountSid, authToken, workspaceSid);
    const matches = tasks.filter((task) => taskMatchesConversation(task, args.findConversationSid));

    console.log(`\nMatching tasks for ${args.findConversationSid}:`);
    if (matches.length === 0) {
      console.log("- none found in the latest 100 TaskRouter tasks");
      return;
    }

    for (const task of matches) {
      const attrs = parseTaskAttributes(task);
      console.log(`- ${task.sid}  status=${task.assignment_status || task.assignmentStatus || "unknown"}`);
      console.log(`  channel=${task.task_channel_unique_name || attrs.channelType || "unknown"}`);
      console.log(`  from=${attrs.from || attrs.customerName || "(unknown)"}`);
      console.log(`  conversationSid=${attrs.conversationSid || "(not yet attached)"}`);
      console.log(`  interactionSid=${attrs.flexInteractionSid || "(not yet attached)"}`);
    }
    return;
  }

  const workflowSid = selectWorkflow(args, env, workflows);
  const identity = `codex-test-${Date.now()}`;

  const conversation = await createConversation(accountSid, authToken, args);
  const participant = await addCustomerParticipant(accountSid, authToken, conversation.sid, identity, args.customerName);
  const message = await addCustomerMessage(accountSid, authToken, conversation.sid, identity, args.message);
  const interaction = await createInteraction(
    accountSid,
    authToken,
    args,
    workspaceSid,
    workflowSid,
    conversation.sid,
    identity
  );

  console.log("\nCreated Flex webchat interaction:");
  console.log(`- Conversation SID: ${conversation.sid}`);
  console.log(`- Customer participant SID: ${participant.sid}`);
  console.log(`- Initial message SID: ${message.sid}`);
  console.log(`- Interaction SID: ${interaction.sid}`);
  console.log(`- Workspace SID: ${workspaceSid}`);
  console.log(`- Workflow SID: ${workflowSid}`);
  console.log(`- Customer identity: ${identity}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

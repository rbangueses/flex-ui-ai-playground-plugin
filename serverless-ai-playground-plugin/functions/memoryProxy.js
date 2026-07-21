/**
 * Memory and Conversation Intelligence API Proxy
 *
 * Public serverless function secured with twilio-flex-token-validator.
 * Keeps Twilio credentials server-side while Flex UI views query Customer
 * Memory and Conversation Intelligence data using the logged-in Flex token.
 */

const TokenValidator =
  require("twilio-flex-token-validator").functionValidator;

const MEMORA_BASE = "https://memory.twilio.com/v1";
const INTELLIGENCE_BASE = "https://intelligence.twilio.com/v3";

const INTELLIGENCE_FILTERS = {
  Conversations: [
    "pageSize",
    "status",
    "channels",
    "channelId",
    "createdAtAfter",
    "createdAtBefore",
    "conversationConfigurationId",
    "intelligenceConfigurationIds",
    "operatorIds",
    "pageToken",
  ],
  OperatorResults: [
    "conversationId",
    "intelligenceConfigurationId",
    "operatorId",
    "pageSize",
    "pageToken",
  ],
};

function buildResponse(statusCode, body) {
  const response = new Twilio.Response();
  response.setStatusCode(statusCode);
  response.appendHeader("Access-Control-Allow-Origin", "*");
  response.appendHeader("Access-Control-Allow-Methods", "OPTIONS POST GET");
  response.appendHeader("Access-Control-Allow-Headers", "Content-Type");
  response.appendHeader("Content-Type", "application/json");
  response.setBody(body);
  return response;
}

function basicAuth(accountSid, authToken) {
  return "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
}

function appendParam(url, key, value) {
  if (value === undefined || value === null || value === "") return;
  if (Array.isArray(value)) {
    url.searchParams.set(key, value.join(","));
    return;
  }
  url.searchParams.set(key, String(value));
}

function buildIntelligenceUrl(resource, params = {}) {
  const allowedFilters = INTELLIGENCE_FILTERS[resource];
  if (!allowedFilters) {
    throw new Error(`Unsupported Intelligence resource: ${resource}`);
  }

  const url = new URL(`${INTELLIGENCE_BASE}/${resource}`);
  for (const key of allowedFilters) {
    appendParam(url, key, params[key]);
  }
  return url;
}

async function apiFetch(url, { method = "GET", headers, body } = {}) {
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get("content-type") || "";
  const responseBody = contentType.includes("application/json")
    ? await res.json().catch(() => null)
    : await res.text().catch(() => null);

  if (!res.ok) {
    const err = new Error(
      responseBody?.message ||
        responseBody?.error ||
        `Twilio API returned ${res.status}`,
    );
    err.status = res.status;
    err.details = responseBody;
    throw err;
  }

  return responseBody;
}

async function handleMemoryAction(context, event, baseHeaders) {
  const { action, phone, profileId, query, pageSize, pageToken, observationId, summaryId } =
    event;

  const storeId = context.MEMORA_STORE_ID;
  if (!storeId) {
    const err = new Error("MEMORA_STORE_ID not configured");
    err.status = 500;
    throw err;
  }

  switch (action) {
    case "lookup": {
      if (!phone) {
        const err = new Error("Missing required parameter: phone");
        err.status = 400;
        throw err;
      }
      return apiFetch(`${MEMORA_BASE}/Stores/${storeId}/Profiles/Lookup`, {
        method: "POST",
        headers: baseHeaders,
        body: { idType: "phone", value: phone },
      });
    }

    case "recall": {
      if (!profileId) {
        const err = new Error("Missing required parameter: profileId");
        err.status = 400;
        throw err;
      }
      const recallBody = {
        observationsLimit: event.observationsLimit !== undefined
          ? parseInt(event.observationsLimit, 10)
          : 20,
        summariesLimit: event.summariesLimit !== undefined
          ? parseInt(event.summariesLimit, 10)
          : 5,
      };
      if (query !== undefined) recallBody.query = query;

      return apiFetch(
        `${MEMORA_BASE}/Stores/${storeId}/Profiles/${profileId}/Recall`,
        {
          method: "POST",
          headers: baseHeaders,
          body: recallBody,
        },
      );
    }

    case "observations":
    case "traits":
    case "conversationSummaries": {
      if (!profileId) {
        const err = new Error("Missing required parameter: profileId");
        err.status = 400;
        throw err;
      }

      const resourceByAction = {
        observations: "Observations",
        traits: "Traits",
        conversationSummaries: "ConversationSummaries",
      };
      const url = new URL(
        `${MEMORA_BASE}/Stores/${storeId}/Profiles/${profileId}/${resourceByAction[action]}`,
      );
      appendParam(url, "pageSize", pageSize);
      appendParam(url, "pageToken", pageToken);

      return apiFetch(url.toString(), {
        method: "GET",
        headers: baseHeaders,
      });
    }

    case "deleteObservation": {
      if (!profileId || !observationId) {
        const err = new Error("Missing required parameter: profileId or observationId");
        err.status = 400;
        throw err;
      }
      await apiFetch(
        `${MEMORA_BASE}/Stores/${storeId}/Profiles/${profileId}/Observations/${observationId}`,
        { method: "DELETE", headers: baseHeaders },
      );
      return { deleted: true };
    }

    case "deleteSummary": {
      if (!profileId || !summaryId) {
        const err = new Error("Missing required parameter: profileId or summaryId");
        err.status = 400;
        throw err;
      }
      await apiFetch(
        `${MEMORA_BASE}/Stores/${storeId}/Profiles/${profileId}/ConversationSummaries/${summaryId}`,
        { method: "DELETE", headers: baseHeaders },
      );
      return { deleted: true };
    }

    default:
      return null;
  }
}

async function handleIntelligenceAction(event, baseHeaders) {
  const { action, conversationId } = event;

  switch (action) {
    case "listConversations":
      return apiFetch(buildIntelligenceUrl("Conversations", event).toString(), {
        method: "GET",
        headers: baseHeaders,
      });

    case "getConversation": {
      if (!conversationId) {
        const err = new Error("Missing required parameter: conversationId");
        err.status = 400;
        throw err;
      }
      return apiFetch(
        `${INTELLIGENCE_BASE}/Conversations/${encodeURIComponent(conversationId)}`,
        { method: "GET", headers: baseHeaders },
      );
    }

    case "listOperatorResults":
      return apiFetch(buildIntelligenceUrl("OperatorResults", event).toString(), {
        method: "GET",
        headers: baseHeaders,
      });

    default:
      return null;
  }
}

async function proxyHandler(context, event, callback) {
  if (event.request?.method === "OPTIONS") {
    return callback(null, buildResponse(204, {}));
  }

  const { action } = event;
  if (!action) {
    return callback(
      null,
      buildResponse(400, { error: "Missing required parameter: action" }),
    );
  }

  const authHeader = basicAuth(context.ACCOUNT_SID, context.AUTH_TOKEN);
  const baseHeaders = {
    Authorization: authHeader,
    "Content-Type": "application/json",
  };

  try {
    const memoryResult = await handleMemoryAction(context, event, baseHeaders);
    if (memoryResult) {
      return callback(null, buildResponse(200, memoryResult));
    }

    const intelligenceResult = await handleIntelligenceAction(event, baseHeaders);
    if (intelligenceResult) {
      return callback(null, buildResponse(200, intelligenceResult));
    }

    return callback(null, buildResponse(400, { error: `Unknown action: ${action}` }));
  } catch (error) {
    console.error("[memoryProxy] Error:", error.message);
    if (error.details) {
      console.error("[memoryProxy] Details:", JSON.stringify(error.details));
    }

    return callback(
      null,
      buildResponse(error.status || 500, {
        error: error.message || "memoryProxy failed",
        details: error.details,
      }),
    );
  }
}

module.exports = {
  buildIntelligenceUrl,
  proxyHandler,
  handler: TokenValidator(proxyHandler),
};

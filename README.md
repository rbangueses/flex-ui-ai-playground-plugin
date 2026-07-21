# Flex CIntel Webchat Analysis Viewer

A Twilio Flex plugin that adds real-time voice transcription, real-time and post-conversation AI operator results, historical Conversation Intelligence analysis browsing, and customer memory retrieval to the agent desktop.

## About This Fork

This proof-of-concept fork is based on the original
[twilio-professional-services/flex-ui-ai-playground-plugin](https://github.com/twilio-professional-services/flex-ui-ai-playground-plugin)
repository from Twilio Professional Services.

Credit for the original plugin architecture, realtime transcription flow, operator result webhook handling, Sync integration, and AI Playground Flex UI belongs to the original maintainers and contributors of that repository. This fork adds experimental functionality for:

- browsing historical Conversation Intelligence analysis from a Flex view
- polling Conversation Intelligence operator results for active Flex digital/webchat tasks
- generating a synthetic Flex webchat interaction for local testing

## Intent & Scope

This plugin is designed as an **exploration and iteration tool** for Twilio Conversational Intelligence language operators and customer memory features. It handles the "plumbing" of connecting operator results to the Flex UI, allowing developers to quickly iterate on operator configurations without building custom UI integrations.

**This plugin is NOT intended for production use.**

> **Note:** Realtime Conversational Intelligence is (at the time of writing) in private beta. Contact your Twilio account team or Technical Account Manager for support in enabling this feature for your account.

### Disclaimer

⚠️ **This is not an officially supported Twilio product.** This plugin is provided as-is, without warranty or SLA. It is a community-driven exploration tool for developers working with Conversational Intelligence and Customer Memory features.

We encourage:
- 🐛 **Issue reports** - Found a bug? Open an issue on GitHub
- 💡 **Feedback** - Share your experience and suggestions
- 🤝 **Contributions** - Pull requests are welcome!

### Production Considerations

This implementation prioritizes rapid development and experimentation over production scalability:

- **Twilio Functions Limitations**: The serverless architecture would need refactoring to handle concurrent function invocations at production scale
- **Sync Subscription Architecture**: The current Sync subscription model creates heavy load when multiple supervisors monitor calls from Teams View, subscribing to multiple Sync objects per monitored call. This pattern would need optimization for production deployments with many concurrent supervisors

For production deployments, consider:
- Implementing connection pooling and rate limiting for serverless functions
- Redesigning the Sync subscription model to use a more efficient pub/sub pattern
- Evaluating alternative real-time data distribution mechanisms

**Need production deployment support?** Reach out to your Twilio account team to discuss Twilio Professional Services assistance with architecture design, scalability optimization, and production-ready implementations.

## Features

- **RealTime Transcription** -- live speech-to-text displayed in a scrollable chat view on the task panel, with customer messages on the left and agent messages on the right
- **Realtime AI Operators** -- operator results (Sentiment, Summary, Next-Best-Response, etc.) displayed in Panel 2 as the conversation happens; voice calls use Sync streaming, while active digital/webchat tasks poll Conversation Intelligence through `memoryProxy`
- **Post Call Operators** -- operator results that fire after the conversation ends (e.g., AgentCoaching) displayed in the same panel for voice and digital/webchat tasks
- **AI Analysis Viewer** -- Flex side-nav view for browsing historical Conversation Intelligence conversations and operator results after a Flex task is complete or no longer selected
- **Customer Memory** -- profile lookup via Memora, showing Memory Retrieval, Observations, Conversation Summaries, and Traits for the caller
- **Supervisor Access** -- supervisors can view real-time transcription and operator results for monitored calls via the Teams View
- **TaskRouter Integration** -- per-dialed-number routing with optional worker targeting
- **Participant Type Fix** -- automatic correction of participant types for conversations hydrated via `<Transcription>`
- **Synthetic webchat test helper** -- local script for creating a test Flex webchat interaction that can trigger digital operator polling

## Maestro/Twilio Conversations Orchestrator Hydration

This plugin supports two Conversation Intelligence data paths:

1. **Voice calls** use active hydration via TwiML `<Transcription>` with a conversation configuration ID. The serverless webhooks receive transcription and operator callbacks, then write active-call state to Twilio Sync.
2. **Flex digital/webchat conversations** rely on Twilio Conversations Orchestrator already creating and analyzing the Conversation Intelligence conversation. The plugin does not create the analysis pipeline for webchat; it discovers the active CIntel conversation from the Flex task's conversation/channel SID and polls operator results through `memoryProxy`.

### Current Implementation: Active Hydration

**Voice call flow:**
1. Incoming voice calls trigger `handleIncomingCall` function
2. TwiML `<Start><Transcription>` element includes `conversationConfiguration` parameter
3. Conversation configuration ID is mapped per phone number in `config.private.json`
4. Maestro creates conversation and hydrates it with call transcription
5. Conversation Intelligence operators execute based on configuration
6. Operator results flow to `handleOperatorResult` webhook for display in Flex UI

**Digital/webchat flow:**
1. A Flex Conversations task is selected in the agent desktop
2. The plugin extracts likely channel identifiers from task attributes, such as `conversationSid`, `channelSid`, or interaction channel attributes
3. `memoryProxy` calls the Conversation Intelligence API and searches for a CIntel conversation whose channel ID matches the Flex conversation/channel SID
4. While the task remains selected, the plugin polls operator results every few seconds
5. Results triggered on `COMMUNICATION` are shown in **Realtime Operators**; results triggered on `CONVERSATION_END` are shown in **Post Call Operators**

**Current Scope:**
- ✅ **Inbound voice calls** - Fully supported via TwiML `<Transcription>`
- ✅ **Flex webchat/digital operator results** - Supported for active Flex Conversations tasks when Conversation Orchestrator is already creating and analyzing CIntel conversations
- ✅ **Historical analysis browsing** - Supported through the `AI Analysis Viewer` Flex view, which queries CIntel conversations and operator results after tasks are completed
- ⏸️ **Outbound calls from Flex** - Not yet implemented
- ⏸️ **Flex Conversations live transcript rendering** - Not yet implemented in the Panel 2 transcription tab

### Historical Analysis Viewer

Flex task attributes and task-scoped UI state disappear once a task is completed, but Conversation Intelligence conversations and operator results remain available through the Intelligence API. This fork adds an `AI Analysis Viewer` side-nav view so authenticated Flex users can browse those post-conversation analysis results from inside Flex.

The viewer uses `memoryProxy` rather than calling Twilio APIs directly from the browser. The Flex UI sends the logged-in user's Flex token to the serverless function, `twilio-flex-token-validator` validates access, and the function uses server-side Twilio credentials to call:

- `GET /v3/Conversations` to list and filter analyzed conversations
- `GET /v3/OperatorResults` to fetch operator outputs for the selected conversation

The UI groups operator results by trigger and operator name, so realtime `COMMUNICATION` results and post-conversation `CONVERSATION_END` results can be reviewed after the original Flex task is gone.

### Alternative: Passive Hydration

For advanced users or testing scenarios, **passive hydration** can be used by:
1. Configuring ConversationRelay to send call streams into Maestro
2. Pointing operator result callbacks to the `handleOperatorResult` webhook
3. Maestro asynchronously ingests events and executes operators

This approach works alongside existing CPaaS voice infrastructure without requiring TwiML changes. The operator result webhook in this plugin should work with passive hydration configurations.

### Future Enhancements

Planned improvements to expand hydration support:

- **Outbound Calls from Flex** - Handle conversations initiated by agents making outbound calls
- **Flex Conversations live transcripts** - Render digital message history in the same transcript UI used for voice
- **Maestro Communication Events** - Replace `<Transcription>` webhook with `COMMUNICATION_ADDED` events from Maestro for more flexible utterance sources and multi-channel support

**Note:** The `handleConversationEvents` function already handles Maestro conversation webhooks for the participant type workaround. This foundation can be extended to process `COMMUNICATION_ADDED` events for transcript display.

## Prerequisites

- **Twilio account** with one or more voice-capable phone numbers
- **Twilio Flex** instance (the plugin targets Flex UI 2.x)
- **Conversation Intelligence** with at least one configuration (`conv_configuration_xxx`)
- **Twilio Conversations Orchestrator** configured for Flex digital/webchat capture if using digital operator polling
- **Memora store** (`mem_store_xxx`) if using Customer Memory
- **TaskRouter workflow** with a Workflow SID (`WW...`)
- **Node.js** 18 or 20
- **Twilio CLI** with the Flex and Serverless plugins:
  ```bash
  twilio plugins:install @twilio-labs/plugin-serverless
  twilio plugins:install @twilio-labs/plugin-flex
  ```

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/rbangueses/flex-cintel-webchat-analysis-viewer.git
cd flex-cintel-webchat-analysis-viewer

# 2. Install plugin dependencies
npm install

# 3. Install serverless dependencies
cd serverless-ai-playground-plugin
npm install
cd ..

# 4. Configure serverless environment
cp serverless-ai-playground-plugin/.env-template serverless-ai-playground-plugin/.env
# Edit serverless-ai-playground-plugin/.env with your values (see Serverless Setup below)

# 5. Configure phone number mapping
cp serverless-ai-playground-plugin/assets/config.private.json.example serverless-ai-playground-plugin/assets/config.private.json
# Edit serverless-ai-playground-plugin/assets/config.private.json with your phone numbers and config IDs (see Phone Number Config below)

# 6. Deploy serverless functions
cd serverless-ai-playground-plugin
twilio serverless:deploy
cd ..
# Note the deployed domain from the output (e.g., your-service-1234-dev.twil.io)

# 7. Configure Twilio phone numbers
# In Twilio Console > Phone Numbers, set each number's Voice webhook to:
#   https://your-service-1234-dev.twil.io/handleIncomingCall  (POST)

# 8. Set the plugin's serverless domain
export FLEX_APP_SERVERLESS_DOMAIN=your-service-1234-dev.twil.io

# 9. Start the Flex plugin locally
twilio flex:plugins:start
```

Accept a voice call in Flex to see the RealTime Transcription tab and AI Playground panel.

## Serverless Setup

### Environment Variables

Copy `.env-template` to `.env` inside `serverless-ai-playground-plugin/` and fill in the values:

| Variable | Required | Description |
|----------|----------|-------------|
| `ACCOUNT_SID` | Yes | Twilio Account SID (`AC...`) |
| `AUTH_TOKEN` | Yes | Twilio Auth Token |
| `WORKFLOW_SID` | Yes | TaskRouter Workflow SID (`WW...`) |
| `TRANSCRIPTION_DOMAIN_OVERRIDE` | No | Force a specific domain for the transcription webhook URL (useful for ngrok/tunnels). If empty, falls back to `context.DOMAIN_NAME` (auto-populated on deploy) or `TRANSCRIPTION_DOMAIN_WHEN_RUN_LOCAL`. |
| `TRANSCRIPTION_DOMAIN_WHEN_RUN_LOCAL` | No | Fallback transcription webhook domain when running locally (e.g., `your-service-1234-dev.twil.io`) |
| `REALTIME_TRANSCRIPTION` | Yes | Enable real-time transcription (`true`/`false`, case-insensitive) |
| `REALTIME_TRANSCRIPTION_PARTIAL_RESULTS` | Yes | Enable partial (interim) transcription results (`true`/`false`) |
| `SYNC_SERVICE_SID` | No | Sync Service SID (`IS...`) or `default` for the built-in Flex Sync service |
| `MEMORA_STORE_ID` | No | Memora store ID (`mem_store_...`) for Customer Memory features |

### Phone Number Configuration

Create `serverless-ai-playground-plugin/assets/config.private.json` from the example template:

```bash
cp serverless-ai-playground-plugin/assets/config.private.json.example serverless-ai-playground-plugin/assets/config.private.json
```

Then edit `config.private.json` with your configuration:

```json
{
  "defaultConversationConfigId": "conv_configuration_xxx",
  "phoneNumberMapping": {
    "+15555551234": {
      "conversationConfigId": "conv_configuration_xxx",
      "targetWorkers": ["WKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"],
      "description": "My test number"
    },
    "+15555555678": {
      "conversationConfigId": "conv_configuration_yyy",
      "description": "Another number (no worker targeting)"
    }
  }
}
```

- `defaultConversationConfigId` -- fallback Conversation Intelligence config if no mapping matches
- `phoneNumberMapping` keys are **your Twilio phone numbers** (the number being called, not the caller) in E.164 format
  - `conversationConfigId` -- Conversation Intelligence Service ID
  - `targetWorkers` -- (optional) array of Worker SIDs (`WK...`) to route to
  - `description` -- (optional) human-readable label

> **Note:** The `config.private.json` file is gitignored to prevent committing sensitive phone numbers and configuration IDs. Use `config.private.json.example` as a template.

### TaskRouter Workflow

If using worker targeting, add a filter to your workflow:

```json
{
  "filter_friendly_name": "Targeted Workers",
  "expression": "task.targetWorkers == true",
  "targets": [
    {
      "queue": "QUxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "expression": "task.targetWorkersArray HAS worker.sid",
      "priority": 10,
      "timeout": 120
    }
  ]
}
```

### Deployment

```bash
cd serverless-ai-playground-plugin
twilio serverless:deploy
```

After deploying:

1. Note the domain from the output (e.g., `your-service-1234-dev.twil.io`)
2. In Twilio Console, set each phone number's Voice webhook to `https://<domain>/handleIncomingCall` (POST)
3. If `TRANSCRIPTION_DOMAIN_WHEN_RUN_LOCAL` changed, update `.env` and redeploy

## Plugin Setup

The Flex plugin needs one environment variable to communicate with the serverless backend:

```bash
export FLEX_APP_SERVERLESS_DOMAIN=your-service-1234-dev.twil.io
```

Then start the plugin:

```bash
twilio flex:plugins:start
```

## Feature Guide

### RealTime Transcription Tab

Appears as a tab on the task panel during voice calls. Shows a scrollable conversation view with:

- **Customer messages** (left-aligned) from `inbound_track`
- **Agent messages** (right-aligned) from `outbound_track`
- **Partial speech** ("speaking..." bubble) when partial results are enabled
- **Low confidence indicator** when confidence is below 0.7
- **System events** (e.g., "transcription-stopped") centered

Data flows from Twilio's `<Transcription>` webhook through serverless functions into Twilio Sync, then into Redux via the SyncToRedux library, and finally into React components.

### AI Playground Panel (Panel 2)

Opens as a side panel when a supported task is selected.

For voice calls, the panel contains three top-level tabs:

**Realtime Operators** -- Displays results from operators triggered during the conversation. Each operator (Sentiment, Summary, Next-Best-Response, etc.) gets its own subtab that appears automatically when data arrives. Results include back/forward navigation through history and a blue pulse animation on new arrivals.

**Post Call Operators** -- Same layout, but for operators that fire after the conversation ends (e.g., AgentCoaching).

**Customer Memory** -- Looks up the caller's profile in Memora using the task's `from` attribute, then displays four sub-tabs:
- **Memory Retrieval** -- recalled memories relevant to the caller
- **Observations** -- extracted observations from past conversations
- **Conversation Summaries** -- summaries of previous conversations
- **Traits** -- identified customer traits

For Flex Conversations digital tasks, including webchat, the panel shows **Realtime Operators** and **Post Call Operators**. The task's digital channel/conversation SID is used to find the active Conversation Intelligence conversation through `memoryProxy`; operator results are then polled every few seconds while the task remains selected. This assumes Conversation Orchestrator is already capturing and analyzing the digital channel.

### Supervisor View

Supervisors can monitor agent calls from the Teams View. When viewing a monitored call, the Supervisor TaskCanvas includes:

**RealTime Transcription Tab** -- Same real-time transcription view as agents see, showing the live conversation flow.

**Operator Results Tab** -- A dropdown selector displaying all operator results (both realtime and post-call operators combined). Supervisors can:
- Select any operator from the dropdown to view its results
- See result counts for each operator (e.g., "Sentiment (3 results)")
- Navigate through operator result history using the same back/forward/latest controls
- View results with horizontal scrolling when content is wider than the panel

The operator results automatically update as new results arrive during the monitored call. The supervisor tracking is handled by `SupervisorCallTracker`, which subscribes to the same Sync maps as the agent desktop.

### AI Analysis Viewer

The `AI Analysis Viewer` appears as a Flex side-nav view for authenticated Flex users. It calls the `memoryProxy` serverless function with the current Flex token, then retrieves Conversation Intelligence conversations and operator results from the Intelligence API.

The view supports filtering by conversation status, channel, call/channel SID, creation timestamp, Intelligence Configuration ID, and operator ID. Selecting a conversation loads its operator results and groups them by trigger and operator name. This is useful for reviewing post-conversation analysis after the Flex task has been completed and the active task UI no longer has the results in memory.

### Synthetic Webchat Test Helper

For local POC testing, this fork includes a helper script that creates a Twilio Conversation, adds a test webchat customer, sends an initial customer message, and creates a Flex Interaction routed through TaskRouter:

```bash
node scripts/create-flex-webchat-interaction.js --inspect
node scripts/create-flex-webchat-interaction.js --workflow-sid WWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

By default the generated customer is `Test Customer` and the first message is:

```text
Hi, I need help registering a new device on my account.
```

That message is intended to exercise Next-Best-Action style realtime operators during webchat testing. The helper reads Twilio credentials from `serverless-ai-playground-plugin/.env` or standard `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` environment variables.

### Rollback

The last confirmed working baseline before live digital polling is tagged as `ai-analysis-viewer-working-baseline`. To revert local code to that state:

```bash
git reset --hard ai-analysis-viewer-working-baseline
```

If serverless functions were redeployed after that point, redeploy from the reverted checkout.

### TaskRouter Workspace Webhook

The `handleTaskRouterWorkspaceWebhook` function handles conversation cleanup after tasks complete.

### Participant Type Workaround

The `handleConversationEvents` function automatically fixes participant types for conversations hydrated via `<Transcription>`, which incorrectly defaults both participants to `CUSTOMER`. It detects agent participants by matching against Twilio phone numbers on the account and updates them to `HUMAN_AGENT`.

## Project Structure

```
flex-cintel-webchat-analysis-viewer/
  package.json                                    Flex plugin package
  src/
    index.ts                                      Plugin entry point
    AiPlaygroundPlugin.tsx                        Plugin init: Paste, Redux, sync tracking, tab + panel registration
    initPaste.tsx                                 CustomizationProvider setup
    initCallSyncTracking.ts                       afterAcceptTask / afterCompleteTask / afterCancelTask listeners
    components/
      RealTimeTranscription/                      Task panel tab
        RealTimeTranscriptionTab.tsx              Main tab: data fetching + composition
        TranscriptionBubble.tsx                   Finalized transcript bubble
        PartialBubble.tsx                         In-progress "speaking..." bubble
        EventMessage.tsx                          System event message
        types.ts, utils.ts, index.ts
      AiPlayground/                               Panel 2 components
        AiPlaygroundPanel.tsx                     Panel 2 root: tabs container
        RealtimeOperatorsTab.tsx                  OPERATOR-COMMUNICATION-* dynamic subtabs
        PostCallOperatorsTab.tsx                  OPERATOR-CONVERSATION_END-* dynamic subtabs
        OperatorResultCard.tsx                    Single operator result with navigation + animation
        CustomerMemory/                           Customer Memory tab
          CustomerMemoryTab.tsx                   Profile lookup + sub-tabs
          MemoriesPanel.tsx                       Memory Retrieval panel
          ObservationsPanel.tsx                   Observations panel
          ConversationSummariesPanel.tsx          Conversation Summaries panel
          TraitsPanel.tsx                         Traits panel
          useMemora.ts                            Memora API hook
          types.ts, index.ts
        types.ts, utils.ts, index.ts
      Supervisor/                                 Supervisor view components
        SupervisorCallTracker.tsx                 Teams View sync tracking for monitored calls
        SupervisorOperatorResultsTab.tsx          Supervisor TaskCanvas operator results tab with dropdown
      AiAnalysisViewer/                           Flex side-nav archive view
        AiAnalysisViewer.tsx                      Main view: filters, list, and result details
        ConversationFilters.tsx                   Conversation Intelligence filter controls
        ConversationList.tsx                      Selectable conversation browser
        OperatorResultsPanel.tsx                  Grouped operator result display
        api.ts, types.ts, utils.ts                Proxy client, types, and formatting helpers
    utils/
      sync-to-redux/                              Standalone Sync-to-Redux library
        SyncToReduxService.ts                     Main service (singleton)
        hooks.ts                                  React hooks (useTrackedMap, useSyncObject)
        state/syncToReduxSlice.ts                 Redux slice
        types.ts, index.ts
        INDEX.md, README.md, QUICKSTART.md, ...   Library documentation

  serverless-ai-playground-plugin/                Twilio Serverless functions
    .env-template                                 Environment variable template
    assets/
      config.private.json                         Phone number mapping config
    functions/
      handleIncomingCall.protected.js             Incoming call handler (TwiML + transcription + enqueue)
      handleRealtimeTranscription.protected.js    Transcription webhook handler
      handleConversationEvents.protected.js       Participant type workaround
      handleOperatorResult.protected.js           Operator result handler
      handleTaskRouterWorkspaceWebhook.protected.js  TaskRouter event handler
      memoryProxy.js                              Customer Memory and Conversation Intelligence proxy
      realtimeTranscriptionSyncHelper.private.js  Sync integration for transcription
      syncHelper.private.js                       Reusable Sync CRUD operations

  scripts/
    create-flex-webchat-interaction.js            Local helper for creating test Flex webchat interactions

  docs/
    architecture/                                 Implementation deep-dives (for developers and LLM context)
      realtime-transcription-ui.md                RT transcription component architecture
      ai-playground-panel.md                      Panel 2 component tree + data access patterns
      realtime-transcription-serverless.md        Serverless config, deployment, testing, troubleshooting
      realtime-transcription-sync.md              Sync data structures, event flows, race conditions
      sync-helper.md                              syncHelper module API reference
      participant-type-workaround.md              Participant type fix explanation
```

## Configuration Reference

All environment variables across both the serverless backend and the Flex plugin:

### Serverless (`serverless-ai-playground-plugin/.env`)

| Variable | Description |
|----------|-------------|
| `ACCOUNT_SID` | Twilio Account SID (`AC...`) |
| `AUTH_TOKEN` | Twilio Auth Token |
| `WORKFLOW_SID` | TaskRouter Workflow SID (`WW...`) |
| `TRANSCRIPTION_DOMAIN_OVERRIDE` | Force transcription webhook domain (e.g., ngrok URL) |
| `TRANSCRIPTION_DOMAIN_WHEN_RUN_LOCAL` | Fallback domain for local development |
| `REALTIME_TRANSCRIPTION` | Enable real-time transcription (`true`/`false`) |
| `REALTIME_TRANSCRIPTION_PARTIAL_RESULTS` | Enable partial transcription results (`true`/`false`) |
| `SYNC_SERVICE_SID` | Sync Service SID or `default` |
| `MEMORA_STORE_ID` | Memora store ID for Customer Memory (`mem_store_...`) |

### Flex Plugin (shell environment)

| Variable | Description |
|----------|-------------|
| `FLEX_APP_SERVERLESS_DOMAIN` | Deployed serverless domain (e.g., `your-service-1234-dev.twil.io`) |

## Architecture

For implementation details, data structures, and component internals, see the docs in [`docs/architecture/`](docs/architecture/):

- [typescript-and-code-organization.md](docs/architecture/typescript-and-code-organization.md) -- TypeScript type system, code organization patterns, and shared utilities
- [realtime-transcription-ui.md](docs/architecture/realtime-transcription-ui.md) -- RT transcription component architecture and data structures
- [ai-playground-panel.md](docs/architecture/ai-playground-panel.md) -- Panel 2 component tree, data access, rendering, animations
- [realtime-transcription-serverless.md](docs/architecture/realtime-transcription-serverless.md) -- Serverless configuration, deployment, testing procedures, troubleshooting
- [realtime-transcription-sync.md](docs/architecture/realtime-transcription-sync.md) -- Sync integration deep dive (data structures, event flows, race conditions)
- [sync-helper.md](docs/architecture/sync-helper.md) -- syncHelper module API reference with examples and patterns
- [participant-type-workaround.md](docs/architecture/participant-type-workaround.md) -- Participant type fix for `<Transcription>`-hydrated conversations

The SyncToRedux standalone library has its own documentation at [`src/utils/sync-to-redux/INDEX.md`](src/utils/sync-to-redux/INDEX.md).

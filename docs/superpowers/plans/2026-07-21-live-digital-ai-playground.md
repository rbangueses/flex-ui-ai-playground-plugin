# Live Digital AI Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show Conversation Intelligence operator results for active Flex webchat/digital tasks in the existing AI Playground panel.

**Architecture:** Preserve the existing voice path, which uses call SID keyed Sync maps. Add a digital path that extracts likely Conversation/Channel IDs from Flex task attributes, resolves the active CIntel conversation through `memoryProxy`, polls operator results during the task, and renders them with the existing operator result card UI.

**Tech Stack:** Twilio Flex UI 2.x, React 17, Twilio Paste, existing `memoryProxy` CIntel REST proxy, Jest with `babel-jest`/`react-app` transform.

## Global Constraints

- Keep the existing voice call behavior unchanged.
- Do not add new runtime dependencies.
- Use `memoryProxy` for browser-to-Twilio CIntel reads.
- Keep rollback baseline at git tag `ai-analysis-viewer-working-baseline`.
- Treat this as proof-of-concept polling, not a production event-stream architecture.

---

### Task 1: Task Identity Helpers

**Files:**
- Create: `src/utils/taskIdentity.ts`
- Create: `src/utils/taskIdentity.test.js`

**Interfaces:**
- Produces: `getVoiceCallSid(task)`, `getDigitalChannelCandidates(task)`, `getAiPlaygroundTaskIdentity(task)`, `isDigitalTask(task)`.
- Consumes: Flex task-like objects with `attributes` and optional `taskChannelUniqueName`.

- [x] Write failing tests for voice and digital task ID extraction.
- [x] Implement helper functions with a conservative candidate list: `conversationSid`, `conversation_sid`, `channelSid`, `channel_sid`, `channelId`, `channel_id`, `chatChannelSid`, `chat_channel_sid`, `flexInteractionChannelSid`, `interactionChannelSid`.
- [x] Run focused tests and verify they pass.

### Task 2: Digital Operator Polling UI

**Files:**
- Create: `src/components/AiPlayground/DigitalOperatorsTab.tsx`
- Modify: `src/components/AiPlayground/types.ts`

**Interfaces:**
- Consumes: `getDigitalChannelCandidates(task)`, `listConversations(filters)`, `listOperatorResults(filters)`.
- Produces: a tab component compatible with `AiPlaygroundPanel`, with props `{ task?: ITask; mode: 'realtime' | 'postCall' }`.

- [x] Add a local mapper from CIntel `OperatorResult` to existing AI Playground `OperatorResult` shape.
- [x] Poll every 5 seconds while candidates exist and the component is mounted.
- [x] Resolve a CIntel conversation by trying each candidate as `channelId`.
- [x] Split results by trigger: `COMMUNICATION` for realtime, `CONVERSATION_END` for post-call.
- [x] Render loading, empty, error, and grouped operator result states.

### Task 3: Route Digital Tasks In Panel

**Files:**
- Modify: `src/components/AiPlayground/AiPlaygroundPanel.tsx`
- Modify: `src/AiPlaygroundPlugin.tsx`

**Interfaces:**
- Consumes: task identity helpers and `DigitalOperatorsTab`.
- Produces: existing voice UI for call tasks, digital operator tabs for supported digital tasks, and unchanged fallback for unsupported/no task.

- [x] Keep realtime transcription tabs voice-only.
- [x] Keep supervisor voice tabs voice-only.
- [x] Show AI Playground tabs for either voice call tasks or supported digital tasks.
- [x] For digital tasks, show Realtime Operators and Post Call Operators using `DigitalOperatorsTab`; hide Customer Memory until a reliable digital customer identifier is added.

### Task 4: Verification And Rollback Notes

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: completed digital polling UI.
- Produces: test notes and rollback instructions referencing `ai-analysis-viewer-working-baseline`.

- [x] Run focused Jest tests.
- [x] Run TypeScript.
- [x] Run Flex production build from `/tmp/flex-ai-analysis-viewer-build`.
- [x] Update docs with digital PoC behavior and rollback command.

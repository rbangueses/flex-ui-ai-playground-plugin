const { buildIntelligenceUrl } = require("../functions/memoryProxy");

describe("memoryProxy intelligence helpers", () => {
  test("buildIntelligenceUrl appends only supported conversation filters", () => {
    const url = buildIntelligenceUrl("Conversations", {
      status: "CLOSED",
      channels: "VOICE",
      channelId: "CA123",
      pageSize: 25,
      ignored: "nope",
    });

    expect(url.origin + url.pathname).toBe("https://intelligence.twilio.com/v3/Conversations");
    expect(Object.fromEntries(url.searchParams.entries())).toEqual({
      pageSize: "25",
      status: "CLOSED",
      channels: "VOICE",
      channelId: "CA123",
    });
  });

  test("buildIntelligenceUrl supports operator result filters", () => {
    const url = buildIntelligenceUrl("OperatorResults", {
      conversationId: "conversation_123",
      intelligenceConfigurationId: "intelligence_configuration_123",
      operatorId: "intelligence_operator_123",
      pageToken: "abc",
    });

    expect(url.toString()).toBe(
      "https://intelligence.twilio.com/v3/OperatorResults?conversationId=conversation_123&intelligenceConfigurationId=intelligence_configuration_123&operatorId=intelligence_operator_123&pageToken=abc",
    );
  });
});

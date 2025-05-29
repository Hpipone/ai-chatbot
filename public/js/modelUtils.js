/**
 * Utility untuk format payload model (DeepSeek & Groq)
 */
function buildModelPayload(model, systemPrompt, message, temperature, maxTokens) {
  return {
    model,
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: message
      }
    ],
    temperature,
    max_tokens: maxTokens,
    top_p: 0.9,
  };
}

module.exports = {
  buildModelPayload
}; 
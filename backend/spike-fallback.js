// spike-fallback.js — confirm the fallback OpenRouter model supports tool calling.
//
// Usage:  OPENROUTER_API_KEY=sk-... node spike-fallback.js

const BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "openai/gpt-oss-120b:free";

if (!API_KEY) {
  console.error("Missing API key. Set OPENROUTER_API_KEY and rerun.");
  process.exit(1);
}

const tools = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get the current weather for a city.",
      parameters: {
        type: "object",
        properties: { city: { type: "string", description: "City name" } },
        required: ["city"],
      },
    },
  },
];

const res = await fetch(BASE_URL, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: MODEL,
    messages: [
      { role: "user", content: "What is the weather in Lahore? Use the tool." },
    ],
    tools,
    tool_choice: "auto",
  }),
});

if (!res.ok) {
  console.log(`FAIL - HTTP ${res.status}:`);
  console.log(await res.text());
  process.exit(1);
}

const data = await res.json();
const calls = data?.choices?.[0]?.message?.tool_calls;

if (calls && calls.length) {
  console.log(`PASS - ${MODEL} returned a real tool call:`);
  console.log(JSON.stringify(calls, null, 2));
} else {
  console.log(`FAIL - ${MODEL} returned no tool_calls.`);
  console.log("Full response:");
  console.log(JSON.stringify(data, null, 2));
}

// spike.js — confirm your chosen free model can actually MAKE a tool call.
//
// Run this BEFORE building any agent code (Day 1). It defines one trivial tool,
// asks the model to use it, and checks whether a real tool_call comes back.
//   PASS  -> your architecture is safe; build the loop on this model.
//   FAIL  -> this model can't drive the agent; switch model/provider NOW.
//
// Usage:  OPENROUTER_API_KEY=sk-... node spike.js     (Node 18+, built-in fetch)
//
// To test the fallback model (openai/gpt-oss-120b:free), run spike-fallback.js.

// ---- CONFIG ---------------------------------------------------------------
const BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "meta-llama/llama-3.3-70b-instruct"; // a model you'll actually use
// ---------------------------------------------------------------------------

if (!API_KEY) {
  console.error("Missing API key. Set OPENROUTER_API_KEY (or your NIM key) and rerun.");
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
  console.log(`FAIL - HTTP ${res.status}. Provider error before we even saw a tool call:`);
  console.log(await res.text());
  process.exit(1);
}

const data = await res.json();
const calls = data?.choices?.[0]?.message?.tool_calls;

if (calls && calls.length) {
  console.log(`PASS - ${MODEL} returned a real tool call:`);
  console.log(JSON.stringify(calls, null, 2));
} else {
  console.log(`FAIL - ${MODEL} returned no tool_calls. It cannot drive the agent. Try another model/provider.`);
  console.log("Full response for debugging:");
  console.log(JSON.stringify(data, null, 2));
}

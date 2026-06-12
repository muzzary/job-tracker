import dotenv from "dotenv";
dotenv.config();
import { runAgent } from "./agent/agentRunner.js";

const result = await runAgent({
  jobDescription: "Senior Machine learning engineer role at a tech company. Responsibilities include building and deploying ML models, collaborating with data scientists, and optimizing model performance.",
  resumeText: "Muzzary Babar. Skills: React, Node.js, MongoDB, Express. Built JobTracker app.",
});

console.log("=== STEPS ===");
console.log(result.steps);
console.log("\n=== COVER LETTER ===");
console.log(result.coverLetter);
console.log("\n=== INTERVIEW PREP ===");
console.log(result.interviewPrep);
console.log("\n=== RESUME TAILOR ===");
console.log(result.resumeTailor);

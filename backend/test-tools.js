import dotenv from "dotenv";
dotenv.config();
import { generateInterviewPrep } from "./tools/interviewPrep.js";

const result = await generateInterviewPrep({
  jobDescription: "React developer at Acme Corp. Must know React, Node.js, REST APIs.",
  resumeText: "Muzzary Babar. Skills: React, Node.js, MongoDB, Express. Built JobTracker app.",
});
console.log(result);

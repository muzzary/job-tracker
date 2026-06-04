import mongoose from "mongoose";

// Connects the app to MongoDB Atlas using the connection string in .env.
// We keep this in its own file so server.js stays clean and the connection
// logic lives in one place (one concern per file).
const connectDB = async () => {
  try {
    // mongoose.connect returns a promise, so we await it.
    // process.env.MONGO_URI comes from the .env file.
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    // If the connection fails the app cannot work, so we log the reason
    // and stop the process. Exit code 1 means "exited because of an error".
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;

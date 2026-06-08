// Runs before every test file (via jest.config.js setupFiles).
// Sets NODE_ENV to "test" so the app skips rate limiting on auth routes.
process.env.NODE_ENV = "test";

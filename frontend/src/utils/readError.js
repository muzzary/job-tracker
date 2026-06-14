// Turn whatever the backend sent back into a single readable message.
// The API returns either { message } or { errors: [{ msg }] } (express-validator).
// Pass a `fallback` for context-specific wording when neither shape is present.
export function readError(err, fallback = "Something went wrong. Please try again.") {
  const data = err?.response?.data;
  if (data?.errors?.length) return data.errors[0].msg;
  if (data?.message) return data.message;
  return fallback;
}

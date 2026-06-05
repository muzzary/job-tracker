import jwt from "jsonwebtoken";

// Real JWT auth guard (Phase 3).
//
// Any protected route runs this first. It checks for a valid token in the
// "Authorization" header, and if the token is good it attaches the user's id to
// req.user so the controllers know who is making the request. If the token is
// missing or invalid, the request is rejected with 401 (not logged in).
const protect = (req, res, next) => {
  // Tokens are sent as: "Authorization: Bearer <token>".
  const authHeader = req.headers.authorization;

  // If there is no Bearer token, the user is not logged in.
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  // Take the part after "Bearer ".
  const token = authHeader.split(" ")[1];

  try {
    // Verify the token's signature and expiry using our secret.
    // If it was tampered with or has expired, this throws.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the user's id (set when the token was signed) to the request.
    req.user = { id: decoded.id };

    // Token is valid - let the request continue to the controller.
    next();
  } catch (error) {
    // Bad signature, expired, or malformed token.
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};

export default protect;

import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Real JWT auth guard (Phase 3, hardened in Phase 4).
//
// Any protected route runs this first. It checks for a valid token in the
// "Authorization" header AND that the user the token points to still exists.
// If the token is missing/invalid, or the user has since been deleted, the
// request is rejected with 401.
const protect = async (req, res, next) => {
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

    // Look the user up. A token alone isn't enough: if the account was deleted
    // (e.g. the database was cleared) the token must stop working. We drop the
    // password hash from the result so it never travels further than needed.
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Not authorized, user no longer exists" });
    }

    // Attach the verified user to the request so controllers know who it is.
    req.user = { id: user._id, name: user.name, email: user.email };

    // Token is valid and the user exists - continue to the controller.
    next();
  } catch (error) {
    // Bad signature, expired, or malformed token.
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};

export default protect;

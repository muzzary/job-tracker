import mongoose from "mongoose";

// PLACEHOLDER auth middleware for Phase 2.
//
// In Phase 3 this file will verify a real JWT from the request header and
// attach the logged-in user to req.user. For now we just attach a fixed
// placeholder user id so the job CRUD routes can be built and tested before
// authentication exists.
//
// IMPORTANT: this lets every request through. It MUST be replaced with the
// real JWT check in Phase 3 before the app is exposed to real users.
const protect = (req, res, next) => {
  // Attach a temporary, valid ObjectId so controllers that read req.user.id
  // keep working until real auth is wired up.
  req.user = { id: new mongoose.Types.ObjectId("000000000000000000000001") };

  // Let the request continue to the controller.
  next();
};

export default protect;

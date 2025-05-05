const { Permit } = require("permitio");

const permit = new Permit({
  pdp: "https://cloudpdp.api.permit.io",
  token: process.env.PERMIT_API_KEY,
});

const checkPermission = (action, resource) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;  // Extracting userId from the decoded JWT

      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const allowed = await permit.check(userId, resource, action);

      if (!allowed) {
        return res.status(403).json({ error: "Access denied" });
      }

      next();  // If permission granted, proceed to the next middleware/handler
    } catch (err) {
      console.error("Permit error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};

module.exports = checkPermission;
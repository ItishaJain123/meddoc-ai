const router = require("express").Router();
const { requireAuth } = require("../middleware/authMiddleware");
const { chatLimiter } = require("../middleware/rateLimiter");
const {
  ask,
  getConversations,
  getConversation,
  removeConversation,
} = require("../controllers/chatController");

router.use(requireAuth);

router.post("/ask", chatLimiter, ask);
router.get("/conversations", getConversations);
router.get("/conversations/:id", getConversation);
router.delete("/conversations/:id", removeConversation);

module.exports = router;

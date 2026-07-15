const router = require("express").Router();
const { requireAuth } = require("../middleware/authMiddleware");
const { chatLimiter } = require("../middleware/rateLimiter");
const {
  ask,
  askStream,
  getConversations,
  getConversation,
  removeConversation,
} = require("../controllers/chatController");

router.use(requireAuth);

router.post("/ask", chatLimiter, ask);
router.post("/ask/stream", chatLimiter, askStream);
router.get("/conversations", getConversations);
router.get("/conversations/:id", getConversation);
router.delete("/conversations/:id", removeConversation);

module.exports = router;

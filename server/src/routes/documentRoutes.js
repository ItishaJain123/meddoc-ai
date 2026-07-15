const router = require("express").Router();
const { requireAuth } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const { uploadLimiter } = require("../middleware/rateLimiter");
const {
  uploadDocument,
  listDocuments,
  getDocumentStatus,
  getDocumentContent,
  removeDocument,
  reextractDocument,
  retryDocument,
  confirmIdentity,
} = require("../controllers/documentController");

router.use(requireAuth);

router.post("/upload", uploadLimiter, upload.single("file"), uploadDocument);
router.get("/", listDocuments);
router.get("/:id/status", getDocumentStatus);
router.get("/:id/content", getDocumentContent);
router.delete("/:id", removeDocument);
router.post("/:id/reextract", reextractDocument);
router.post("/:id/retry", retryDocument);
router.post("/:id/confirm-identity", confirmIdentity);

module.exports = router;

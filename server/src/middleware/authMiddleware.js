const { clerkMiddleware, getAuth } = require('@clerk/express');
const prisma = require('../config/db');

// Clerk middleware — attach auth to every request
const clerk = clerkMiddleware();

// Protect a route and ensure user exists in our DB
async function requireAuth(req, res, next) {
  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Sync user to MySQL on first request (replaces webhook approach)
  try {
    let user = await prisma.user.findUnique({ where: { clerkId: userId } });

    if (!user) {
      // Fetch user details from Clerk
      const { createClerkClient } = require('@clerk/express');
      const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
      const clerkUser = await clerkClient.users.getUser(userId);

      user = await prisma.user.create({
        data: {
          clerkId: userId,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          fullName: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim(),
        },
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

module.exports = { clerk, requireAuth };

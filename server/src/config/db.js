const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.MEDDOC_NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
});

module.exports = prisma;

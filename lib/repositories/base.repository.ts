import type { PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Every repository extends this to get a shared, typed Prisma handle.
 * Keeps `prisma` out of services/actions/UI code entirely — only
 * repositories talk to the database directly (see Phase 5 backend
 * architecture: Services → Repositories → Prisma → PostgreSQL).
 */
export abstract class BaseRepository {
  protected readonly db: PrismaClient = prisma;
}

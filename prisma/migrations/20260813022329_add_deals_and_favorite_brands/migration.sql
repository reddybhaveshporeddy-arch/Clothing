-- CreateTable
CREATE TABLE "DealsDigest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" INTEGER NOT NULL,
    "items" TEXT NOT NULL DEFAULT '[]',
    "brands" TEXT NOT NULL DEFAULT '[]',
    "refreshedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DealsDigest_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StyleProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" INTEGER NOT NULL,
    "styleVibe" TEXT NOT NULL,
    "preferredColors" TEXT NOT NULL,
    "fit" TEXT NOT NULL,
    "occasion" TEXT NOT NULL,
    "avoidColors" TEXT NOT NULL,
    "mustInclude" TEXT,
    "favoriteBrands" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StyleProfile_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StyleProfile" ("avoidColors", "createdAt", "fit", "id", "mustInclude", "occasion", "preferredColors", "profileId", "styleVibe", "updatedAt") SELECT "avoidColors", "createdAt", "fit", "id", "mustInclude", "occasion", "preferredColors", "profileId", "styleVibe", "updatedAt" FROM "StyleProfile";
DROP TABLE "StyleProfile";
ALTER TABLE "new_StyleProfile" RENAME TO "StyleProfile";
CREATE UNIQUE INDEX "StyleProfile_profileId_key" ON "StyleProfile"("profileId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "DealsDigest_profileId_key" ON "DealsDigest"("profileId");

/*
  Adds profiles, so several people can share one instance with separate
  wardrobes.

  Everything that already exists belongs to whoever was using the app before
  this migration, so we create a profile for them and adopt every existing
  row into it rather than dropping the data.
*/
-- CreateTable
CREATE TABLE "Profile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#ff7a2f',
    "emoji" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Adopt pre-existing data into a default profile (id 1).
-- Only created when there is something to adopt.
INSERT INTO "Profile" ("id", "name", "color", "emoji")
SELECT 1, 'Me', '#ff7a2f', '👕'
WHERE EXISTS (SELECT 1 FROM "ClothingItem")
   OR EXISTS (SELECT 1 FROM "StyleProfile");

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClothingItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL,
    "secondaryColor" TEXT,
    "styleTags" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "notes" TEXT,
    "photoPath" TEXT NOT NULL,
    "timesWorn" INTEGER NOT NULL DEFAULT 0,
    "lastWornDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClothingItem_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ClothingItem" ("profileId", "category", "createdAt", "id", "lastWornDate", "name", "notes", "photoPath", "primaryColor", "season", "secondaryColor", "styleTags", "timesWorn", "type") SELECT 1, "category", "createdAt", "id", "lastWornDate", "name", "notes", "photoPath", "primaryColor", "season", "secondaryColor", "styleTags", "timesWorn", "type" FROM "ClothingItem";
DROP TABLE "ClothingItem";
ALTER TABLE "new_ClothingItem" RENAME TO "ClothingItem";
CREATE INDEX "ClothingItem_profileId_idx" ON "ClothingItem"("profileId");
CREATE TABLE "new_Outfit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "styleNote" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "timesWorn" INTEGER NOT NULL DEFAULT 0,
    "lastWornDate" DATETIME,
    "disliked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Outfit_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Outfit" ("profileId", "createdAt", "disliked", "id", "lastWornDate", "name", "score", "styleNote", "tags", "timesWorn") SELECT 1, "createdAt", "disliked", "id", "lastWornDate", "name", "score", "styleNote", "tags", "timesWorn" FROM "Outfit";
DROP TABLE "Outfit";
ALTER TABLE "new_Outfit" RENAME TO "Outfit";
CREATE INDEX "Outfit_profileId_idx" ON "Outfit"("profileId");
CREATE TABLE "new_StyleProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" INTEGER NOT NULL,
    "styleVibe" TEXT NOT NULL,
    "preferredColors" TEXT NOT NULL,
    "fit" TEXT NOT NULL,
    "occasion" TEXT NOT NULL,
    "avoidColors" TEXT NOT NULL,
    "mustInclude" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StyleProfile_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StyleProfile" ("profileId", "avoidColors", "createdAt", "fit", "id", "mustInclude", "occasion", "preferredColors", "styleVibe", "updatedAt") SELECT 1, "avoidColors", "createdAt", "fit", "id", "mustInclude", "occasion", "preferredColors", "styleVibe", "updatedAt" FROM "StyleProfile";
DROP TABLE "StyleProfile";
ALTER TABLE "new_StyleProfile" RENAME TO "StyleProfile";
CREATE UNIQUE INDEX "StyleProfile_profileId_key" ON "StyleProfile"("profileId");
CREATE TABLE "new_WearLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "profileId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "outfitId" INTEGER,
    "itemId" INTEGER,
    CONSTRAINT "WearLog_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WearLog_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "Outfit" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WearLog_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ClothingItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WearLog" ("profileId", "date", "id", "itemId", "outfitId") SELECT 1, "date", "id", "itemId", "outfitId" FROM "WearLog";
DROP TABLE "WearLog";
ALTER TABLE "new_WearLog" RENAME TO "WearLog";
CREATE INDEX "WearLog_profileId_date_idx" ON "WearLog"("profileId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Profile_name_key" ON "Profile"("name");

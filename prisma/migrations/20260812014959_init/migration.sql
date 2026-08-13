-- CreateTable
CREATE TABLE "StyleProfile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "styleVibe" TEXT NOT NULL,
    "preferredColors" TEXT NOT NULL,
    "fit" TEXT NOT NULL,
    "occasion" TEXT NOT NULL,
    "avoidColors" TEXT NOT NULL,
    "mustInclude" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ClothingItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Outfit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "styleNote" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "timesWorn" INTEGER NOT NULL DEFAULT 0,
    "lastWornDate" DATETIME,
    "disliked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OutfitItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "outfitId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "slot" TEXT NOT NULL,
    CONSTRAINT "OutfitItem_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "Outfit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OutfitItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ClothingItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WearLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "outfitId" INTEGER,
    "itemId" INTEGER,
    CONSTRAINT "WearLog_outfitId_fkey" FOREIGN KEY ("outfitId") REFERENCES "Outfit" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WearLog_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ClothingItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

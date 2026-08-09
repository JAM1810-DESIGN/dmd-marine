-- CreateTable
CREATE TABLE "facebook_comments" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "postId" TEXT,
    "fromName" TEXT,
    "fromId" TEXT,
    "message" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "commentedAt" TIMESTAMP(3),
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facebook_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facebook_reviews" (
    "id" TEXT NOT NULL,
    "reviewKey" TEXT NOT NULL,
    "reviewerName" TEXT,
    "recommendationType" TEXT,
    "text" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facebook_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "facebook_comments_commentId_key" ON "facebook_comments"("commentId");

-- CreateIndex
CREATE INDEX "facebook_comments_commentedAt_idx" ON "facebook_comments"("commentedAt");

-- CreateIndex
CREATE UNIQUE INDEX "facebook_reviews_reviewKey_key" ON "facebook_reviews"("reviewKey");

-- CreateIndex
CREATE INDEX "facebook_reviews_reviewedAt_idx" ON "facebook_reviews"("reviewedAt");

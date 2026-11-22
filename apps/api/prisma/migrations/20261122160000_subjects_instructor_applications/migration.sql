-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "courseFields" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "courses" ADD COLUMN     "extraFields" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "subjectId" TEXT;

-- CreateTable
CREATE TABLE "subjects" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instructor_subjects" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "grantedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instructor_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instructor_applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "headline" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "experience" TEXT NOT NULL,
    "links" TEXT[],
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instructor_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instructor_application_subjects" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "approved" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instructor_application_subjects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subjects_categoryId_slug_key" ON "subjects"("categoryId", "slug");

-- CreateIndex
CREATE INDEX "instructor_subjects_subjectId_idx" ON "instructor_subjects"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "instructor_subjects_userId_subjectId_key" ON "instructor_subjects"("userId", "subjectId");

-- CreateIndex
CREATE INDEX "instructor_applications_status_createdAt_idx" ON "instructor_applications"("status", "createdAt");

-- CreateIndex
CREATE INDEX "instructor_applications_userId_createdAt_idx" ON "instructor_applications"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "instructor_application_subjects_applicationId_subjectId_key" ON "instructor_application_subjects"("applicationId", "subjectId");

-- CreateIndex
CREATE INDEX "courses_subjectId_idx" ON "courses"("subjectId");

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructor_subjects" ADD CONSTRAINT "instructor_subjects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructor_subjects" ADD CONSTRAINT "instructor_subjects_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructor_subjects" ADD CONSTRAINT "instructor_subjects_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructor_applications" ADD CONSTRAINT "instructor_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructor_applications" ADD CONSTRAINT "instructor_applications_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructor_application_subjects" ADD CONSTRAINT "instructor_application_subjects_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "instructor_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructor_application_subjects" ADD CONSTRAINT "instructor_application_subjects_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Instructors may now apply for extra subjects, so the INSTRUCTOR role gets the submit permission.
-- ADMIN gets it too: admins can only hand out roles whose permissions they hold themselves.
-- (Only where the permission catalog has already been synced; fresh databases get it from the defaults.)
INSERT INTO "role_permissions" ("id", "roleId", "permissionKey", "updatedAt")
SELECT 'rp_app_submit_' || lower(r."key"), r."id", p."key", CURRENT_TIMESTAMP
FROM "roles" r, "permissions" p
WHERE r."key" IN ('INSTRUCTOR', 'ADMIN') AND p."key" = 'instructor_application.submit'
ON CONFLICT ("roleId", "permissionKey") DO NOTHING;

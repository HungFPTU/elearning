import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client.js';

config({ path: '../../.env' });

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }) });

// Dev-only password for every seeded account.
const DEV_PASSWORD = 'Password123!';

async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  const upsertUser = (email: string, fullName: string, role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN') =>
    prisma.user.upsert({ where: { email }, update: {}, create: { email, fullName, role, passwordHash } });

  await upsertUser('admin@elearning.local', 'Quản trị viên', 'ADMIN');
  const instructor = await upsertUser('instructor@elearning.local', 'Nguyễn Văn Giảng', 'INSTRUCTOR');
  await upsertUser('student@elearning.local', 'Trần Thị Học', 'STUDENT');

  const categories = await Promise.all(
    [
      { name: 'Lập trình Web', slug: 'lap-trinh-web' },
      { name: 'Khoa học dữ liệu', slug: 'khoa-hoc-du-lieu' },
      { name: 'Thiết kế', slug: 'thiet-ke' },
    ].map((c) => prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c })),
  );

  const courses = [
    { title: 'Next.js từ cơ bản đến nâng cao', slug: 'nextjs-co-ban-den-nang-cao', price: 899000, salePrice: 499000, level: 'BEGINNER', cat: 0 },
    { title: 'NestJS xây dựng REST API chuyên nghiệp', slug: 'nestjs-rest-api', price: 799000, salePrice: null, level: 'INTERMEDIATE', cat: 0 },
    { title: 'Python cho phân tích dữ liệu', slug: 'python-phan-tich-du-lieu', price: 699000, salePrice: 399000, level: 'BEGINNER', cat: 1 },
    { title: 'Figma UI/UX thực chiến', slug: 'figma-ui-ux-thuc-chien', price: 599000, salePrice: null, level: 'ALL_LEVELS', cat: 2 },
  ] as const;

  for (const c of courses) {
    const exists = await prisma.course.findUnique({ where: { slug: c.slug }, select: { id: true } });
    if (exists) continue;
    await prisma.course.create({
      data: {
        title: c.title,
        slug: c.slug,
        subtitle: 'Khóa học thực hành với dự án thực tế',
        description: `Trong khóa học "${c.title}", bạn sẽ học qua các bài giảng video ngắn gọn và dự án thực tế.`,
        price: c.price,
        salePrice: c.salePrice,
        level: c.level,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        instructorId: instructor.id,
        categoryId: categories[c.cat]!.id,
        sections: {
          create: [1, 2, 3].map((s) => ({
            title: `Chương ${s}`,
            position: s,
            lessons: {
              create: [1, 2, 3].map((l) => ({
                title: `Bài ${s}.${l}`,
                position: l,
                durationSeconds: 300 + l * 60,
                isPreview: s === 1 && l === 1,
              })),
            },
          })),
        },
      },
    });
  }
  console.log(`Seeded. Dev accounts use password: ${DEV_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

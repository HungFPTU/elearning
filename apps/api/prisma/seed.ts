/**
 * Dev seed: roles + permissions, an owner (from OWNER_EMAIL), staff, instructors, students,
 * a catalog of courses in every status, paid orders with enrollments, and reviews.
 * Safe to run more than once: existing users and courses are left as they are.
 */
import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
  PERMISSION_KEYS,
  ROLE_LABELS,
  Role,
  type SystemRole,
} from '@elearning/shared';
import { PrismaClient } from '../src/generated/prisma/client.js';
import type { CourseLevel, CourseStatus } from '../src/generated/prisma/enums.js';

config({ path: '../../.env' });

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL'] }) });

// Dev-only password for every seeded account (the owner can use OWNER_PASSWORD instead).
const DEV_PASSWORD = 'Password123!';
const DAY_MS = 24 * 60 * 60 * 1000;
const SEED_NOW = Date.UTC(2026, 10, 20);

/** Small deterministic PRNG so every run produces the same data. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const rand = rng(42);
const pick = <T>(list: readonly T[]): T => list[Math.floor(rand() * list.length)]!;
const daysAgo = (days: number) => new Date(SEED_NOW - days * DAY_MS);

async function seedRoles(): Promise<Record<SystemRole, string>> {
  for (const key of PERMISSION_KEYS) {
    const { group, label } = PERMISSIONS[key];
    await prisma.permission.upsert({ where: { key }, update: { group, label }, create: { key, group, label } });
  }
  const ids = {} as Record<SystemRole, string>;
  for (const [key, defaults] of Object.entries(DEFAULT_ROLE_PERMISSIONS) as [SystemRole, string[]][]) {
    const role = await prisma.role.upsert({
      where: { key },
      update: { isSystem: true },
      create: { key, name: ROLE_LABELS[key], isSystem: true },
      select: { id: true, _count: { select: { permissions: true } } },
    });
    ids[key] = role.id;
    if (role._count.permissions === 0) {
      await prisma.rolePermission.createMany({ data: defaults.map((permissionKey) => ({ roleId: role.id, permissionKey })) });
    }
  }
  return ids;
}

interface SeedUser {
  email: string;
  fullName: string;
  role: SystemRole;
  bio?: string;
  status?: 'ACTIVE' | 'LOCKED';
  createdDaysAgo: number;
}

const STAFF: SeedUser[] = [
  { email: 'admin@elearning.local', fullName: 'Quản trị viên', role: Role.ADMIN, createdDaysAgo: 120 },
  { email: 'kiemduyet@elearning.local', fullName: 'Đỗ Minh Duyệt', role: Role.ADMIN, createdDaysAgo: 90 },
];

const INSTRUCTORS: SeedUser[] = [
  {
    email: 'instructor@elearning.local',
    fullName: 'Nguyễn Văn Giảng',
    role: Role.INSTRUCTOR,
    bio: 'Kỹ sư phần mềm 10 năm kinh nghiệm, chuyên JavaScript và kiến trúc web.',
    createdDaysAgo: 110,
  },
  {
    email: 'le.hoa@elearning.local',
    fullName: 'Lê Thị Hóa',
    role: Role.INSTRUCTOR,
    bio: 'Giáo viên Hóa học THPT chuyên, 12 năm luyện thi đại học.',
    createdDaysAgo: 100,
  },
  {
    email: 'pham.tin@elearning.local',
    fullName: 'Phạm Quốc Tín',
    role: Role.INSTRUCTOR,
    bio: 'Data engineer, từng làm tại các công ty fintech.',
    createdDaysAgo: 95,
  },
  {
    email: 'tran.anh@elearning.local',
    fullName: 'Trần Mai Anh',
    role: Role.INSTRUCTOR,
    bio: 'IELTS 8.5, 8 năm dạy tiếng Anh giao tiếp và luyện thi.',
    createdDaysAgo: 80,
  },
  {
    email: 'vo.thiet@elearning.local',
    fullName: 'Võ Thanh Thiết',
    role: Role.INSTRUCTOR,
    bio: 'Product designer, giảng viên UI/UX.',
    createdDaysAgo: 70,
  },
];

const STUDENT_NAMES = [
  'Trần Thị Học',
  'Nguyễn Minh Khang',
  'Lê Bảo Ngọc',
  'Phạm Gia Huy',
  'Hoàng Thu Trang',
  'Vũ Đức Anh',
  'Đặng Khánh Linh',
  'Bùi Quang Minh',
  'Ngô Thảo Vy',
  'Dương Tuấn Kiệt',
  'Lý Hải Yến',
  'Mai Phương Thảo',
];

const STUDENTS: SeedUser[] = STUDENT_NAMES.map((fullName, i) => ({
  email: i === 0 ? 'student@elearning.local' : `hocvien${String(i).padStart(2, '0')}@elearning.local`,
  fullName,
  role: Role.USER,
  // One locked account so the admin screens have something to show.
  status: i === STUDENT_NAMES.length - 1 ? 'LOCKED' : 'ACTIVE',
  createdDaysAgo: 60 - i * 4,
}));

async function seedUsers(roleIds: Record<SystemRole, string>, passwordHash: string) {
  const byEmail = new Map<string, string>();
  for (const u of [...STAFF, ...INSTRUCTORS, ...STUDENTS]) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        fullName: u.fullName,
        bio: u.bio,
        status: u.status ?? 'ACTIVE',
        roleId: roleIds[u.role],
        passwordHash,
        createdAt: daysAgo(u.createdDaysAgo),
      },
      select: { id: true },
    });
    byEmail.set(u.email, user.id);
  }

  const ownerEmail = process.env['OWNER_EMAIL']?.trim().toLowerCase();
  if (!ownerEmail) {
    console.warn('OWNER_EMAIL is not set: no owner account was seeded.');
    return byEmail;
  }
  const ownerPassword = process.env['OWNER_PASSWORD'];
  await prisma.user.upsert({
    where: { email: ownerEmail },
    // Existing account: only promote it, never touch the password.
    update: { roleId: roleIds.OWNER, status: 'ACTIVE' },
    create: {
      email: ownerEmail,
      fullName: 'Bond',
      roleId: roleIds.OWNER,
      passwordHash: ownerPassword ? await bcrypt.hash(ownerPassword, 10) : passwordHash,
      createdAt: daysAgo(150),
    },
  });
  console.log(`Owner: ${ownerEmail}${ownerPassword ? '' : ` (password ${DEV_PASSWORD})`}`);
  return byEmail;
}

const GRADE_FIELD = { key: 'grade', label: 'Lớp', type: 'select', options: ['10', '11', '12'], required: true } as const;
const EXAM_FIELD = {
  key: 'exam',
  label: 'Kỳ thi hướng tới',
  type: 'select',
  options: ['Tốt nghiệp THPT', 'Đánh giá năng lực', 'Học sinh giỏi'],
  required: false,
} as const;

interface SeedCategory {
  name: string;
  slug: string;
  description: string;
  courseFields: readonly object[];
  subjects: [name: string, slug: string][];
}

const CATEGORIES: SeedCategory[] = [
  {
    name: 'Lập trình Web',
    slug: 'lap-trinh-web',
    description: 'Frontend, backend và các công nghệ web hiện đại.',
    courseFields: [{ key: 'tech_stack', label: 'Công nghệ chính', type: 'text', options: [], required: false }],
    subjects: [
      ['Frontend', 'frontend'],
      ['Backend', 'backend'],
      ['JavaScript và TypeScript', 'javascript-typescript'],
    ],
  },
  {
    name: 'Khoa học dữ liệu',
    slug: 'khoa-hoc-du-lieu',
    description: 'Phân tích dữ liệu, SQL và machine learning.',
    courseFields: [],
    subjects: [
      ['Python cho dữ liệu', 'python-du-lieu'],
      ['SQL', 'sql'],
      ['Machine Learning', 'machine-learning'],
    ],
  },
  {
    name: 'Thiết kế',
    slug: 'thiet-ke',
    description: 'UI/UX và thiết kế đồ họa.',
    courseFields: [],
    subjects: [
      ['UI/UX', 'ui-ux'],
      ['Đồ họa', 'do-hoa'],
    ],
  },
  {
    name: 'Hóa học',
    slug: 'hoa-hoc',
    description: 'Hóa học phổ thông và luyện thi.',
    courseFields: [GRADE_FIELD, EXAM_FIELD],
    subjects: [
      ['Hóa 10', 'hoa-10'],
      ['Hóa 11', 'hoa-11'],
      ['Hóa 12', 'hoa-12'],
    ],
  },
  {
    name: 'Toán học',
    slug: 'toan-hoc',
    description: 'Toán phổ thông và luyện thi.',
    courseFields: [GRADE_FIELD, EXAM_FIELD],
    subjects: [
      ['Toán 10', 'toan-10'],
      ['Toán 11', 'toan-11'],
      ['Toán 12', 'toan-12'],
    ],
  },
  {
    name: 'Ngoại ngữ',
    slug: 'ngoai-ngu',
    description: 'Tiếng Anh, tiếng Nhật và luyện thi chứng chỉ.',
    courseFields: [
      {
        key: 'language',
        label: 'Ngôn ngữ',
        type: 'select',
        options: ['Tiếng Anh', 'Tiếng Nhật', 'Tiếng Hàn'],
        required: true,
      },
      { key: 'target_level', label: 'Trình độ đầu ra (VD: IELTS 6.5, B2)', type: 'text', options: [], required: false },
    ],
    subjects: [
      ['Tiếng Anh giao tiếp', 'tieng-anh-giao-tiep'],
      ['IELTS', 'ielts'],
      ['Tiếng Nhật', 'tieng-nhat'],
    ],
  },
  {
    name: 'Kỹ năng mềm',
    slug: 'ky-nang-mem',
    description: 'Thuyết trình, quản lý thời gian và làm việc nhóm.',
    courseFields: [],
    subjects: [
      ['Thuyết trình', 'thuyet-trinh'],
      ['Quản lý thời gian', 'quan-ly-thoi-gian'],
    ],
  },
];

/** Course slug -> [subject slug, values for the category's extra fields]. */
const COURSE_SUBJECTS: Record<string, [string, Record<string, string>?]> = {
  'nextjs-co-ban-den-nang-cao': ['frontend', { tech_stack: 'Next.js, React' }],
  'nestjs-rest-api': ['backend', { tech_stack: 'NestJS, Prisma, PostgreSQL' }],
  'javascript-nen-tang': ['javascript-typescript'],
  'typescript-thuc-chien': ['javascript-typescript', { tech_stack: 'TypeScript' }],
  'python-phan-tich-du-lieu': ['python-du-lieu'],
  'sql-tu-zero': ['sql'],
  'machine-learning-co-ban': ['machine-learning'],
  'hoa-hoc-12-luyen-thi': ['hoa-12', { grade: '12', exam: 'Tốt nghiệp THPT' }],
  'hoa-huu-co-11': ['hoa-11', { grade: '11' }],
  'hoa-hoc-10-cau-tao-nguyen-tu': ['hoa-10', { grade: '10' }],
  'toan-12-ham-so': ['toan-12', { grade: '12', exam: 'Tốt nghiệp THPT' }],
  'tieng-anh-giao-tiep-di-lam': ['tieng-anh-giao-tiep', { language: 'Tiếng Anh', target_level: 'B1-B2' }],
  'ielts-65-cap-toc': ['ielts', { language: 'Tiếng Anh', target_level: 'IELTS 6.5' }],
  'figma-ui-ux-thuc-chien': ['ui-ux'],
  'ky-nang-thuyet-trinh': ['thuyet-trinh'],
};

interface SeedCourse {
  title: string;
  slug: string;
  subtitle: string;
  category: string;
  instructor: string;
  price: number;
  salePrice: number | null;
  level: CourseLevel;
  status: CourseStatus;
  sections: [string, string[]][];
}

const COURSES: SeedCourse[] = [
  {
    title: 'Next.js từ cơ bản đến nâng cao',
    slug: 'nextjs-co-ban-den-nang-cao',
    subtitle: 'Xây dựng ứng dụng web hiện đại với App Router và Server Components',
    category: 'lap-trinh-web',
    instructor: 'instructor@elearning.local',
    price: 899000,
    salePrice: 499000,
    level: 'BEGINNER',
    status: 'PUBLISHED',
    sections: [
      ['Làm quen với Next.js', ['Next.js là gì và vì sao nên dùng', 'Cài đặt môi trường', 'Cấu trúc thư mục App Router']],
      ['Routing và Layout', ['Route động và nhóm route', 'Layout lồng nhau', 'Loading và error UI', 'Bài tập: trang blog']],
      ['Lấy dữ liệu', ['Server Components', 'Cache và revalidate', 'Server Actions', 'Xử lý form']],
      ['Triển khai', ['Biến môi trường', 'Tối ưu hình ảnh và font', 'Deploy lên Vercel']],
    ],
  },
  {
    title: 'NestJS xây dựng REST API chuyên nghiệp',
    slug: 'nestjs-rest-api',
    subtitle: 'Kiến trúc module, xác thực JWT, Prisma và kiểm thử',
    category: 'lap-trinh-web',
    instructor: 'instructor@elearning.local',
    price: 799000,
    salePrice: null,
    level: 'INTERMEDIATE',
    status: 'PUBLISHED',
    sections: [
      ['Nền tảng NestJS', ['Module, Controller, Provider', 'Dependency Injection', 'Pipe và validation']],
      ['Cơ sở dữ liệu với Prisma', ['Thiết kế schema', 'Migration', 'Quan hệ và transaction']],
      ['Bảo mật', ['JWT và refresh token', 'Guard và phân quyền', 'Rate limiting']],
      ['Kiểm thử', ['Unit test với Vitest', 'E2E test', 'CI cơ bản']],
    ],
  },
  {
    title: 'JavaScript nền tảng cho người mới',
    slug: 'javascript-nen-tang',
    subtitle: 'Nắm chắc JavaScript trước khi học framework',
    category: 'lap-trinh-web',
    instructor: 'instructor@elearning.local',
    price: 499000,
    salePrice: 299000,
    level: 'BEGINNER',
    status: 'PUBLISHED',
    sections: [
      ['Cú pháp cơ bản', ['Biến và kiểu dữ liệu', 'Toán tử và điều kiện', 'Vòng lặp']],
      ['Hàm và đối tượng', ['Hàm và scope', 'Object và array', 'Destructuring và spread']],
      ['Bất đồng bộ', ['Callback', 'Promise', 'async/await', 'Gọi API với fetch']],
    ],
  },
  {
    title: 'TypeScript thực chiến cho dự án lớn',
    slug: 'typescript-thuc-chien',
    subtitle: 'Generic, type nâng cao và cấu hình strict',
    category: 'lap-trinh-web',
    instructor: 'instructor@elearning.local',
    price: 699000,
    salePrice: null,
    level: 'ADVANCED',
    status: 'PENDING_REVIEW',
    sections: [
      ['Hệ thống kiểu', ['Union và narrowing', 'Generic', 'Conditional type']],
      ['Áp dụng vào dự án', ['Cấu hình tsconfig strict', 'Kiểu cho API', 'Chia sẻ kiểu giữa frontend và backend']],
    ],
  },
  {
    title: 'Python cho phân tích dữ liệu',
    slug: 'python-phan-tich-du-lieu',
    subtitle: 'Pandas, NumPy và trực quan hóa dữ liệu',
    category: 'khoa-hoc-du-lieu',
    instructor: 'pham.tin@elearning.local',
    price: 699000,
    salePrice: 399000,
    level: 'BEGINNER',
    status: 'PUBLISHED',
    sections: [
      ['Python căn bản', ['Cài đặt Anaconda và Jupyter', 'Kiểu dữ liệu và hàm', 'List, dict và vòng lặp']],
      ['Pandas', ['DataFrame và Series', 'Lọc, nhóm và tổng hợp', 'Làm sạch dữ liệu']],
      ['Trực quan hóa', ['Matplotlib', 'Seaborn', 'Dự án: phân tích doanh số']],
    ],
  },
  {
    title: 'SQL từ zero đến phân tích',
    slug: 'sql-tu-zero',
    subtitle: 'Truy vấn, join, window function cho người làm dữ liệu',
    category: 'khoa-hoc-du-lieu',
    instructor: 'pham.tin@elearning.local',
    price: 599000,
    salePrice: 349000,
    level: 'ALL_LEVELS',
    status: 'PUBLISHED',
    sections: [
      ['Truy vấn cơ bản', ['SELECT và WHERE', 'ORDER BY và LIMIT', 'Hàm tổng hợp']],
      ['Kết hợp bảng', ['INNER JOIN', 'LEFT JOIN', 'Subquery']],
      ['Nâng cao', ['Window function', 'CTE', 'Tối ưu truy vấn']],
    ],
  },
  {
    title: 'Machine Learning cơ bản với scikit-learn',
    slug: 'machine-learning-co-ban',
    subtitle: 'Hồi quy, phân loại và đánh giá mô hình',
    category: 'khoa-hoc-du-lieu',
    instructor: 'pham.tin@elearning.local',
    price: 1299000,
    salePrice: null,
    level: 'INTERMEDIATE',
    status: 'DRAFT',
    sections: [
      ['Chuẩn bị', ['Machine Learning là gì', 'Chuẩn bị dữ liệu']],
      ['Mô hình', ['Hồi quy tuyến tính', 'Cây quyết định', 'Đánh giá mô hình']],
    ],
  },
  {
    title: 'Hóa học 12: Luyện thi tốt nghiệp THPT',
    slug: 'hoa-hoc-12-luyen-thi',
    subtitle: 'Hệ thống toàn bộ kiến thức Hóa 12 và chiến thuật làm bài',
    category: 'hoa-hoc',
    instructor: 'le.hoa@elearning.local',
    price: 899000,
    salePrice: 599000,
    level: 'INTERMEDIATE',
    status: 'PUBLISHED',
    sections: [
      ['Este và Lipit', ['Khái niệm và danh pháp este', 'Phản ứng thủy phân', 'Bài tập este đa chức']],
      ['Cacbohiđrat', ['Glucozơ và fructozơ', 'Saccarozơ, tinh bột, xenlulozơ', 'Bài tập tổng hợp']],
      ['Amin, Amino axit, Protein', ['Amin', 'Amino axit', 'Peptit và protein']],
      ['Kim loại', ['Dãy điện hóa', 'Điện phân', 'Kim loại kiềm và kiềm thổ', 'Sắt và hợp chất']],
    ],
  },
  {
    title: 'Hóa hữu cơ 11 nền tảng',
    slug: 'hoa-huu-co-11',
    subtitle: 'Hiđrocacbon và dẫn xuất, học chắc từ gốc',
    category: 'hoa-hoc',
    instructor: 'le.hoa@elearning.local',
    price: 649000,
    salePrice: null,
    level: 'BEGINNER',
    status: 'PUBLISHED',
    sections: [
      ['Đại cương hữu cơ', ['Công thức phân tử', 'Đồng đẳng và đồng phân']],
      ['Hiđrocacbon', ['Ankan', 'Anken và ankin', 'Aren']],
      ['Dẫn xuất', ['Ancol và phenol', 'Anđehit và axit cacboxylic']],
    ],
  },
  {
    title: 'Hóa học 10: Cấu tạo nguyên tử',
    slug: 'hoa-hoc-10-cau-tao-nguyen-tu',
    subtitle: 'Bảng tuần hoàn, liên kết hóa học và phản ứng oxi hóa khử',
    category: 'hoa-hoc',
    instructor: 'le.hoa@elearning.local',
    price: 499000,
    salePrice: null,
    level: 'BEGINNER',
    status: 'PENDING_REVIEW',
    sections: [
      ['Nguyên tử', ['Thành phần nguyên tử', 'Cấu hình electron']],
      ['Bảng tuần hoàn', ['Cấu tạo bảng tuần hoàn', 'Định luật tuần hoàn']],
    ],
  },
  {
    title: 'Toán 12: Hàm số và khảo sát đồ thị',
    slug: 'toan-12-ham-so',
    subtitle: 'Đơn điệu, cực trị, tiệm cận và bài toán thực tế',
    category: 'toan-hoc',
    instructor: 'le.hoa@elearning.local',
    price: 549000,
    salePrice: 449000,
    level: 'INTERMEDIATE',
    status: 'ARCHIVED',
    sections: [
      ['Khảo sát hàm số', ['Tính đơn điệu', 'Cực trị', 'Giá trị lớn nhất, nhỏ nhất']],
      ['Đồ thị', ['Tiệm cận', 'Đọc đồ thị', 'Bài toán tương giao']],
    ],
  },
  {
    title: 'Tiếng Anh giao tiếp cho người đi làm',
    slug: 'tieng-anh-giao-tiep-di-lam',
    subtitle: 'Tự tin họp, thuyết trình và viết email bằng tiếng Anh',
    category: 'ngoai-ngu',
    instructor: 'tran.anh@elearning.local',
    price: 799000,
    salePrice: 499000,
    level: 'ALL_LEVELS',
    status: 'PUBLISHED',
    sections: [
      ['Phát âm', ['Bảng phiên âm IPA', 'Trọng âm và ngữ điệu']],
      ['Giao tiếp công sở', ['Giới thiệu bản thân', 'Tham gia cuộc họp', 'Small talk với đồng nghiệp']],
      ['Viết', ['Cấu trúc email chuyên nghiệp', 'Email xin nghỉ, báo cáo, đề xuất']],
    ],
  },
  {
    title: 'IELTS 6.5+ cấp tốc',
    slug: 'ielts-65-cap-toc',
    subtitle: 'Chiến lược 4 kỹ năng trong 8 tuần',
    category: 'ngoai-ngu',
    instructor: 'tran.anh@elearning.local',
    price: 1490000,
    salePrice: 990000,
    level: 'INTERMEDIATE',
    status: 'PUBLISHED',
    sections: [
      ['Listening', ['Các dạng câu hỏi', 'Kỹ thuật nghe từ khóa']],
      ['Reading', ['Skimming và scanning', 'True/False/Not Given']],
      ['Writing', ['Task 1: biểu đồ', 'Task 2: nghị luận']],
      ['Speaking', ['Part 1', 'Part 2 và Part 3']],
    ],
  },
  {
    title: 'Figma UI/UX thực chiến',
    slug: 'figma-ui-ux-thuc-chien',
    subtitle: 'Thiết kế giao diện app từ wireframe đến prototype',
    category: 'thiet-ke',
    instructor: 'vo.thiet@elearning.local',
    price: 599000,
    salePrice: null,
    level: 'ALL_LEVELS',
    status: 'PUBLISHED',
    sections: [
      ['Figma căn bản', ['Giao diện Figma', 'Frame, group và auto layout']],
      ['Thiết kế hệ thống', ['Component và variant', 'Design token']],
      ['Prototype', ['Tương tác và chuyển cảnh', 'Bàn giao cho lập trình viên']],
    ],
  },
  {
    title: 'Kỹ năng thuyết trình thuyết phục',
    slug: 'ky-nang-thuyet-trinh',
    subtitle: 'Cấu trúc bài nói, slide và cách làm chủ sân khấu',
    category: 'ky-nang-mem',
    instructor: 'vo.thiet@elearning.local',
    price: 399000,
    salePrice: 199000,
    level: 'BEGINNER',
    status: 'DRAFT',
    sections: [
      ['Chuẩn bị', ['Xác định mục tiêu', 'Xây dựng câu chuyện']],
      ['Trình bày', ['Ngôn ngữ cơ thể', 'Xử lý câu hỏi khó']],
    ],
  },
];

const REVIEW_COMMENTS: Record<number, string[]> = {
  5: [
    'Khóa học rất chi tiết, giảng viên giải thích dễ hiểu.',
    'Đáng tiền! Học xong áp dụng được vào công việc ngay.',
    'Bài giảng ngắn gọn, có bài tập thực hành đầy đủ.',
    'Tuyệt vời, mình đã giới thiệu cho bạn bè.',
  ],
  4: [
    'Nội dung tốt, mong có thêm bài tập nâng cao.',
    'Giảng viên nhiệt tình, âm thanh một vài bài hơi nhỏ.',
    'Khá ổn, phần cuối hơi nhanh.',
  ],
  3: ['Nội dung ổn nhưng hơi cơ bản so với mong đợi.', 'Cần cập nhật thêm ví dụ mới.'],
};

async function seedCatalog(users: Map<string, string>) {
  const categoryIds = new Map<string, string>();
  const subjectIds = new Map<string, string>();
  for (const [position, { subjects, courseFields, ...c }] of CATEGORIES.entries()) {
    const data = { ...c, position, courseFields: courseFields as object[] };
    const row = await prisma.category.upsert({ where: { slug: c.slug }, update: data, create: data });
    categoryIds.set(c.slug, row.id);
    for (const [i, [name, slug]] of subjects.entries()) {
      const subject = await prisma.subject.upsert({
        where: { categoryId_slug: { categoryId: row.id, slug } },
        update: { name, position: i },
        create: { categoryId: row.id, name, slug, position: i },
      });
      subjectIds.set(slug, subject.id);
    }
  }
  const subjectFields = (courseSlug: string) => {
    const [subjectSlug, extra] = COURSE_SUBJECTS[courseSlug] ?? [];
    return { subjectId: subjectSlug ? subjectIds.get(subjectSlug) : undefined, extraFields: extra ?? {} };
  };

  for (const [i, c] of COURSES.entries()) {
    const exists = await prisma.course.findUnique({ where: { slug: c.slug }, select: { id: true } });
    if (exists) {
      await prisma.course.update({
        where: { id: exists.id },
        data: { status: c.status, categoryId: categoryIds.get(c.category), ...subjectFields(c.slug) },
      });
      continue;
    }
    const createdAt = daysAgo(60 - i * 3);
    await prisma.course.create({
      data: {
        title: c.title,
        slug: c.slug,
        subtitle: c.subtitle,
        description:
          `${c.subtitle}.\n\nKhóa học "${c.title}" gồm ${c.sections.length} chương với bài giảng video ngắn gọn, ` +
          'bài tập sau mỗi chương và tài liệu tải về. Phù hợp cho người muốn học bài bản và áp dụng ngay.',
        price: c.price,
        salePrice: c.salePrice,
        level: c.level,
        status: c.status,
        publishedAt: c.status === 'PUBLISHED' || c.status === 'ARCHIVED' ? new Date(createdAt.getTime() + 2 * DAY_MS) : null,
        createdAt,
        instructorId: users.get(c.instructor)!,
        categoryId: categoryIds.get(c.category)!,
        ...subjectFields(c.slug),
        sections: {
          create: c.sections.map(([title, lessons], s) => ({
            title,
            position: s + 1,
            lessons: {
              create: lessons.map((lessonTitle, l) => ({
                title: lessonTitle,
                position: l + 1,
                durationSeconds: 240 + Math.floor(rand() * 900),
                isPreview: s === 0 && l === 0,
              })),
            },
          })),
        },
      },
    });
  }
}

/** Paid VNPay orders (one per student) that enroll students into published courses, plus reviews. */
/** Every instructor may teach the subjects of their own courses; plus sample applications in each state. */
async function seedInstructors(users: Map<string, string>) {
  const courses = await prisma.course.findMany({ where: { subjectId: { not: null } }, select: { instructorId: true, subjectId: true } });
  await prisma.instructorSubject.createMany({
    data: courses.map((c) => ({ userId: c.instructorId, subjectId: c.subjectId! })),
    skipDuplicates: true,
  });

  const subjectId = async (slug: string) => (await prisma.subject.findFirstOrThrow({ where: { slug }, select: { id: true } })).id;
  const adminId = users.get('admin@elearning.local')!;
  const samples = [
    {
      email: 'hocvien02@elearning.local',
      subjects: ['hoa-10', 'hoa-11'],
      headline: 'Sinh viên năm cuối sư phạm Hóa, gia sư 3 năm',
      status: 'PENDING',
    },
    {
      email: 'hocvien03@elearning.local',
      subjects: ['frontend'],
      headline: 'Frontend developer 4 năm kinh nghiệm React',
      status: 'PENDING',
    },
    {
      email: 'tran.anh@elearning.local',
      subjects: ['tieng-nhat'],
      headline: 'Muốn mở thêm khóa tiếng Nhật N5 (JLPT N2)',
      status: 'PENDING',
    },
    {
      email: 'hocvien04@elearning.local',
      subjects: ['ielts'],
      headline: 'IELTS 7.0, muốn dạy luyện thi',
      status: 'REJECTED',
      note: 'Chưa có kinh nghiệm giảng dạy và bài giảng mẫu. Bạn có thể gửi lại kèm video dạy thử.',
    },
    {
      email: 'le.hoa@elearning.local',
      subjects: ['hoa-10', 'hoa-11', 'hoa-12'],
      headline: 'Giáo viên Hóa THPT chuyên, 12 năm luyện thi',
      status: 'APPROVED',
      note: 'Hồ sơ tốt.',
    },
  ] as const;

  for (const [i, a] of samples.entries()) {
    const userId = users.get(a.email)!;
    if (await prisma.instructorApplication.count({ where: { userId } })) continue;
    const decided = a.status !== 'PENDING';
    const ids = await Promise.all(a.subjects.map(subjectId));
    await prisma.instructorApplication.create({
      data: {
        userId,
        status: a.status,
        headline: a.headline,
        bio: 'Tôi yêu thích việc giảng dạy và luôn cố gắng giải thích kiến thức theo cách dễ hiểu, gắn với ví dụ thực tế.',
        experience: 'Đã dạy kèm và hướng dẫn nhiều học viên; có giáo án và bài tập tự biên soạn cho từng chủ đề.',
        links: ['https://example.com/portfolio'],
        createdAt: daysAgo(10 - i),
        reviewedById: decided ? adminId : null,
        reviewedAt: decided ? daysAgo(8 - i) : null,
        reviewNote: 'note' in a ? a.note : null,
        subjects: {
          create: ids.map((id) => ({ subjectId: id, approved: decided ? a.status === 'APPROVED' : null })),
        },
      },
    });
  }
}

async function seedSales() {
  const already = await prisma.order.count({ where: { code: { startsWith: 'SEED' } } });
  if (already > 0) return;

  const published = await prisma.course.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, price: true, salePrice: true },
    orderBy: { createdAt: 'asc' },
  });
  const students = await prisma.user.findMany({
    where: { email: { in: STUDENTS.map((s) => s.email) } },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  for (const [i, student] of students.entries()) {
    const count = 1 + Math.floor(rand() * 4);
    const courses = [...published].sort(() => rand() - 0.5).slice(0, count);
    const paidAt = daysAgo(30 - i * 2);
    const subtotal = courses.reduce((sum, c) => sum + (c.salePrice ?? c.price), 0);

    await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          code: `SEED${String(i + 1).padStart(6, '0')}`,
          userId: student.id,
          status: 'PAID',
          subtotal,
          total: subtotal,
          paidAt,
          createdAt: paidAt,
          items: { create: courses.map((c) => ({ courseId: c.id, price: c.salePrice ?? c.price })) },
          payments: {
            create: {
              provider: 'VNPAY',
              status: 'SUCCEEDED',
              amount: subtotal,
              providerTxnId: `SEEDTXN${String(i + 1).padStart(6, '0')}`,
              createdAt: paidAt,
            },
          },
        },
        select: { id: true },
      });
      for (const c of courses) {
        await tx.enrollment.create({ data: { userId: student.id, courseId: c.id, orderId: order.id, createdAt: paidAt } });
        if (rand() < 0.65) {
          const rating = pick([5, 5, 5, 4, 4, 3]);
          await tx.review.create({
            data: {
              userId: student.id,
              courseId: c.id,
              rating,
              comment: pick(REVIEW_COMMENTS[rating]!),
              createdAt: new Date(paidAt.getTime() + 5 * DAY_MS),
            },
          });
        }
      }
    });
  }
}

async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
  const roleIds = await seedRoles();
  const users = await seedUsers(roleIds, passwordHash);
  await seedCatalog(users);
  await seedInstructors(users);
  await seedSales();

  const [userCount, courseCount, enrollmentCount, reviewCount] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.enrollment.count(),
    prisma.review.count(),
  ]);
  console.log(
    `Seeded ${userCount} users, ${courseCount} courses, ${enrollmentCount} enrollments, ${reviewCount} reviews. ` +
      `Dev accounts use password: ${DEV_PASSWORD}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

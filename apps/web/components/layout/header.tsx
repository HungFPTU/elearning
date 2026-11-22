import Link from 'next/link';
import { UserMenu } from './user-menu';

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-indigo-600">
            E-Learning
          </Link>
          <nav className="hidden gap-4 text-sm sm:flex">
            <Link href="/courses" className="hover:text-indigo-600">
              Khóa học
            </Link>
          </nav>
        </div>
        <UserMenu />
      </div>
    </header>
  );
}

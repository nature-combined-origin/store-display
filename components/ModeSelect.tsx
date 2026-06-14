import Link from "next/link";

export default function ModeSelect() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-6 py-12">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur">
        <p className="text-sm uppercase tracking-[0.3em] text-indigo-200/80">
          Store Display
        </p>
        <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
          실시간 디스플레이 시스템
        </h1>
        <p className="mt-3 text-slate-300">
          사용할 모드를 선택해 주세요.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link
            href="/display"
            className="rounded-2xl bg-indigo-500 px-6 py-8 text-lg font-semibold text-white transition hover:bg-indigo-400"
          >
            Display
            <span className="mt-2 block text-sm font-normal text-indigo-100">
              PC / 태블릿 전용 화면
            </span>
          </Link>
          <Link
            href="/admin/login"
            className="rounded-2xl bg-emerald-500 px-6 py-8 text-lg font-semibold text-white transition hover:bg-emerald-400"
          >
            Admin
            <span className="mt-2 block text-sm font-normal text-emerald-100">
              모바일 캠페인 관리
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}

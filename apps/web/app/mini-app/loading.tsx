export default function MiniAppLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="loading-spinner w-10 h-10 border-3 border-[var(--tg-theme-secondary-bg-color)] border-t-[var(--tg-theme-button-color)] rounded-full" />
      <p className="text-[var(--tg-theme-hint-color)] text-sm m-0">Загрузка...</p>
    </div>
  );
}

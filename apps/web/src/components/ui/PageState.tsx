interface PageStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function PageState({ title, message, actionLabel, onAction }: PageStateProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f7f4] px-4">
      <section className="w-full max-w-md rounded-lg border border-stone-200 bg-white p-6 text-center shadow-panel">
        <h1 className="text-lg font-semibold text-ink">{title}</h1>
        {message ? <p className="mt-3 text-sm leading-6 text-stone-600">{message}</p> : null}
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-5 rounded-md bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
          >
            {actionLabel}
          </button>
        ) : null}
      </section>
    </main>
  );
}

export function LoadingState() {
  return <PageState title="加载中" />;
}

export function EmptyState() {
  return <PageState title="暂无数据" message="当前没有可展示的内容。" />;
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <PageState
      title="加载失败"
      message={message ?? "请求暂时无法完成。"}
      actionLabel={onRetry ? "重试" : undefined}
      onAction={onRetry}
    />
  );
}

export default function MiniAppLoading() {
  return (
    <div className="loading-container">
      <div className="loading-spinner" />
      <p className="loading-text">Загрузка...</p>

      <style jsx>{`
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          gap: 16px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--tg-theme-secondary-bg-color);
          border-top-color: var(--tg-theme-button-color);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .loading-text {
          color: var(--tg-theme-hint-color);
          font-size: 14px;
          margin: 0;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

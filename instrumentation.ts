export async function register() {
  // Только на сервере
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initCronJobs } = await import("@/lib/cron/scheduler");
    initCronJobs();
  }
}

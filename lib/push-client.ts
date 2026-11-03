const pushScope = "/notifications/";

export async function getPushRegistration() {
  const scope = new URL(pushScope, window.location.origin).href;
  return (await navigator.serviceWorker.getRegistrations()).find(item => item.scope === scope);
}

export async function registerPushWorker() {
  // A separate scope leaves the application's offline/PWA worker untouched.
  // Push delivery does not require an open page controlled by this worker.
  const registration = await navigator.serviceWorker.register("/push-sw.js", { scope: pushScope });
  if (registration.active) return registration;
  const worker = registration.installing || registration.waiting;
  if (!worker) throw new Error("The notification worker could not start. Please retry.");
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => finish(new Error("The notification worker timed out. Please retry.")), 15000);
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      worker.removeEventListener("statechange", check);
      if (error) reject(error); else resolve();
    };
    const check = () => {
      if (worker.state === "activated") finish();
      else if (worker.state === "redundant") finish(new Error("The notification worker could not activate."));
    };
    worker.addEventListener("statechange", check);
    check();
  });
  return registration;
}

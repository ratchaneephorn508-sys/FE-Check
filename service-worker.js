/*
 * FE-Check Service Worker
 * เปลี่ยน CACHE_VERSION ทุกครั้งที่แก้ไฟล์หน้าเว็บ/ไฟล์ PWA
 */
const CACHE_VERSION = "fe-check-shell-v1";
const SHELL_CACHE = CACHE_VERSION;

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

// ติดตั้งและเก็บไฟล์หลักของแอป
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// ลบ Cache เวอร์ชันเก่าของ FE-Check
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("fe-check-shell-") && key !== SHELL_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ไม่แคชคำขอ API หรือคำขอข้ามโดเมน
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // สำหรับการเปิดหน้าเว็บ: พยายามใช้เครือข่ายก่อน แล้ว fallback เป็นหน้าแคช
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put("./index.html", copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match("./index.html");
          return cached || caches.match("./");
        })
    );
    return;
  }

  // ไฟล์ภายในเว็บไซต์: Cache first แล้วค่อยเรียกเครือข่าย
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (response && response.ok && response.type === "basic") {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});

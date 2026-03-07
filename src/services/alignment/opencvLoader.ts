type OpenCvRuntime = {
  Mat?: unknown;
  onRuntimeInitialized?: () => void;
  [key: string]: unknown;
};

declare global {
  interface Window {
    cv?: OpenCvRuntime;
  }
}

let readyPromise: Promise<OpenCvRuntime> | undefined;

const loadOpenCvScript = () =>
  new Promise<void>((resolve, reject) => {
    const existing = document.querySelector("script[data-opencv]");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("OPENCV_SCRIPT_LOAD_FAILED")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://docs.opencv.org/4.x/opencv.js";
    script.async = true;
    script.dataset.opencv = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("OPENCV_SCRIPT_LOAD_FAILED"));
    document.head.appendChild(script);
  });

export const loadOpenCv = async (): Promise<OpenCvRuntime> => {
  if (!readyPromise) {
    readyPromise = (async () => {
      if (!window.cv?.Mat) {
        await loadOpenCvScript();
      }
      const runtime = window.cv as OpenCvRuntime;
      if (runtime.Mat) {
        return runtime;
      }
      await new Promise<void>((resolve) => {
        runtime.onRuntimeInitialized = () => resolve();
      });
      return runtime;
    })();
  }
  return readyPromise;
};

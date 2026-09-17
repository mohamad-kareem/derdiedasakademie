"use client";

let pdfjsPromise;
const docs = new Map();

export function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

export async function getPdf(url) {
  if (!docs.has(url)) {
    docs.set(
      url,
      loadPdfjs().then((pdfjs) => pdfjs.getDocument({ url, withCredentials: false }).promise).catch((err) => {
        docs.delete(url);
        throw err;
      }),
    );
  }
  return docs.get(url);
}

import imageCompression from "browser-image-compression";

// Strip the data-URL prefix and return raw base64 + media type for the API.
export async function fileToBase64(file: File): Promise<{ mediaType: string; data: string }> {
  const dataUrl: string = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("read failed"));
    r.readAsDataURL(file);
  });
  const [head, data] = dataUrl.split(",");
  const mediaType = head.slice(head.indexOf(":") + 1, head.indexOf(";"));
  return { mediaType, data };
}
// Targets ~300KB, long edge 1600px — plenty for study/reference, tiny on disk.
export async function compressImage(file: File): Promise<File> {
  try {
    return await imageCompression(file, {
      maxSizeMB: 0.3,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
      fileType: "image/webp",
    });
  } catch (e) {
    console.warn("compression failed, using original", e);
    return file;
  }
}

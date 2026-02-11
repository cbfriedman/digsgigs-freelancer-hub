/**
 * Upload a file to Supabase Storage with progress reporting (percent).
 * Uses XMLHttpRequest so we can report upload progress; the standard Supabase client does not.
 */
export interface UploadWithProgressOptions {
  url: string;
  accessToken: string | undefined;
  anonKey: string;
  bucket: string;
  path: string;
  file: File;
  onProgress: (percent: number) => void;
}

export function uploadFileWithProgress(options: UploadWithProgressOptions): Promise<void> {
  const { url, accessToken, anonKey, bucket, path, file, onProgress } = options;
  const endpoint = `${url.replace(/\/$/, "")}/storage/v1/object/${bucket}/${path}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(Math.min(100, percent));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        try {
          const err = JSON.parse(xhr.responseText || "{}");
          reject(new Error(err.message || err.error_description || `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    xhr.open("POST", endpoint);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken || anonKey}`);
    xhr.setRequestHeader("apikey", anonKey);
    if (file.type) {
      xhr.setRequestHeader("Content-Type", file.type);
    }
    xhr.send(file);
  });
}

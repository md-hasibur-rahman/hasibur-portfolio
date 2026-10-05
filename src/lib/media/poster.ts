// Cloudinary serves the first frame of any video as a JPG when the extension is swapped,
// so no extra upload or transformation is needed to get a real thumbnail.
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|avi|ogv)(\?.*)?$/i;

export function videoPosterUrl(secureUrl: string): string {
  return secureUrl.replace(VIDEO_EXT, ".jpg");
}

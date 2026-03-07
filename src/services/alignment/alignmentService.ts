import { loadOpenCv } from "@/services/alignment/opencvLoader";
import { canvasToBlob, loadImageFromBlob } from "@/utils/image";

interface AlignmentOutput {
  blob: Blob;
  score: number;
}

const blobToCanvas = async (blob: Blob): Promise<HTMLCanvasElement> => {
  const image = await loadImageFromBlob(blob);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("CANVAS_CONTEXT_UNAVAILABLE");
  }
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
};

const matToBlob = async (mat: any): Promise<Blob> => {
  const canvas = document.createElement("canvas");
  canvas.width = mat.cols;
  canvas.height = mat.rows;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("CANVAS_CONTEXT_UNAVAILABLE");
  }
  const rgbaMat = new (mat.constructor as any)();
  if (mat.channels() === 4) {
    mat.copyTo(rgbaMat);
  } else {
    const cv = await loadOpenCv();
    (cv as any).cvtColor(mat, rgbaMat, (cv as any).COLOR_BGR2RGBA);
  }

  const imageData = new ImageData(new Uint8ClampedArray(rgbaMat.data), rgbaMat.cols, rgbaMat.rows);
  ctx.putImageData(imageData, 0, 0);
  rgbaMat.delete();
  return canvasToBlob(canvas, "image/png");
};

export const alignToReference = async (reference: Blob, target: Blob): Promise<AlignmentOutput> => {
  const cv = (await loadOpenCv()) as any;
  const referenceCanvas = await blobToCanvas(reference);
  const targetCanvas = await blobToCanvas(target);

  const refMat = cv.imread(referenceCanvas);
  const targetMat = cv.imread(targetCanvas);
  const refGray = new cv.Mat();
  const targetGray = new cv.Mat();
  cv.cvtColor(refMat, refGray, cv.COLOR_RGBA2GRAY);
  cv.cvtColor(targetMat, targetGray, cv.COLOR_RGBA2GRAY);

  const orb = new cv.ORB(2000);
  const refKeypoints = new cv.KeyPointVector();
  const refDescriptors = new cv.Mat();
  const targetKeypoints = new cv.KeyPointVector();
  const targetDescriptors = new cv.Mat();
  const emptyMask = new cv.Mat();

  orb.detectAndCompute(refGray, emptyMask, refKeypoints, refDescriptors);
  orb.detectAndCompute(targetGray, emptyMask, targetKeypoints, targetDescriptors);

  if (refDescriptors.rows < 8 || targetDescriptors.rows < 8) {
    throw new Error("ALIGNMENT_FEATURES_TOO_FEW");
  }

  const matcher = new cv.BFMatcher(cv.NORM_HAMMING, true);
  const matches = new cv.DMatchVector();
  matcher.match(targetDescriptors, refDescriptors, matches);

  const matchCount = matches.size();
  if (matchCount < 8) {
    throw new Error("ALIGNMENT_MATCHES_TOO_FEW");
  }

  const ordered = [];
  for (let i = 0; i < matchCount; i += 1) {
    ordered.push(matches.get(i));
  }
  ordered.sort((a, b) => a.distance - b.distance);
  const selected = ordered.slice(0, Math.min(80, ordered.length));

  const srcPts = new cv.Mat(selected.length, 1, cv.CV_32FC2);
  const dstPts = new cv.Mat(selected.length, 1, cv.CV_32FC2);

  selected.forEach((match, index) => {
    const src = targetKeypoints.get(match.queryIdx).pt;
    const dst = refKeypoints.get(match.trainIdx).pt;
    srcPts.data32F[index * 2] = src.x;
    srcPts.data32F[index * 2 + 1] = src.y;
    dstPts.data32F[index * 2] = dst.x;
    dstPts.data32F[index * 2 + 1] = dst.y;
  });

  const inlierMask = new cv.Mat();
  const homography = cv.findHomography(srcPts, dstPts, cv.RANSAC, 5.0, inlierMask);
  if (!homography || homography.empty()) {
    throw new Error("ALIGNMENT_HOMOGRAPHY_FAILED");
  }

  const warped = new cv.Mat();
  cv.warpPerspective(
    targetMat,
    warped,
    homography,
    new cv.Size(refMat.cols, refMat.rows),
    cv.INTER_LINEAR,
    cv.BORDER_REFLECT,
    new cv.Scalar(),
  );

  const alignedBlob = await matToBlob(warped);

  const inliers = Array.from(inlierMask.data).filter((value) => value === 1).length;
  const score = Math.max(0, Math.min(1, inliers / selected.length));

  [
    refMat,
    targetMat,
    refGray,
    targetGray,
    orb,
    refKeypoints,
    refDescriptors,
    targetKeypoints,
    targetDescriptors,
    emptyMask,
    matcher,
    matches,
    srcPts,
    dstPts,
    inlierMask,
    homography,
    warped,
  ].forEach((item) => item?.delete?.());

  return {
    blob: alignedBlob,
    score,
  };
};

interface ThemeLike {
  imageFilename?: string;
  dayImageList?: unknown;
  nightImageList?: unknown;
}

export const validateDdwThemeShape = (theme: ThemeLike): { ok: boolean; message: string } => {
  if (!theme.imageFilename || typeof theme.imageFilename !== "string") {
    return { ok: false, message: "theme.json missing imageFilename" };
  }
  if (!Array.isArray(theme.dayImageList) || !theme.dayImageList.length) {
    return { ok: false, message: "theme.json missing dayImageList" };
  }
  if (!Array.isArray(theme.nightImageList) || !theme.nightImageList.length) {
    return { ok: false, message: "theme.json missing nightImageList" };
  }
  return {
    ok: true,
    message: "Theme structure is compatible with WinDynamicDesktop minimum schema.",
  };
};

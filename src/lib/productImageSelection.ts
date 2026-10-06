export function removeSelectedImage<T>(images: T[], selected: number, removed: number) {
  const files = images.filter((_, index) => index !== removed);
  const coverIndex = !files.length ? 0 : removed === selected ? 0 : removed < selected ? selected - 1 : selected;
  return { files, coverIndex };
}

export function selectProductCover(image: string | undefined, images: string[] | undefined, cover: string) {
  const all = Array.from(new Set([image || '', ...(images || [])].map(url => url.trim()).filter(Boolean)));
  return { image: cover, images: all.filter(url => url !== cover) };
}

export function removeProductImage(image: string | undefined, images: string[] | undefined, removed: string) {
  return { image: image === removed ? '' : image || '', images: (images || []).filter(url => url.trim() !== removed.trim()) };
}

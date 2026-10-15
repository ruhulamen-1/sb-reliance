import { existsSync, mkdirSync } from 'node:fs';
import { rename } from 'node:fs/promises';
import { join } from 'node:path';
import { Request, Response, NextFunction } from 'express';
import { PHOTO_WIDTHS } from './seo.js';


// sharp is an optional dependency: if it cannot be installed or loaded on the host,
// every ?w= request simply gets the original photo, as before
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sharpLib: Promise<any> | null = null;
const loadSharp = () => (sharpLib ??= import('sharp').then((m) => m.default).catch((e) => {
  console.warn('Image resizing is off (sharp not available):', (e as Error).message);
  return null;
}));

const inFlight = new Map<string, Promise<void>>();

/** GET /uploads/<name>?w=800 -> a WebP at most 800px wide, made once and kept in <uploads>/.w/ */
export function resizedUploads(uploadsDir: string) {
  const cacheDir = join(uploadsDir, '.w');
  return async (req: Request, res: Response, next: NextFunction) => {
    const w = Number(req.query.w);
    const name = req.path.slice(1);
    if (req.method !== 'GET' || !PHOTO_WIDTHS.includes(w) || !/^[\w-]+\.(jpe?g|png|webp)$/i.test(name)) return next();
    const src = join(uploadsDir, name);
    if (!existsSync(src)) return next();
    const out = join(cacheDir, `${w}-${name.replace(/\.\w+$/, '')}.webp`);
    try {
      if (!existsSync(out)) {
        const sharp = await loadSharp();
        if (!sharp) return next();
        let job = inFlight.get(out);
        if (!job) {
          mkdirSync(cacheDir, { recursive: true });
          job = sharp(src).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 75 }).toFile(out + '.tmp')
            .then(() => rename(out + '.tmp', out))
            .finally(() => inFlight.delete(out));
          inFlight.set(out, job as Promise<void>);
        }
        await job;
      }
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
      res.type('image/webp').sendFile(out, { dotfiles: 'allow' });
    } catch (e) {
      console.error('Resize failed for', name, (e as Error).message);
      next();
    }
  };
}

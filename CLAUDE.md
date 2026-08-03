# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start              # nodemon app.js -> http://127.0.0.1:3000
node seed/place.js     # wipe + reseed the places collection (destructive: Place.deleteMany({}))
```

```bash
cp .env.example .env   # then paste an Unsplash Access Key into UNSPLASH_ACCESS_KEY
```

`seed/place.js` geocodes every location through Nominatim with a 1.1s throttle and fetches one Unsplash photo per place, so a full reseed takes ~25s and needs internet. It assigns authorship to the first user in the DB — register an account *before* seeding if you want the seeded places to be editable. Without an Unsplash key the seed still completes, just with no photos.

There is no test suite, linter, or build step (`npm test` is the default failing stub). Requires a local MongoDB at `mongodb://127.0.0.1/bestplace` — the connection string is hardcoded in both `app.js` and `seed/place.js`, so both must be changed together.

## Architecture

Express 5 + Mongoose server-rendered app (EJS via `ejs-mate` layouts, Bootstrap 5 from CDN). A Yelp-style directory of places with user reviews. Comments in the source are mostly Indonesian; flash messages and UI copy are English.

**Request pipeline** — `app.js` wires session → flash → passport → a locals middleware exposing `currentUser`, `success_msg`, `error_msg`, `currentPath`, `fullWidth` to every view → routes → 404 catch-all → error handler rendering `views/error.ejs`.

**Layout width** — `layouts/app.ejs` wraps content in `.container` unless a view is rendered with `fullWidth: true`, in which case `<main>` goes edge-to-edge and each section supplies its own `.container`. Only the landing page does this (set in `controllers/home.js`); `res.locals.fullWidth = false` is the default for everything else, so new pages need no changes.

**Layering** — `routes/` declares middleware chains only; all handler logic lives in `controllers/`. Every async controller must be wrapped in `utils/WrapAsync.js` at the route level (`wrapAsync(placeController.index)`) — controllers do not have their own try/catch, they rely on this to forward rejections to the error handler. Throw `new ErrorHandler(msg, statusCode)` (from `utils/ErrorHandler.js`, class is actually named `ExpressError`) for anything the error handler should render.

**Standard middleware order on a protected mutating route**: `isAuth` → `isAuthorPlace`/`isAuthorReview` → `isValidObjectId("/redirect")` → `upload.*` (if files) → `validatePlace`/`validateReview` → `wrapAsync(controller)`. See `routes/places.js:34-50` for the canonical chain.

- `middlewares/isValidObjectId.js` is a **factory** — call it with a redirect URL: `isValidObjectId("/places")`. It validates *every* one of `id`/`place_id`/`review_id` present on the request, which matters on review routes where two ids arrive at once.
- Order matters: `isValidObjectId` must run **before** `isAuthorPlace`/`isAuthorReview`, since those query the DB with that id. Both author middlewares are async, so they need `wrapAsync` at the route.
- `middlewares/validator.js` runs Joi schemas from `schemas/`. Both schemas expect the payload nested under a key (`place[...]`, `review[...]`), which is why form inputs are named `place[title]`, `review[rating]`, etc.

**Nested resources** — reviews mount at `/places/:place_id/reviews` with `express.Router({ mergeParams: true })`, so `req.params.place_id` is available inside review routes. Reviews are stored as a separate collection referenced by an ObjectId array on `Place`; the `placeSchema.post("findOneAndDelete")` hook cascades review deletion, so deleting a place must go through `findByIdAndDelete`/`findOneAndDelete` for cleanup to fire.

**Auth** — `passport-local-mongoose` plugs username/password/hashing into `models/user.js` (the schema itself only declares `email`; `username` and the hash come from the plugin). `req.user._id` is the ownership key checked by `middlewares/isAuthor.js` and by `place.author.equals(currentUser._id)` in views.

**Images come in two kinds**, both living in the same `place.images[]` array and both rendered through `image.url`:

| | uploaded | from Unsplash |
|---|---|---|
| `url` | `/images/<filename>` | remote `https://images.unsplash.com/...` |
| `filename` | set | **empty** |
| `credit` / `creditUrl` | empty | set |

`filename` is the discriminator: `removeImages` skips entries without one, so remote photos never trigger a disk unlink. Anything touching image files must preserve that check.

**File uploads** — `utils/imageFiles.js` owns the image directory, the public URL shape, and deletion; `configs/multer.js` and the controllers both go through it rather than building paths themselves. Limits: 5 files, 5MB each, `image/*` only; `app.js` maps `MulterError` to a 400 so a rejected upload doesn't surface as a 500.

**Unsplash** — `utils/unsplash.js` searches `api.unsplash.com/search/photos` for a photo matching the place. Uploading is optional on create: when no file is sent, the controller falls back to Unsplash (query by title, then by location) so every place ends up with a picture. Needs `UNSPLASH_ACCESS_KEY` in `.env`; without it `searchPhoto` returns `null` immediately and never calls out, so the whole app degrades to "no image" rather than breaking.

Unsplash's API terms drive two design constraints that are easy to undo by accident: photos must be **hotlinked**, not downloaded into `public/images/`, and the photographer must be **credited** with a link carrying UTM params. That's why the credit fields exist on the sub-schema and why `show.ejs`/`index.ejs` render a "Foto oleh … di Unsplash" line whenever `credit` is present.

Uploads that fail validation are deleted from disk by `cleanupUploads` in `middlewares/validator.js` — multer writes to disk before Joi ever runs, so skipping that cleanup leaves orphan files. On update, `place.images` is replaced wholesale and the previous files are unlinked *after* the save succeeds. Deleting a place unlinks its files via the `findOneAndDelete` hook.

**Maps** — `utils/geocoder.js` turns `place.location` into a GeoJSON `Point` via Nominatim (OpenStreetMap): free, no API key, but it demands a `User-Agent` and max 1 request/second. Coordinates are `[lng, lat]` in the DB and must be flipped for Leaflet, which wants `[lat, lng]`.

Geocoding is best-effort: a failure returns `null` and controllers store `undefined` (not `null`, which the `2dsphere` index would have to index) so the place still saves without a map point. If the full location string misses, the geocoder retries with the leading comma-segment dropped, up to 3 attempts — broad-but-correct beats precise-but-wrong, since dropping *trailing* segments can land on a same-named city in another country.

Rendering: `public/js/map.js` is loaded on every page and self-activates only when a page contains both `#map` and a `<script type="application/json" id="map-data">` block. Views pass data through that JSON tag (escaping `<` as `<`) instead of interpolating into JS — `places/show.ejs` emits one place, `places/index.ejs` emits all of them and the script auto-fits bounds. Re-geocoding on update only happens when the location string actually changed.

**Method override** — HTML forms do PUT/DELETE via `?_method=DELETE` in the action (`methodOverride("_method")`).

## Design system

`public/css/theme.css` holds every design token as CSS custom properties on `:root` and is loaded **after** Bootstrap so `.bp-*` classes win. Use the tokens rather than raw hex: teal (`--bp-teal-700`) is the brand, orange (`--bp-orange-600`) is reserved for the single primary CTA per screen, gold (`--bp-gold`) is rating-only. The palette deliberately avoids red — the point is to read as Yelp-adjacent without borrowing its identity.

Type is Calistoga (headings, via `h1/h2/h3` or `.bp-display`) over Inter (body), loaded from Google Fonts in the layout. Icons are inline SVG, never emoji; decorative ones carry `aria-hidden="true"`.

`views/layouts/partials/stars.ejs` renders a rating as SVG stars — include it with `include('layouts/partials/stars', { rating })`, passing `null` for "no reviews yet". `controllers/home.js` is the only place that computes average ratings; it does so in JS after populating, not via aggregation.

- The session secret is the literal string `"secret"` in `app.js`, and cookie `expires` is computed with `*` instead of `+`. Both are known-unfinished, not intentional.
- The MongoDB URI is still hardcoded in `app.js` and `seed/place.js`; `.env` currently carries only the Unsplash key.
- Unsplash's free demo tier allows 50 requests/hour. A reseed spends 19 of them (up to 38 when titles miss and it retries by location), so repeated reseeds within an hour will start coming back empty.
- Nominatim is a free community service with a hard 1 req/sec policy. A create/update with a hard-to-match location can therefore take a few seconds while the geocoder retries.

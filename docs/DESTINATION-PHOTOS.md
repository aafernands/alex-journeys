# Trip destination photos

Set `UNSPLASH_ACCESS_KEY` in the server environment (Vercel production and preview as needed), then redeploy. Never use a `NEXT_PUBLIC_` key. The planner calls `/api/destination-photo?destination=...`; the server searches Unsplash with the complete destination, requesting a landscape photo. Successful lookups are cached for one day.

Images are hotlinked from Unsplash, with photographer and Unsplash attribution. Changing destinations cancels the previous request and hides the previous photo. Search relevance depends on Unsplash's results and is not a geographic guarantee.

In **CMS → Trip Planner → Fallback destination image**, upload an image or choose one from the media library, enter its description, then select **Save trip planner**. Uploads use the existing authenticated CMS media service and become public after the resulting deployment. The local upload preview is available immediately. Removing the selected image restores the automatic fallbacks.

The configured image appears while loading and whenever Unsplash cannot supply a photo. Without a configured image, the existing Wikimedia Commons/artwork fallback remains. A broken remote photo falls back to the configured image; if that also fails, the neutral background remains. Custom images use their CMS description rather than claiming to depict the selected destination. API responses are not CDN-cached so saved fallback settings are read from the current deployment; upstream photo lookups remain cached for one day.

The planner's stacked top padding is replaced with one 16px gap. The destination banner is 352px high on desktop and 272px on phones, expanding for longer content.

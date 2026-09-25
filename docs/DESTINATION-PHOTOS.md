# Trip destination photos

Set `UNSPLASH_ACCESS_KEY` in the server environment (Vercel production and preview as needed), then redeploy. Never use a `NEXT_PUBLIC_` key. The planner calls `/api/destination-photo?destination=...`; the server searches Unsplash with the complete destination, requesting a landscape photo. Successful lookups are cached for one day.

Images are hotlinked from Unsplash, with photographer and Unsplash attribution. Changing destinations cancels the previous request and hides the previous photo. Missing credentials, empty results, request failures, and broken images leave a neutral banner rather than an unrelated location. Search relevance depends on Unsplash's results and is not a geographic guarantee.

The planner's stacked top padding is replaced with one 16px gap. The destination banner is 352px high on desktop and 272px on phones, expanding for longer content.

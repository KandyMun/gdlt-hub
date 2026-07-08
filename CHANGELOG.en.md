# Changelog

## [v0.5.2] - 2026-07-08

### Added
- Drag and drop uploads — every file upload now accepts a dropped image: the profile picture, badge icon and background (admin), and the level thumbnail, each highlighting as you drag over. Clicking to browse still works.
- GD stats now show icons (star, moon, diamond, user coin, secret coin, demon, creator points) instead of text labels; global rank is marked with a trophy icon.
- New "Merge profiles" tab in the LTCL admin panel — list admins can link an LTCL leaderboard name (which needs no account) to a real gdlt-hub account; every occurrence of that name across the level list is rewritten to the account's username, so it resolves to the right profile and display name everywhere.
- Adding an LTCL record now autofills from existing site accounts as you type, while still allowing a name to be typed by hand for players without an account.

### Changed
- The LTCL stats card on a profile now shows the hardest level's custom uploaded thumbnail when one exists, falling back to the automatic thumbnail (by level ID) as before.
- The LTCL and AREDL profile stats cards now use the same segmented, frosted-glass layout as the List page, with the hardest level/demon's thumbnail as a blurred card background.
- The GD stats card now has a fixed background image, and the linked username is shown in its own centered segment.

### Fixed
- The level thumbnail backdrop on the List page is no longer heavily blurred — it now shows sharp and clearly recognizable behind the page. Section panels keep a lighter frosted-glass effect.

## [v0.5.1] - 2026-07-08

### Added
- Custom level thumbnails — list staff can upload a thumbnail image when adding or editing a level (stored securely, up to 2 MB). The selected level's thumbnail now shows as the blurred backdrop on the List page, falling back to the automatic thumbnail (by level ID) when none is uploaded.
- Song links — a level's song now links out: a NONG opens its external download link, while a regular song links to its Newgrounds page. List staff pick which via the NONG checkbox in the level editor, which swaps the field between a song ID and a download link.

## [v0.5.0.1] - 2026-07-08

### Changed
- The LTCL level list now spans the entire page width.
- Added support for showing a level's thumbnail in the page background (not yet visible, as no images have been uploaded for use).
- Reduced the opacity of the section backgrounds so the page background is more visible.

## [v0.5] - 2026-07-07

### Added
- LTCL admin panel — a single place for list staff to add, edit, delete and reorder levels, manage records, and edit the rules, each gated by the appropriate role.
- Formatted rules — the LTCL rules now support rich text (Markdown) and render with headings, bold, lists and links. List staff edit them with a formatting toolbar and a live preview showing exactly how they'll appear.

### Changed
- The public LTCL List and Rules pages are now view-only; list staff make changes from the new LTCL admin panel.
- The LTCL staff list on the home page is now generated automatically from roles (Owners, List Admins, List Moderators, Developers) instead of a fixed list.
- List Admins and Moderators can now edit a record's enjoyment value.
- Badges on profiles are now grouped into standard and background-art styles.

### Fixed
- The level record editor layout — the enjoyment field no longer takes up most of the row; records now have aligned Player / Enjoyment / Video columns.

## [v0.4] - 2026-07-06

### Added
- Lithuanian Challenge List (LTCL) — a new section of the hub for ranking the hardest community-made challenges. It has its own home page (welcome, level changelog, and list staff), and tabs for List, Leaderboard and List Rules.
- Challenge Roulette and Packs are planned and will be added later.
- The List — a searchable, ranked list of 145 imported levels. Selecting a level shows its verification video, point value, level ID, average enjoyment, song/NONG, creators/verifier/publisher, and every completion (record) with the player's enjoyment.
- Points & legacy — placements #1–100 score points on a curve; anything past #100 is shown as Legacy and worth 0 points. Each level's average enjoyment is computed from its records.
- Leaderboard — players ranked by total points. Each player's page shows their rank, points, hardest challenge, and their completed / created / verified challenges (main list in bold, legacy in italic), with every level linking back to the List.
- LTCL stats on hub profiles — a card with leaderboard position, points, and hardest challenge, plus a link to the player's LTCL page. The LTCL page links back to the main profile.
- Role-based permissions — assigned roles now grant abilities: List Admins manage levels, records and rules; List Moderators curate records; Administrators can do everything and are the only ones who can assign roles.
- Custom badges — administrators can create purely cosmetic badges with an emoji or uploaded image/GIF icon (≤ 250 KB), an optional 86×40 background image (≤ 1 MB), a color, and an event date. Badges can be given to anyone, appear on their profile, and show their name and date on hover.
- Admin tools to add, edit, delete and reorder LTCL levels and manage records directly on the site.

### Changed
- User profiles now belong to the whole hub (`/u/...`) instead of living under freepost.
- User search is now a card on the home page.
- Roles are shown as small icons next to the username; custom badges take the pill spot below them.

## [v0.3.1] - 2026-07-05

### Added
- Geometry Dash stats on profiles — a card showing stars, moons, demons, secret coins, user coins, diamonds, creator points, and global leaderboard rank, with a link to the player's GDBrowser page.
- Automatic account matching — if your Discord username exactly matches a GD account, its stats appear on your profile without any setup. Auto-matched cards carry a small note unless the GD profile's Discord social link confirms it's you.
- Manual GD account linking — set your in-game username on your own profile. To prevent impersonation, saving requires your GD profile to list your Discord handle in its social links; leave the field empty and save to unlink.

### Removed
- Bluesky from profile social links.

### Fixed
- Clicking a username on posts and in the post view led to a non-existent page — it now opens the user's profile, like in user search.

## [v0.3] - 2026-07-05

### Added
- GDLT Hub — a new home page that acts as a centralized place for the community. freepost is now one part of the hub, with more to come.
- About page with an "About" and a "Credits" tab; credited people can be linked to their freepost profiles and show their profile pictures.
- The changelog moved up to the hub, so it's reachable from anywhere.
- A shared top bar on every page — language switch, notifications, and login/profile picture are now available everywhere, including the home page.
- User search in freepost — find users by name; all users are shown by default and the list narrows as you type.
- A back button below the header on every page.
- The Lithuanian flag colors painted onto the "GDLT" wordmark.
- A loading icon shown while the page is still loading.

### Changed
- Clean links without the "#" (e.g. `/gdlt-hub/freepost` instead of `/gdlt-hub/#/freepost`).
- Discord login is centralized for the whole hub and returns you to the home page after signing in.
- The header logo now reads "GDLT Hub" and shows the current page next to it.

### Removed
- The changelog is no longer inside freepost (it now lives at the hub level).

### Fixed
- Added spacing below the last comment on a post.

## [v0.2.2] - 2026-07-05

### Added
- AREDL stats on profiles — shows total points (with packs), completed extreme demon count, hardest demon, and global/country rankings (by points and by demons). Data is fetched automatically from the linked Discord account.
- The hardest demon is shown as a prominent banner using the level's thumbnail.
- Link to the user's AREDL profile.

## [v0.2.1] - 2026-07-05

### Added
- Social links on profiles — add YouTube, X, Bluesky, Twitch, Instagram, TikTok, GitHub, Steam, Spotify, and a personal website link.
- Custom links — up to 5 extra links with your own label.
- Links show as a row of clickable icons under the username and open in a new tab.
- Display name — choose any name (up to 32 characters); defaults to your Discord username.
- Profile preview — toggle a preview on your own profile to see how it looks to other visitors.

### Fixed
- Signing in or out now always returns you to the main page instead of the last page you were on.

## [v0.2.0.2] - 2026-07-05

### Fixed
- After signing in with Discord, the redirect back to the site didn't work on the published (GitHub) version — the redirect now works both on the published site and in the dev environment.

## [v0.2.0.1] - 2026-07-05

### Fixed
- Profile pictures on posts sometimes didn't appear on the initial page load — they now load right away.
- Correctly set up the variables needed for Discord login, which hadn't been carried over from the dev environment.

## [v0.2] - 2026-07-05

### Added
- Discord login — instead of a username and password, you now sign in with a single "Log in with Discord" button.
- Your Discord avatar is used as the default profile picture; you can change it to anything afterwards.
- Animated (GIF) Discord avatars are supported.

### Changed
- Your username is now taken from your Discord account.

### System changes
- Authentication moved to Discord OAuth (Firebase custom token). Logins persist across sessions.
- Existing accounts can be migrated to the Discord identity along with their posts, comments, likes and profile.

## [v0.1.2.1] - 2026-07-04

### Added
- A user's posts are now shown on their profile below their details — same format as the main page, just laid out in a single column.
- The changelog is shown in the selected language (LT/EN).

### Changed
- The create-post button was moved to the bottom-right corner and only appears on the main posts page.

## [v0.1.2] - 2026-07-04

### Added
- User profiles: every user has their own page (/u/username) showing their name, join date, profile picture and an "About me" section.
- Profile owners can upload a profile picture and edit their "About me" text.
- Author names in posts and comments are now links to their profiles, with a small profile picture shown next to them.
- User roles: colored role badges can be shown below a user's name on their profile. Roles are translated into Lithuanian and English.
- Profile pictures use the same limits as posts (up to 15MB, up to 5000×5000). GIF format is supported.

### Changed
- The sign-out, profile and "My posts" buttons are now collapsed into a profile-picture icon in the top right — clicking it opens a menu with profile, your posts and sign-out. The sign-in button is unchanged.

### System changes
- On sign-up, the chosen username is checked to make sure it isn't already taken.
- When a profile picture is changed, the old one is automatically deleted from storage to save space.

## [v0.1.1] - 2026-06-06

### Changed
- Reworded the post upload button; it previously sounded a bit odd and impractical.
- Changed the site logo and the title shown in the browser tab (wtf is tmp-scaffold bruh).
- Like/Dislike buttons are larger when a post is opened, no longer blending into the description.

### Fixed
- Hovering over the Like/Dislike buttons no longer turns the cursor into the default arrow — it stays a pointer.
- The field showing which account you're logged in as is displayed more neatly.

### Added
- The comment count is shown in the post window.

## [v0.1.0.3] - 2026-06-06

### Added
- The loading indicator text was replaced with a spinning Lithuanian-colored Electrodynamix icon, LTCL mentioned

## [v0.1.0.2] - 2026-06-06

### Fixed
- Removed two redundant locale keys, fixed unnatural Lithuanian message text

## [v0.1.0.1] - 2026-06-05

### Fixed
- Fixed a locale build error caused by mismatched string types

## [v0.1.0] - 2026-06-05

### Changed
- Started using versioning; this iteration of the site is considered the first (not v1.x.x, since there's still plenty to add and fix before a fully functional site).
- Page links moved to the center of the top menu, and they now navigate to the corresponding page instead of replacing the current view.

### Added
- Added Lithuanian (LT) and English (EN) localization, switchable in the top right.
- Added this page, where new changes will be described.
- The admin account can pin posts; they show at the very top bypassing all sorting metrics. Later I might implement other roles that can do this.
- You can delete your own comments; the admin account can delete all of them.
- You can mention other users in comments, sending them a notification.

### System changes
- Dealt with S3NI (hopefully; if it comes back, let me know, thanks).

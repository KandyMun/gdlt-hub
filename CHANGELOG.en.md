# Changelog

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

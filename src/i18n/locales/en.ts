const en = {
  // Nav
  nav_feed: 'Feed',
  nav_changelog: 'Changelog',
  nav_myposts: 'My posts',
  nav_users: 'Users',
  nav_signin: 'Sign in',
  nav_signout: 'Sign out',

  // Site status
  site_frozen_banner: 'The site is currently frozen. Posting and interactions are disabled.',

  // Common
  loading: 'Loading…',
  cancel: 'Cancel',
  delete: 'Delete',
  deleting: 'Deleting…',
  edit: 'Edit',
  save: 'Save',

  // Feed
  feed_empty: 'No posts yet. Be the first!',
  feed_search_placeholder: 'Search by title…',
  feed_sort_label: 'Sort:',
  feed_sort_new: 'New',
  feed_sort_top: 'Top',
  feed_video_badge: '▶ video',
  feed_loading_more: 'Loading…',
  feed_no_more: 'No more posts',
  feed_pin: 'Pin',
  feed_unpin: 'Unpin',
  feed_new_available: '↑ New posts available — click to refresh',

  // Post modal
  post_no_comments: 'No comments yet.',
  post_comment_delete: 'Delete',
  post_frozen_comments: 'The site is frozen. Comments are disabled.',
  post_comment_placeholder: 'Write a comment…',
  post_comment_posting: 'Posting…',
  post_comment_button: 'Comment',

  // New post modal
  new_post_title: 'New post',
  new_post_drop_hint: 'Click to choose an image or video',
  new_post_title_placeholder: 'Title',
  new_post_desc_placeholder: 'Description (optional)',
  new_post_uploading: 'Uploading…',
  new_post_cooldown: (s: number) => `Wait ${s}s`,
  new_post_submit: 'Post',
  new_post_err_size: 'File must be 15MB or smaller.',
  new_post_err_dimensions: 'Image must be 5000×5000 pixels or smaller.',
  new_post_err_upload: 'Upload failed',

  // Edit post modal
  edit_post_title: 'Edit post',
  edit_post_saving: 'Saving…',
  edit_post_save: 'Save changes',
  edit_post_delete: 'Delete post',
  edit_post_confirm: 'Are you sure?',
  edit_post_err_update: 'Update failed',
  edit_post_err_delete: 'Delete failed',

  // Auth page
  auth_signin_title: 'Sign in',
  auth_signup_title: 'Create account',
  auth_username_placeholder: 'Username',
  auth_password_placeholder: 'Password',
  auth_loading: 'Loading…',
  auth_signin_button: 'Sign in',
  auth_signup_button: 'Sign up',
  auth_no_account: "Don't have an account? ",
  auth_has_account: 'Already have an account? ',
  auth_go_signup: 'Sign up',
  auth_go_signin: 'Sign in',
  auth_err_generic: 'Something went wrong',

  // My posts
  myposts_empty: "You haven't posted anything yet.",

  // Users page
  users_site_frozen: 'Site is frozen',
  users_site_active: 'Site is active',
  users_frozen_desc: 'Non-admin users cannot interact with the site.',
  users_active_desc: 'All users can post, comment, and react.',
  users_unfreeze: 'Unfreeze',
  users_freeze: 'Freeze site',
  users_count: (n: number) => `${n} account${n !== 1 ? 's' : ''}`,
  users_you: '(you)',
  users_joined: (date: string) => `Joined ${date}`,
  users_ban: 'Ban',
  users_unban: 'Unban',

  // Notifications
  notif_button: '🔔 Notifications',
  notif_panel_title: 'Notifications',
  notif_mark_read: 'Mark all read',
  notif_clear: 'Clear all',
  notif_empty: 'No notifications yet.',
  notif_commented_on: ' commented on ',
  notif_mentioned_in: ' mentioned you in ',

  // Changelog
  changelog_title: 'Changelog',
  changelog_current: (v: string) => `current: ${v}`,
}

export default en

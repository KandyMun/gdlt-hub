const lt = {
  // Nav
  nav_feed: 'Srautas',
  nav_changelog: 'Atnaujinimai',
  nav_myposts: 'Mano įrašai',
  nav_users: 'Vartotojai',
  nav_signin: 'Prisijungti',
  nav_signout: 'Atsijungti',
  nav_logged_in_as: (u: string) => `Prisijungta kaip: ${u}`,

  // Site status
  site_frozen_banner: 'Svetainė šiuo metu užšaldyta. Įrašymas ir sąveikos išjungtos.',

  // Common
  loading: 'Kraunama…',
  cancel: 'Atšaukti',
  delete: 'Ištrinti',
  deleting: 'Trinama…',
  edit: 'Redaguoti',
  save: 'Išsaugoti',

  // Feed
  feed_empty: 'Dar nėra įrašų. Būk pirmas!',
  feed_search_placeholder: 'Ieškoti pagal pavadinimą…',
  feed_sort_label: 'Rūšiuoti:',
  feed_sort_new: 'Nauji',
  feed_sort_top: 'Populiarūs',
  feed_video_badge: '▶ video',
  feed_loading_more: 'Kraunama…',
  feed_no_more: 'Daugiau įrašų nėra',
  feed_pin: 'Prisegti',
  feed_unpin: 'Atsegti',
  feed_new_available: '↑ Nauji įrašai — spustelėkite norėdami atnaujinti',

  // Post modal
  post_no_comments: 'Komentarų dar nėra.',
  post_comment_count: (n: number) => {
    if (n % 10 === 1 && n % 100 !== 11) return `${n} komentaras`
    if (n % 10 >= 2 && n % 10 <= 9 && (n % 100 < 10 || n % 100 >= 20)) return `${n} komentarai`
    return `${n} komentarų`
  },
  post_comment_delete: 'Ištrinti',
  post_frozen_comments: 'Svetainė užšaldyta. Komentarai išjungti.',
  post_comment_placeholder: 'Parašykite komentarą…',
  post_comment_posting: 'Siunčiama…',
  post_comment_button: 'Komentuoti',

  // New post modal
  new_post_title: 'Naujas įrašas',
  new_post_drop_hint: 'Paspauskite, kad pasirinktumėte paveikslėlį ar vaizdo įrašą',
  new_post_title_placeholder: 'Pavadinimas',
  new_post_desc_placeholder: 'Aprašymas (neprivaloma)',
  new_post_uploading: 'Įkeliama…',
  new_post_cooldown: (s: number) => `Palaukite ${s}s`,
  new_post_submit: 'Kurti naują įrašą',
  new_post_err_size: 'Failas turi būti ne didesnis nei 15MB.',
  new_post_err_dimensions: 'Paveikslėlis turi būti ne didesnis nei 5000×5000 pikselių.',
  new_post_err_upload: 'Įkėlimas nepavyko',

  // Edit post modal
  edit_post_title: 'Redaguoti įrašą',
  edit_post_saving: 'Išsaugoma…',
  edit_post_save: 'Išsaugoti pakeitimus',
  edit_post_delete: 'Ištrinti įrašą',
  edit_post_confirm: 'Ar tikrai?',
  edit_post_err_update: 'Atnaujinti nepavyko',
  edit_post_err_delete: 'Ištrinti nepavyko',

  // Auth page
  auth_signin_title: 'Prisijungti',
  auth_signup_title: 'Sukurti paskyrą',
  auth_username_placeholder: 'Vartotojo vardas',
  auth_password_placeholder: 'Slaptažodis',
  auth_loading: 'Kraunama…',
  auth_signin_button: 'Prisijungti',
  auth_signup_button: 'Registruotis',
  auth_no_account: 'Neturite paskyros? ',
  auth_has_account: 'Jau turite paskyrą? ',
  auth_go_signup: 'Registruotis',
  auth_go_signin: 'Prisijungti',
  auth_err_generic: 'Kažkas nepavyko',

  // My posts
  myposts_empty: 'Dar nieko nepaskelbėte.',

  // Users page
  users_site_frozen: 'Svetainė užšaldyta',
  users_site_active: 'Svetainė aktyvi',
  users_frozen_desc: 'Neadministratoriai negali sąveikauti su svetaine.',
  users_active_desc: 'Visi vartotojai gali skelbti, komentuoti ir reaguoti.',
  users_unfreeze: 'Atšaldyti',
  users_freeze: 'Užšaldyti svetainę',
  users_count: (n: number) => `${n} paskyra${n === 1 ? '' : n >= 10 && n <= 20 ? '' : n % 10 === 1 ? '' : (n % 10 >= 2 && n % 10 <= 9) ? 'os' : ''}`,
  users_you: '(tu)',
  users_joined: (date: string) => `Prisijungė ${date}`,
  users_ban: 'Užblokuoti',
  users_unban: 'Atblokuoti',

  // Notifications
  notif_button: '🔔 Pranešimai',
  notif_panel_title: 'Pranešimai',
  notif_mark_read: 'Pažymėti visus skaitytais',
  notif_clear: 'Išvalyti viską',
  notif_empty: 'Pranešimų dar nėra.',
  notif_commented_on: ' pakomentavo įraše ',
  notif_mentioned_in: ' paminėjo jus įraše ',

  // Changelog
  changelog_title: 'Atnaujinimai',
  changelog_current: (v: string) => `dabartinė: ${v}`,
}

export default lt

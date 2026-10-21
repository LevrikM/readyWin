import {
  siGooglechrome as googlechrome,
  siFirefox as firefox,
  siBrave as brave,
  siVivaldi as vivaldi,
  siOpera as opera,
  siTorbrowser as torbrowser,
  siTelegram as telegram,
  siDiscord as discord,
  siZoom as zoom,
  siSignal as signal,
  siElement as element,
  siViber as viber,
  siVlcmediaplayer as vlcmediaplayer,
  siSpotify as spotify,
  siObsstudio as obsstudio,
  siAudacity as audacity,
  siStremio as stremio,
  siPlex as plex,
  siSteam as steam,
  siEpicgames as epicgames,
  siGogdotcom as gogdotcom,
  siEa as ea,
  siUbisoft as ubisoft,
  siBattledotnet as battledotnet,
  siGit as git,
  siNodedotjs as nodedotjs,
  siPython as python,
  siDocker as docker,
  siPostman as postman,
  siGithub as github,
  siDbeaver as dbeaver,
  siIntellijidea as intellijidea,
  siAndroidstudio as androidstudio,
  siLibreoffice as libreoffice,
  siOnlyoffice as onlyoffice,
  siObsidian as obsidian,
  siNotion as notion,
  siJoplin as joplin,
  siZotero as zotero,
  si7zip as sevenzip,
  siSharex as sharex,
  siBitwarden as bitwarden,
  siLocalsend as localsend,
  siTailscale as tailscale,
  siQbittorrent as qbittorrent,
  siAnydesk as anydesk,
  siGimp as gimp,
  siKrita as krita,
  siInkscape as inkscape,
  siBlender as blender,
  siFigma as figma,
  siKdenlive as kdenlive,
  siMalwarebytes as malwarebytes,
  siBitdefender as bitdefender,
  siCryptomator as cryptomator,
  siWireshark as wireshark,
  siDotnet as dotnet,
  siPowers as powers,
  siOpencode as opencode,
  siGo as go,
  siRust as rust,
  siOpenjdk as openjdk,
  siCurl as curl,
  siFfmpeg as ffmpeg,
  siKubernetes as kubernetes,
  siHelm as helm,
  siTerraform as terraform,
  siNeovim as neovim,
  siNushell as nushell,
  siStarship as starship,
  siChocolatey as chocolatey,
  siDelta as delta,
  siRclone as rclone,
  siDeno as deno,
  siWezterm as wezterm,
  siAlacritty as alacritty,
  siLlvm as llvm,
  siNotepadplusplus as notepadplusplus,
  siVirtualbox as virtualbox,
  siPycharm as pycharm,
  siBruno as bruno,
  siMongodb as mongodb,
  siZedindustries as zed,
  siLibrewolf as librewolf,
  siArc as arc,
  siOperagx as operagx,
  siThunderbird as thunderbird,
  siMattermost as mattermost,
  siFoobar2000 as foobar2000,
  siJellyfin as jellyfin,
  siMpv as mpv,
  siRainmeter as rainmeter,
  siAutohotkey as autohotkey,
  siSyncthing as syncthing,
  siWireguard as wireguard,
  siTeamviewer as teamviewer,
  siDropbox as dropbox,
  siAnki as anki,
  siLmms as lmms,
  siFreecad as freecad,
  siKeepassxc as keepassxc,
  siProtonvpn as protonvpn,
  siMullvad as mullvad,
  siWindsurf as windsurf,
  siNvidia as nvidia,
  siGoogledrive as googledrive,
  siEvernote as evernote,
  siJetbrains as jetbrains,
  siInsomnia as insomnia,
  siGnu as gnu,
} from 'simple-icons'
import {faMicrosoft, faSlack, faVisualStudio, faWindows} from '@fortawesome/free-brands-svg-icons'

const simplePaths: Record<string, string> = {
  googlechrome: googlechrome.path,
  firefox: firefox.path,
  brave: brave.path,
  vivaldi: vivaldi.path,
  opera: opera.path,
  torbrowser: torbrowser.path,
  telegram: telegram.path,
  discord: discord.path,
  zoom: zoom.path,
  signal: signal.path,
  element: element.path,
  viber: viber.path,
  vlcmediaplayer: vlcmediaplayer.path,
  spotify: spotify.path,
  obsstudio: obsstudio.path,
  audacity: audacity.path,
  stremio: stremio.path,
  plex: plex.path,
  steam: steam.path,
  epicgames: epicgames.path,
  gogdotcom: gogdotcom.path,
  ea: ea.path,
  ubisoft: ubisoft.path,
  battledotnet: battledotnet.path,
  git: git.path,
  nodedotjs: nodedotjs.path,
  python: python.path,
  docker: docker.path,
  postman: postman.path,
  github: github.path,
  dbeaver: dbeaver.path,
  intellijidea: intellijidea.path,
  androidstudio: androidstudio.path,
  libreoffice: libreoffice.path,
  onlyoffice: onlyoffice.path,
  obsidian: obsidian.path,
  notion: notion.path,
  joplin: joplin.path,
  zotero: zotero.path,
  '7zip': sevenzip.path,
  sharex: sharex.path,
  bitwarden: bitwarden.path,
  localsend: localsend.path,
  tailscale: tailscale.path,
  qbittorrent: qbittorrent.path,
  anydesk: anydesk.path,
  gimp: gimp.path,
  krita: krita.path,
  inkscape: inkscape.path,
  blender: blender.path,
  figma: figma.path,
  kdenlive: kdenlive.path,
  malwarebytes: malwarebytes.path,
  bitdefender: bitdefender.path,
  cryptomator: cryptomator.path,
  wireshark: wireshark.path,
  dotnet: dotnet.path,
  powershell: powers.path,
  opencode: opencode.path,
  go: go.path,
  rust: rust.path,
  openjdk: openjdk.path,
  curl: curl.path,
  ffmpeg: ffmpeg.path,
  kubernetes: kubernetes.path,
  helm: helm.path,
  terraform: terraform.path,
  neovim: neovim.path,
  nushell: nushell.path,
  starship: starship.path,
  chocolatey: chocolatey.path,
  delta: delta.path,
  rclone: rclone.path,
  deno: deno.path,
  wezterm: wezterm.path,
  alacritty: alacritty.path,
  llvm: llvm.path,
  notepadplusplus: notepadplusplus.path,
  virtualbox: virtualbox.path,
  pycharm: pycharm.path,
  bruno: bruno.path,
  mongodb: mongodb.path,
  zed: zed.path,
  librewolf: librewolf.path,
  arc: arc.path,
  operagx: operagx.path,
  thunderbird: thunderbird.path,
  mattermost: mattermost.path,
  foobar2000: foobar2000.path,
  jellyfin: jellyfin.path,
  mpv: mpv.path,
  rainmeter: rainmeter.path,
  autohotkey: autohotkey.path,
  syncthing: syncthing.path,
  wireguard: wireguard.path,
  teamviewer: teamviewer.path,
  dropbox: dropbox.path,
  anki: anki.path,
  lmms: lmms.path,
  freecad: freecad.path,
  keepassxc: keepassxc.path,
  protonvpn: protonvpn.path,
  mullvad: mullvad.path,
  windsurf: windsurf.path,
  nvidia: nvidia.path,
  googledrive: googledrive.path,
  evernote: evernote.path,
  jetbrains: jetbrains.path,
  insomnia: insomnia.path,
  gnu: gnu.path,
}

type FaIcon = {icon: [number, number, string[], string, string | string[]]}

function faPath(icon: FaIcon) {
  const [w, h, , , path] = icon.icon
  return {
    viewBox: `0 0 ${w} ${h}`,
    path: Array.isArray(path) ? path.join(' ') : path,
  }
}

const faPaths: Record<string, {viewBox: string; path: string}> = {
  slack: faPath(faSlack as unknown as FaIcon),
  visualstudio: faPath(faVisualStudio as unknown as FaIcon),
  microsoft: faPath(faMicrosoft as unknown as FaIcon),
  windows: faPath(faWindows as unknown as FaIcon),
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function CustomGlyph({name}: {name: string}) {
  switch (name) {
    case 'directx':
      return (
        <g {...stroke}>
          <path d="M4 7h7.5a5 5 0 0 1 0 10H4V7Z"/>
          <path d="m13.5 7 6.5 10M20 7l-6.5 10"/>
        </g>
      )
    case 'cpp':
      return (
        <g {...stroke}>
          <path d="M10 7.2a5.2 5.2 0 1 0 0 9.6c1.7 0 3.2-.8 4.2-2.1"/>
          <path d="M16 9v6M13 12h6"/>
        </g>
      )
    case 'webview':
      return (
        <g {...stroke}>
          <rect x="3" y="4" width="18" height="14" rx="1.6"/>
          <path d="M3 8h18"/>
          <path d="m6.5 6 .01 0M9 6l.01 0M11.5 6l.01 0"/>
          <path d="M8 18v2M16 18v2"/>
        </g>
      )
    case 'terminal':
      return (
        <g {...stroke}>
          <rect x="3" y="4" width="18" height="16" rx="1.6"/>
          <path d="m7 9 3 3-3 3M13 15h4"/>
        </g>
      )
    case 'wsl':
      return (
        <g {...stroke}>
          <path d="M4 9c0-3.4 3.6-5 8-5s8 1.6 8 5-3.6 5-8 5-8-1.6-8-5Z"/>
          <path d="M8 7.5c1.5.6 2.5 1.6 2.5 3.2M16 7.5c-1.5.6-2.5 1.6-2.5 3.2"/>
          <path d="M4 9v6.5c0 3.4 3.6 5 8 5s8-1.6 8-5V9"/>
        </g>
      )
    case 'vscode':
      return (
        <g {...stroke}>
          <path d="m4 8 7 4-7 4V8Z"/>
          <path d="m11 12 9-6v12l-9-6Z"/>
        </g>
      )
    case 'teams':
      return (
        <g {...stroke}>
          <circle cx="9" cy="8" r="2.5"/>
          <path d="M4.5 18c0-3 2-5 4.5-5s4.5 2 4.5 5"/>
          <circle cx="17" cy="9" r="2"/>
          <path d="M15.5 18c0-2.6 1.3-4.5 3.5-4.5 1.3 0 2.3.7 2.8 1.8"/>
          <path d="M8 7.5h4M10 6v7"/>
        </g>
      )
    case 'mpc':
      return (
        <g {...stroke}>
          <circle cx="12" cy="12" r="9"/>
          <path d="m10 8 6 4-6 4V8Z" fill="currentColor" stroke="none"/>
        </g>
      )
    case 'handbrake':
      return (
        <g {...stroke}>
          <path d="M8 9h8l2.2 10H5.8L8 9Z"/>
          <path d="M9 9c0-4 6-4 6 0M12 3v3"/>
          <path d="M9 13h6"/>
        </g>
      )
    case 'klite':
      return (
        <g {...stroke}>
          <rect x="4" y="4" width="16" height="16" rx="1.6"/>
          <path d="M8.5 7v10M8.5 12l5-5M8.5 12l5 5"/>
        </g>
      )
    case 'prism':
      return (
        <g {...stroke}>
          <path d="m12 3 8 15H4L12 3Z"/>
          <path d="m12 8.5 4 8H8l4-8Z"/>
        </g>
      )
    case 'playnite':
      return (
        <g {...stroke}>
          <circle cx="12" cy="12" r="9"/>
          <path d="m10 8 6 4-6 4V8Z"/>
        </g>
      )
    case 'vortex':
      return (
        <g {...stroke}>
          <path d="M12 3a9 9 0 1 0 9 9"/>
          <path d="M12 6a6 6 0 1 1-6 6"/>
          <path d="M12 9a3 3 0 1 0 3 3"/>
          <path d="M18 3v5h-5"/>
        </g>
      )
    case 'parsec':
      return (
        <g {...stroke}>
          <path d="M3 12h15M13 7l5 5-5 5"/>
          <path d="m8 7-5 5 5 5"/>
        </g>
      )
    case 'moonlight':
      return (
        <g {...stroke}>
          <path d="M15.5 3.5A8.8 8.8 0 1 0 20.5 15a7 7 0 0 1-5-11.5Z"/>
          <path d="m17 4 .4 1.4L19 6l-1.6.6L17 8l-.4-1.4L15 6l1.6-.6L17 4Z" fill="currentColor" stroke="none"/>
        </g>
      )
    case 'winrar':
      return (
        <g {...stroke}>
          <path d="M5 7h14v13H5V7Z"/>
          <path d="M8 7v13M12 7v13M16 7v13"/>
          <path d="M5 4h14v3H5z"/>
        </g>
      )
    case 'nanazip':
      return (
        <g {...stroke}>
          <path d="M5 8h14v11H5V8Z"/>
          <path d="m5 8 2-4h10l2 4M10 12h4"/>
        </g>
      )
    case 'everything':
      return (
        <g {...stroke}>
          <circle cx="10.5" cy="10.5" r="6.5"/>
          <path d="m15.5 15.5 5 5M8 9.5h5M8 12.5h4"/>
        </g>
      )
    case 'powertoys':
      return (
        <g {...stroke}>
          <rect x="4" y="4" width="6.5" height="6.5" rx="1"/>
          <rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/>
          <rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/>
          <path d="M13.5 16.7h6.5M16.7 13.5v6.5"/>
        </g>
      )
    case 'rufus':
      return (
        <g {...stroke}>
          <path d="M9 3h6v5l2.5 3.5V21h-11v-9.5L9 8V3Z"/>
          <path d="M9 3h6M7 15h10M12 11v3"/>
        </g>
      )
    case 'ventoy':
      return (
        <g {...stroke}>
          <circle cx="12" cy="12" r="9"/>
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 3v6M12 15v6M3 12h6M15 12h6"/>
        </g>
      )
    case 'crystal':
      return (
        <g {...stroke}>
          <ellipse cx="12" cy="8.5" rx="7.5" ry="3"/>
          <path d="M4.5 8.5v7c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-7"/>
          <path d="M8 5.8h8"/>
        </g>
      )
    case 'hwinfo':
      return (
        <g {...stroke}>
          <rect x="7" y="7" width="10" height="10" rx="1.2"/>
          <path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>
        </g>
      )
    case 'wiztree':
      return (
        <g {...stroke}>
          <path d="M12 21V9M12 13 7 9M12 11l5-4"/>
          <circle cx="12" cy="5.5" r="3"/>
          <circle cx="5.5" cy="7" r="2.5"/>
          <circle cx="18.5" cy="7" r="2.5"/>
        </g>
      )
    case 'calibre':
      return (
        <g {...stroke}>
          <path d="M4 5h5.5A2.5 2.5 0 0 1 12 7.5V20a3 3 0 0 0-3-3H4V5Z"/>
          <path d="M20 5h-5.5A2.5 2.5 0 0 0 12 7.5V20a3 3 0 0 1 3-3h5V5Z"/>
        </g>
      )
    case 'pdf':
      return (
        <g {...stroke}>
          <path d="M6 3h8l4 4v14H6V3Z"/>
          <path d="M14 3v4h4M9 12h6M9 15h4"/>
        </g>
      )
    case 'adobe':
      return (
        <g {...stroke}>
          <path d="m3.5 20 7-16h3l7 16h-4.3l-1.3-3.5H10L8.6 20H3.5Z"/>
          <path d="M12 10.5 14.2 16h-2.8l1.4-3.3"/>
        </g>
      )
    case 'shotcut':
      return (
        <g {...stroke}>
          <circle cx="7" cy="18" r="2.2"/>
          <circle cx="17" cy="18" r="2.2"/>
          <path d="m8.7 16.3 7-10.8M15.3 16.3l-7-10.8"/>
        </g>
      )
    case 'paintnet':
      return (
        <g {...stroke}>
          <path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 1.4-2-.7-1.2.3-2.6 1.8-2.6H17a4 4 0 0 0 4-4C21 7.2 17 3 12 3Z"/>
          <circle cx="8" cy="10" r="1" fill="currentColor" stroke="none"/>
          <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none"/>
          <circle cx="16" cy="9" r="1" fill="currentColor" stroke="none"/>
        </g>
      )
    case 'veracrypt':
      return (
        <g {...stroke}>
          <rect x="4.5" y="10" width="15" height="10" rx="1.6"/>
          <path d="M8 10V7a4 4 0 0 1 8 0v3"/>
          <circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none"/>
        </g>
      )
    case 'ripgrep':
      return (
        <g {...stroke}>
          <circle cx="10.5" cy="10.5" r="6"/>
          <path d="m15 15 5 5M8 8.5h5M8 11.5h3.5"/>
        </g>
      )
    case 'fd':
      return (
        <g {...stroke}>
          <path d="M4 7h6l1.6 2H20v9H4V7Z"/>
          <circle cx="10.5" cy="13.5" r="3"/>
          <path d="m12.7 15.7 2.3 2.3"/>
        </g>
      )
    case 'bat':
      return (
        <g {...stroke}>
          <path d="M7 3h7l4 4v14H7V3Z"/>
          <path d="M14 3v4h4M10 11h5M10 14h3"/>
          <path d="M4 20l-1.5 1.5"/>
        </g>
      )
    case 'fzf':
      return (
        <g {...stroke}>
          <path d="M4 5h16l-6 7v6l-4 2v-8L4 5Z"/>
        </g>
      )
    case 'jq':
      return (
        <g {...stroke}>
          <path d="M9 4c-2 0-2 2-2 4s0 3-2 4c2 1 2 2 2 4s0 4 2 4"/>
          <path d="M15 4c2 0 2 2 2 4s0 3 2 4c-2 1-2 2-2 4s0 4-2 4"/>
        </g>
      )
    case 'wget':
      return (
        <g {...stroke}>
          <path d="M12 3v10M8 9l4 4 4-4M5 17v3h14v-3"/>
        </g>
      )
    case 'ytdlp':
      return (
        <g {...stroke}>
          <rect x="3" y="4" width="18" height="12" rx="2"/>
          <path d="m10 7 4 3-4 3V7Z" fill="currentColor" stroke="none"/>
          <path d="M12 16v4M9 18l3 3 3-3"/>
        </g>
      )
    case 'awscli':
      return (
        <g {...stroke}>
          <path d="M7 13a4 4 0 0 1 .5-7.8A5 5 0 0 1 17 6.6 3.4 3.4 0 0 1 17 13H7Z"/>
          <path d="m9 17 2 2-2 2M13 21h3"/>
        </g>
      )
    case 'azurecli':
      return (
        <g {...stroke}>
          <path d="M7 13a4 4 0 0 1 .5-7.8A5 5 0 0 1 17 6.6 3.4 3.4 0 0 1 17 13H7Z"/>
          <path d="M9 20h6"/>
        </g>
      )
    case 'btop':
      return (
        <g {...stroke}>
          <rect x="3.5" y="4" width="17" height="16" rx="1.6"/>
          <path d="M8 16v-4M12 16V8M16 16v-6"/>
        </g>
      )
    case 'cmake':
      return (
        <g {...stroke}>
          <path d="m12 4 8 15H4L12 4Z"/>
          <path d="M12 9.5v5M9 16h6"/>
        </g>
      )
    case 'lazygit':
      return (
        <g {...stroke}>
          <circle cx="7" cy="6" r="2"/>
          <circle cx="7" cy="18" r="2"/>
          <circle cx="17" cy="9" r="2"/>
          <path d="M7 8v8M17 11v3a4 4 0 0 1-4 4H9"/>
        </g>
      )
    case 'ninja':
      return (
        <g {...stroke}>
          <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>
        </g>
      )
    case 'msys2':
      return (
        <g {...stroke}>
          <path d="M12 3a9 9 0 1 0 9 9h-9V3Z"/>
          <circle cx="9" cy="7.5" r="1" fill="currentColor" stroke="none"/>
        </g>
      )
    case 'winmerge':
      return (
        <g {...stroke}>
          <rect x="3" y="5" width="8" height="14" rx="1"/>
          <rect x="13" y="5" width="8" height="14" rx="1"/>
          <path d="m9.5 8-2 4 2 4M14.5 8l2 4-2 4"/>
        </g>
      )
    case 'yandex':
      return (
        <g {...stroke}>
          <circle cx="12" cy="12" r="9"/>
          <path d="m15.5 8.5-2 6-5 1.5 2-6 5-1.5Z"/>
        </g>
      )
    case 'potplayer':
      return (
        <g {...stroke}>
          <rect x="3" y="4" width="18" height="16" rx="2"/>
          <path d="m10 8 5 4-5 4V8Z"/>
          <path d="M6 18h5"/>
        </g>
      )
    case 'mkvtoolnix':
      return (
        <g {...stroke}>
          <rect x="3" y="6" width="18" height="12" rx="1.5"/>
          <path d="M8 6v12M12 6v12M16 6v12"/>
        </g>
      )
    case 'rockstar':
      return (
        <g {...stroke}>
          <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.3l-4.8 2.6.9-5.4-3.9-3.8 5.4-.8L12 4Z"/>
        </g>
      )
    case 'amazongames':
      return (
        <g {...stroke}>
          <path d="M7 8h10a5 5 0 0 1 5 5 3 3 0 0 1-5.4 1.8L15 13H9l-1.6 1.8A3 3 0 0 1 2 13a5 5 0 0 1 5-5Z"/>
          <path d="M7 11h2.5M8.2 9.8v2.4M15.4 10.5h.01M17.4 12h.01"/>
        </g>
      )
    case 'minecraft':
      return (
        <g {...stroke}>
          <path d="M4 6h16v12H4V6Z"/>
          <path d="M4 10h16M8 6v4M14 6v4M6 14h3M13 14h4"/>
        </g>
      )
    case 'itch':
      return (
        <g {...stroke}>
          <rect x="3" y="3" width="18" height="18" rx="4"/>
          <path d="M12 8v.01M12 11v5"/>
        </g>
      )
    case 'etcher':
      return (
        <g {...stroke}>
          <path d="M7 3h8l3 3v15H7V3Z"/>
          <path d="M10 6v4M13 6v4"/>
        </g>
      )
    case 'cpuz':
      return (
        <g {...stroke}>
          <rect x="6" y="6" width="12" height="12" rx="2"/>
          <rect x="10" y="10" width="4" height="4" rx="0.6"/>
          <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>
        </g>
      )
    case 'gpuz':
      return (
        <g {...stroke}>
          <rect x="3" y="7" width="18" height="11" rx="1.6"/>
          <circle cx="8.5" cy="12.5" r="2.5"/>
          <path d="M14 10h5M14 12.5h5M14 15h3"/>
        </g>
      )
    case 'afterburner':
      return (
        <g {...stroke}>
          <path d="M4 17a8 8 0 0 1 16 0"/>
          <path d="m12 17 4.5-4.5"/>
          <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/>
        </g>
      )
    case 'flowlauncher':
      return (
        <g {...stroke}>
          <rect x="3" y="5" width="18" height="6" rx="1.6"/>
          <path d="m7 8 1.5 1.5L7 11"/>
          <path d="M4 15h9M4 18h6"/>
        </g>
      )
    case 'files':
      return (
        <g {...stroke}>
          <path d="M3 7h6l2 2h10v11H3V7Z"/>
          <path d="M3 11.5h18"/>
        </g>
      )
    case 'revo':
      return (
        <g {...stroke}>
          <path d="M5 7h14l-1 13H6L5 7Z"/>
          <path d="M9 7V4h6v3M10 11v6M14 11v6"/>
        </g>
      )
    case 'onedrive':
      return (
        <g {...stroke}>
          <path d="M7 18a4 4 0 0 1 .6-8 5.5 5.5 0 0 1 10.5 1.4A3.5 3.5 0 0 1 17.5 18H7Z"/>
        </g>
      )
    case 'bleachbit':
      return (
        <g {...stroke}>
          <path d="M12 3c3 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 2-5 5-9Z"/>
          <path d="m18.5 3.5.4 1.4 1.4.4-1.4.4-.4 1.4-.4-1.4-1.4-.4 1.4-.4.4-1.4Z" fill="currentColor" stroke="none"/>
        </g>
      )
    case 'foxit':
      return (
        <g {...stroke}>
          <path d="M6 3h8l4 4v14H6V3Z"/>
          <path d="M14 3v4h4M10 11h4M10 11v6M10 14h3"/>
        </g>
      )
    case 'reaper':
      return (
        <g {...stroke}>
          <path d="M3 12h3l2-6 3 12 2-9 2 6h1l2-3h3"/>
        </g>
      )
    case 'musescore':
      return (
        <g {...stroke}>
          <circle cx="8" cy="17" r="2"/>
          <circle cx="16" cy="14" r="2"/>
          <path d="M10 17V5l8-2v11"/>
        </g>
      )
    case 'darktable':
      return (
        <g {...stroke}>
          <path d="M5 7h14M5 12h14M5 17h14"/>
          <circle cx="9" cy="7" r="1.8"/>
          <circle cx="15" cy="12" r="1.8"/>
          <circle cx="8" cy="17" r="1.8"/>
        </g>
      )
    case 'canva':
      return (
        <g {...stroke}>
          <circle cx="12" cy="12" r="9"/>
          <path d="M12 21c-1.5 0-2-1.2-1.3-2.3.8-1.3-.3-2.7-1.7-2.7H7"/>
          <circle cx="9" cy="9" r="1" fill="currentColor" stroke="none"/>
          <circle cx="14" cy="8" r="1" fill="currentColor" stroke="none"/>
        </g>
      )
    case 'adwcleaner':
      return (
        <g {...stroke}>
          <path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z"/>
          <path d="M9 12h6"/>
        </g>
      )
    case 'nmap':
      return (
        <g {...stroke}>
          <circle cx="12" cy="12" r="9"/>
          <circle cx="12" cy="12" r="4.5"/>
          <path d="m12 12 7-6"/>
        </g>
      )
    case 'openal':
      return (
        <g {...stroke}>
          <path d="M5 10h3l4-4v12l-4-4H5v-4Z"/>
          <path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7 7 0 0 1 0 11"/>
        </g>
      )
    case 'xna':
      return (
        <g {...stroke}>
          <rect x="3.5" y="4" width="17" height="16" rx="2"/>
          <path d="m8 9 8 6M16 9l-8 6"/>
        </g>
      )
    case 'ohmypo':
      return (
        <g {...stroke}>
          <path d="m5 7 3 3-3 3M10 14h5"/>
          <path d="m18 3-1.5 4h3L17 11" />
        </g>
      )
    case 'scrcpy':
      return (
        <g {...stroke}>
          <rect x="5" y="3" width="9" height="18" rx="2"/>
          <path d="M8 6h3v3"/>
          <path d="M16 8h3v8h-3"/>
          <path d="m17 10-1 2 1 2"/>
        </g>
      )
    default:
      return (
        <g {...stroke}>
          <rect x="3.5" y="4" width="17" height="16" rx="1.6"/>
          <path d="M3.5 8h17M7 6.2h.01M10 6.2h.01"/>
        </g>
      )
  }
}

export function BrandIcon({name, size = 24, className}: {name: string; size?: number; className?: string}) {
  const simple = simplePaths[name]
  if (simple) {
    return (
      <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d={simple}/>
      </svg>
    )
  }
  const fa = faPaths[name]
  if (fa) {
    return (
      <svg
        className={className}
        width={size}
        height={size}
        viewBox={fa.viewBox}
        fill="currentColor"
        aria-hidden="true"
      >
        <path d={fa.path}/>
      </svg>
    )
  }
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <CustomGlyph name={name}/>
    </svg>
  )
}

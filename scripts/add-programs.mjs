import {execFileSync} from 'node:child_process'
import {readFileSync, writeFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

const catalogPath = fileURLToPath(new URL('../shared/catalog.json', import.meta.url))

const cliGroup = {
  id: 'cli',
  name: 'Консоль',
  description: 'Командні рядки, пакетні менеджери та CLI-інструменти.',
  index: 7,
  nameEn: 'Console',
  descriptionEn: 'Shells, package managers and command-line tools.',
}

const entries = [
  {
    id: 'SST.opencode', name: 'OpenCode CLI', shortName: 'OpenCode CLI', publisher: 'SST', group: 'cli',
    icon: 'opencode', sizeMb: 50, recommended: false, match: ['opencode', 'OpenCode CLI'],
    description: 'Агент для роботи з кодом із командного рядка.',
    tags: ['ші', 'агент', 'код', 'термінал', 'opencode', 'cli'],
  },
  {
    id: 'GoLang.Go', name: 'Go', shortName: 'Go', publisher: 'Google', group: 'cli',
    icon: 'go', sizeMb: 70, recommended: false, match: ['Go Programming Language', 'Go'],
    description: 'Мова Go і набір інструментів для складання програм.',
    tags: ['go', 'golang', 'мова', 'компілятор', 'cli'],
  },
  {
    id: 'Rustlang.Rustup', name: 'Rustup', shortName: 'Rustup', publisher: 'Rust Project', group: 'cli',
    icon: 'rust', sizeMb: 5, recommended: false, match: ['Rustup'],
    description: 'Менеджер інструментів мови Rust і компілятора rustc.',
    tags: ['rust', 'rustup', 'компілятор', 'cargo', 'cli'],
  },
  {
    id: 'EclipseAdoptium.Temurin.21.JDK', name: 'Eclipse Temurin JDK 21', shortName: 'JDK 21',
    publisher: 'Eclipse Adoptium', group: 'cli', icon: 'openjdk', sizeMb: 180, recommended: false,
    match: ['Eclipse Temurin JDK with Hotspot 21', 'Eclipse Temurin JDK', 'Temurin 21'],
    description: 'Безкоштовний OpenJDK 21 для запуску та складання Java-програм.',
    tags: ['java', 'jdk', 'jvm', 'openjdk', 'cli'],
  },
  {
    id: 'BurntSushi.ripgrep.MSVC', name: 'ripgrep', shortName: 'ripgrep', publisher: 'BurntSushi',
    group: 'cli', icon: 'ripgrep', sizeMb: 10, recommended: false, match: ['RipGrep MSVC', 'ripgrep'],
    description: 'Швидкий рекурсивний пошук рядків у файлах.',
    tags: ['пошук', 'grep', 'ripgrep', 'текст', 'cli'],
  },
  {
    id: 'sharkdp.fd', name: 'fd', shortName: 'fd', publisher: 'sharkdp', group: 'cli',
    icon: 'fd', sizeMb: 5, recommended: false, match: ['fd'],
    description: 'Проста й швидка альтернатива команді find.',
    tags: ['пошук', 'файли', 'fd', 'cli'],
  },
  {
    id: 'sharkdp.bat', name: 'bat', shortName: 'bat', publisher: 'sharkdp', group: 'cli',
    icon: 'bat', sizeMb: 5, recommended: false, match: ['bat'],
    description: 'Перегляд файлів із підсвічуванням синтаксису.',
    tags: ['перегляд', 'синтаксис', 'cat', 'bat', 'cli'],
  },
  {
    id: 'junegunn.fzf', name: 'fzf', shortName: 'fzf', publisher: 'junegunn', group: 'cli',
    icon: 'fzf', sizeMb: 5, recommended: false, match: ['fzf'],
    description: 'Інтерактивний пошук і фільтрування списків у терміналі.',
    tags: ['пошук', 'фільтр', 'fzf', 'термінал', 'cli'],
  },
  {
    id: 'jqlang.jq', name: 'jq', shortName: 'jq', publisher: 'jqlang', group: 'cli',
    icon: 'jq', sizeMb: 5, recommended: false, match: ['jq'],
    description: 'Обробка й фільтрація JSON у командному рядку.',
    tags: ['json', 'jq', 'обробка', 'cli'],
  },
  {
    id: 'cURL.cURL', name: 'curl', shortName: 'curl', publisher: 'curl', group: 'cli',
    icon: 'curl', sizeMb: 10, recommended: false, match: ['cURL', 'curl'],
    description: 'Передавання даних за URL із командного рядка.',
    tags: ['http', 'curl', 'мережа', 'api', 'cli'],
  },
  {
    id: 'JernejSimoncic.Wget', name: 'Wget', shortName: 'Wget', publisher: 'Jernej Simončič',
    group: 'cli', icon: 'wget', sizeMb: 5, recommended: false, match: ['Wget'],
    description: 'Завантаження файлів із мережі в командному рядку.',
    tags: ['завантаження', 'wget', 'http', 'мережа', 'cli'],
  },
  {
    id: 'Gyan.FFmpeg', name: 'FFmpeg', shortName: 'FFmpeg', publisher: 'Gyan Doshi', group: 'cli',
    icon: 'ffmpeg', sizeMb: 100, recommended: false, match: ['FFmpeg'],
    description: 'Конвертація, запис і обробка аудіо та відео.',
    tags: ['відео', 'аудіо', 'конвертація', 'ffmpeg', 'cli'],
  },
  {
    id: 'yt-dlp.yt-dlp', name: 'yt-dlp', shortName: 'yt-dlp', publisher: 'yt-dlp', group: 'cli',
    icon: 'ytdlp', sizeMb: 30, recommended: false, match: ['yt-dlp'],
    description: 'Завантаження відео та музики з різних сайтів.',
    tags: ['відео', 'завантаження', 'yt-dlp', 'youtube', 'cli'],
  },
  {
    id: 'GitHub.cli', name: 'GitHub CLI', shortName: 'gh', publisher: 'GitHub', group: 'cli',
    icon: 'github', sizeMb: 30, recommended: false, match: ['GitHub CLI', 'gh'],
    description: 'Керування GitHub із термінала: pull requests, issues, релізи.',
    tags: ['github', 'git', 'cli', 'issues', 'api'],
  },
  {
    id: 'Amazon.AWSCLI', name: 'AWS CLI', shortName: 'AWS CLI', publisher: 'Amazon', group: 'cli',
    icon: 'awscli', sizeMb: 70, recommended: false, match: ['AWS Command Line Interface'],
    description: 'Керування сервісами Amazon Web Services із командного рядка.',
    tags: ['aws', 'хмара', 'cli', 'devops'],
  },
  {
    id: 'Microsoft.AzureCLI', name: 'Azure CLI', shortName: 'Azure CLI', publisher: 'Microsoft',
    group: 'cli', icon: 'azurecli', sizeMb: 80, recommended: false, match: ['Microsoft Azure CLI'],
    description: 'Керування ресурсами Microsoft Azure із командного рядка.',
    tags: ['azure', 'хмара', 'cli', 'microsoft', 'devops'],
  },
  {
    id: 'Kubernetes.kubectl', name: 'kubectl', shortName: 'kubectl', publisher: 'Kubernetes',
    group: 'cli', icon: 'kubernetes', sizeMb: 60, recommended: false, match: ['Kubernetes CLI', 'kubectl'],
    description: 'Керування кластерами Kubernetes із термінала.',
    tags: ['kubernetes', 'k8s', 'cli', 'контейнери', 'devops'],
  },
  {
    id: 'Helm.Helm', name: 'Helm', shortName: 'Helm', publisher: 'Helm', group: 'cli',
    icon: 'helm', sizeMb: 30, recommended: false, match: ['Helm'],
    description: 'Пакети та шаблони для застосунків у Kubernetes.',
    tags: ['kubernetes', 'helm', 'cli', 'devops'],
  },
  {
    id: 'Hashicorp.Terraform', name: 'Terraform', shortName: 'Terraform', publisher: 'HashiCorp',
    group: 'cli', icon: 'terraform', sizeMb: 30, recommended: false,
    match: ['HashiCorp Terraform', 'Terraform'],
    description: 'Опис і розгортання інфраструктури як код.',
    tags: ['terraform', 'інфраструктура', 'cli', 'devops'],
  },
  {
    id: 'Neovim.Neovim', name: 'Neovim', shortName: 'Neovim', publisher: 'Neovim', group: 'cli',
    icon: 'neovim', sizeMb: 40, recommended: false, match: ['Neovim'],
    description: 'Розширюваний консольний редактор коду на основі Vim.',
    tags: ['редактор', 'vim', 'neovim', 'термінал', 'код'],
  },
  {
    id: 'aristocratos.btop4win', name: 'btop4win', shortName: 'btop', publisher: 'aristocratos',
    group: 'cli', icon: 'btop', sizeMb: 10, recommended: false, match: ['btop4win'],
    description: 'Монітор процесорів, пам\'яті та мережі в терміналі.',
    tags: ['моніторинг', 'процеси', 'термінал', 'btop', 'cli'],
  },
  {
    id: 'Nushell.Nushell', name: 'Nushell', shortName: 'Nushell', publisher: 'Nushell', group: 'cli',
    icon: 'nushell', sizeMb: 40, recommended: false, match: ['nu', 'Nushell'],
    description: 'Командна оболонка, що працює зі структурованими даними.',
    tags: ['shell', 'nushell', 'консоль', 'cli'],
  },
  {
    id: 'Starship.Starship', name: 'Starship', shortName: 'Starship', publisher: 'Starship', group: 'cli',
    icon: 'starship', sizeMb: 10, recommended: false, match: ['starship', 'Starship'],
    description: 'Швидкий і налаштовуваний рядок запрошення для будь-якої оболонки.',
    tags: ['shell', 'prompt', 'starship', 'термінал', 'cli'],
  },
  {
    id: 'Kitware.CMake', name: 'CMake', shortName: 'CMake', publisher: 'Kitware', group: 'cli',
    icon: 'cmake', sizeMb: 100, recommended: false, match: ['CMake'],
    description: 'Система збірки для C і C++ проєктів.',
    tags: ['збірка', 'cmake', 'c++', 'cli'],
  },
  {
    id: 'Chocolatey.Chocolatey', name: 'Chocolatey', shortName: 'Chocolatey', publisher: 'Chocolatey',
    group: 'cli', icon: 'chocolatey', sizeMb: 30, recommended: false, match: ['Chocolatey'],
    description: 'Менеджер пакетів для автоматичної інсталяції програм.',
    tags: ['пакети', 'chocolatey', 'cli', 'інсталяція'],
  },
  {
    id: 'JanDeDobbeleer.OhMyPosh', name: 'Oh My Posh', shortName: 'Oh My Posh',
    publisher: 'Jan De Dobbeleer', group: 'cli', icon: 'ohmypo', sizeMb: 15, recommended: false,
    match: ['Oh My Posh'],
    description: 'Рядок запрошення з темами для PowerShell, bash і zsh.',
    tags: ['prompt', 'термінал', 'oh-my-posh', 'cli'],
  },
  {
    id: 'JesseDuffield.lazygit', name: 'lazygit', shortName: 'lazygit', publisher: 'Jesse Duffield',
    group: 'cli', icon: 'lazygit', sizeMb: 15, recommended: false, match: ['lazygit'],
    description: 'Простий термінальний інтерфейс до Git.',
    tags: ['git', 'термінал', 'lazygit', 'cli'],
  },
  {
    id: 'dandavison.delta', name: 'delta', shortName: 'delta', publisher: 'Dan Davison', group: 'cli',
    icon: 'delta', sizeMb: 10, recommended: false, match: ['delta'],
    description: 'Зручний переглядач різниці змін Git.',
    tags: ['git', 'diff', 'delta', 'cli'],
  },
  {
    id: 'uutils.coreutils', name: 'coreutils', shortName: 'coreutils', publisher: 'uutils', group: 'cli',
    icon: 'gnu', sizeMb: 15, recommended: false, match: ['coreutils'],
    description: 'Класичні утиліти GNU coreutils, переписані на Rust.',
    tags: ['coreutils', 'gnu', 'утиліти', 'cli'],
  },
  {
    id: 'Rclone.Rclone', name: 'Rclone', shortName: 'Rclone', publisher: 'Rclone', group: 'cli',
    icon: 'rclone', sizeMb: 20, recommended: false, match: ['Rclone'],
    description: 'Синхронізація й перенесення даних між хмарними сховищами.',
    tags: ['хмара', 'синхронізація', 'rclone', 'cli'],
  },
  {
    id: 'DenoLand.Deno', name: 'Deno', shortName: 'Deno', publisher: 'Deno Land', group: 'cli',
    icon: 'deno', sizeMb: 40, recommended: false, match: ['Deno'],
    description: 'Середовище виконання JavaScript і TypeScript із безпечними дозволами.',
    tags: ['javascript', 'typescript', 'deno', 'runtime', 'cli'],
  },
  {
    id: 'Genymobile.scrcpy', name: 'scrcpy', shortName: 'scrcpy', publisher: 'Genymobile', group: 'cli',
    icon: 'scrcpy', sizeMb: 40, recommended: false, match: ['scrcpy'],
    description: 'Дзеркалення й керування екраном Android-пристрою з ПК.',
    tags: ['android', 'scrcpy', 'дзеркалення', 'cli'],
  },
  {
    id: 'wez.wezterm', name: 'WezTerm', shortName: 'WezTerm', publisher: 'Wez Furlong', group: 'cli',
    icon: 'wezterm', sizeMb: 30, recommended: false, match: ['WezTerm'],
    description: 'Термінал із вкладками, GPU-рендерингом і мультиплексором.',
    tags: ['термінал', 'gpu', 'wezterm', 'cli'],
  },
  {
    id: 'Alacritty.Alacritty', name: 'Alacritty', shortName: 'Alacritty', publisher: 'Alacritty',
    group: 'cli', icon: 'alacritty', sizeMb: 15, recommended: false, match: ['Alacritty'],
    description: 'Швидкий термінал з апаратним прискоренням.',
    tags: ['термінал', 'gpu', 'alacritty', 'cli'],
  },
  {
    id: 'LLVM.LLVM', name: 'LLVM', shortName: 'LLVM', publisher: 'LLVM Project', group: 'cli',
    icon: 'llvm', sizeMb: 800, recommended: false, match: ['LLVM'],
    description: 'Набір компіляторів Clang і інструментів LLVM.',
    tags: ['llvm', 'clang', 'компілятор', 'c++', 'cli'],
  },
  {
    id: 'Ninja-build.Ninja', name: 'Ninja', shortName: 'Ninja', publisher: 'Ninja', group: 'cli',
    icon: 'ninja', sizeMb: 5, recommended: false, match: ['Ninja'],
    description: 'Швидка система збірки для великих проєктів.',
    tags: ['збірка', 'ninja', 'c++', 'cli'],
  },
  {
    id: 'MSYS2.MSYS2', name: 'MSYS2', shortName: 'MSYS2', publisher: 'MSYS2', group: 'cli',
    icon: 'msys2', sizeMb: 200, recommended: false, match: ['MSYS2'],
    description: 'Unix-подібне середовище та менеджер пакетів pacman для Windows.',
    tags: ['msys2', 'unix', 'pacman', 'компілятор', 'cli'],
  },

  {
    id: 'Notepad++.Notepad++', name: 'Notepad++', shortName: 'Notepad++', publisher: 'Don Ho',
    group: 'development', icon: 'notepadplusplus', sizeMb: 5, recommended: true, match: ['Notepad++'],
    description: 'Текстовий редактор із підсвічуванням синтаксису та плагінами.',
    tags: ['редактор', 'текст', 'notepad++', 'код'],
  },
  {
    id: 'Oracle.VirtualBox', name: 'Oracle VirtualBox', shortName: 'VirtualBox', publisher: 'Oracle',
    group: 'development', icon: 'virtualbox', sizeMb: 120, recommended: false,
    match: ['Oracle VirtualBox', 'Oracle VM VirtualBox'],
    description: 'Віртуальні машини для тестів і перевірки сумісності.',
    tags: ['віртуалізація', 'vm', 'virtualbox', 'oracle'],
  },
  {
    id: 'JetBrains.PyCharm.Community', name: 'PyCharm Community', shortName: 'PyCharm',
    publisher: 'JetBrains', group: 'development', icon: 'pycharm', sizeMb: 600, recommended: false,
    match: ['PyCharm Community Edition', 'PyCharm'],
    description: 'IDE для Python і роботи з віртуальними середовищами.',
    tags: ['python', 'ide', 'jetbrains', 'pycharm'],
  },
  {
    id: 'Bruno.Bruno', name: 'Bruno', shortName: 'Bruno', publisher: 'Bruno', group: 'development',
    icon: 'bruno', sizeMb: 120, recommended: false, match: ['Bruno'],
    description: 'Офлайн-клієнт для тестування HTTP API з файлами колекцій.',
    tags: ['api', 'http', 'bruno', 'тестування'],
  },
  {
    id: 'MongoDB.Compass.Full', name: 'MongoDB Compass', shortName: 'Compass', publisher: 'MongoDB',
    group: 'development', icon: 'mongodb', sizeMb: 200, recommended: false, match: ['MongoDB Compass'],
    description: 'Графічний клієнт для роботи з базами MongoDB.',
    tags: ['mongodb', 'бази даних', 'compass', 'nosql'],
  },
  {
    id: 'ZedIndustries.Zed', name: 'Zed', shortName: 'Zed', publisher: 'Zed Industries',
    group: 'development', icon: 'zed', sizeMb: 200, recommended: false, match: ['Zed'],
    description: 'Швидкий редактор коду зі спільною роботою та ШІ.',
    tags: ['редактор', 'код', 'zed', 'ші'],
  },
  {
    id: 'WinMerge.WinMerge', name: 'WinMerge', shortName: 'WinMerge', publisher: 'WinMerge',
    group: 'development', icon: 'winmerge', sizeMb: 15, recommended: false, match: ['WinMerge'],
    description: 'Порівняння та злиття файлів і каталогів.',
    tags: ['diff', 'порівняння', 'merge', 'winmerge'],
  },
  {
    id: 'JetBrains.Toolbox', name: 'JetBrains Toolbox', shortName: 'Toolbox', publisher: 'JetBrains',
    group: 'development', icon: 'jetbrains', sizeMb: 100, recommended: false,
    match: ['JetBrains Toolbox'],
    description: 'Керування встановленням і оновленням IDE JetBrains.',
    tags: ['jetbrains', 'ide', 'toolbox', 'оновлення'],
  },
  {
    id: 'Insomnia.Insomnia', name: 'Insomnia', shortName: 'Insomnia', publisher: 'Insomnia',
    group: 'development', icon: 'insomnia', sizeMb: 200, recommended: false, match: ['Insomnia'],
    description: 'Клієнт для запитів до REST і GraphQL API.',
    tags: ['api', 'rest', 'graphql', 'insomnia', 'тестування'],
  },

  {
    id: 'LibreWolf.LibreWolf', name: 'LibreWolf', shortName: 'LibreWolf', publisher: 'LibreWolf',
    group: 'browsers', icon: 'librewolf', sizeMb: 80, recommended: false, match: ['LibreWolf'],
    description: 'Приватний браузер на базі Firefox без телеметрії.',
    tags: ['браузер', 'browser', 'приватність', 'firefox', 'librewolf'],
  },
  {
    id: 'TheBrowserCompany.Arc', name: 'Arc', shortName: 'Arc', publisher: 'The Browser Company',
    group: 'browsers', icon: 'arc', sizeMb: 150, recommended: false, match: ['Arc'],
    description: 'Браузер із бічною панеллю та просторами для вкладок.',
    tags: ['браузер', 'browser', 'arc', 'вкладки'],
  },
  {
    id: 'Yandex.Browser', name: 'Yandex Browser', shortName: 'Yandex', publisher: 'Yandex',
    group: 'browsers', icon: 'yandex', sizeMb: 120, recommended: false,
    match: ['Yandex Browser', 'Yandex'],
    description: 'Браузер із вбудованим перекладачем і сервісами Яндекса.',
    tags: ['браузер', 'browser', 'yandex', 'переклад'],
  },
  {
    id: 'Opera.OperaGX', name: 'Opera GX', shortName: 'Opera GX', publisher: 'Opera Norway',
    group: 'browsers', icon: 'operagx', sizeMb: 100, recommended: false,
    match: ['Opera GX Stable', 'Opera GX'],
    description: 'Ігрова версія Opera з обмеженням споживання ресурсів.',
    tags: ['браузер', 'browser', 'opera', 'ігри', 'gx'],
  },

  {
    id: 'Mozilla.Thunderbird', name: 'Mozilla Thunderbird', shortName: 'Thunderbird',
    publisher: 'Mozilla', group: 'communication', icon: 'thunderbird', sizeMb: 60, recommended: false,
    match: ['Mozilla Thunderbird', 'Thunderbird'],
    description: 'Поштовий клієнт із календарем і стрічкою новин.',
    tags: ['пошта', 'email', 'календар', 'thunderbird'],
  },
  {
    id: 'Mattermost.MattermostDesktop', name: 'Mattermost', shortName: 'Mattermost',
    publisher: 'Mattermost', group: 'communication', icon: 'mattermost', sizeMb: 150,
    recommended: false, match: ['Mattermost'],
    description: 'Командний чат для власного сервера.',
    tags: ['чат', 'mattermost', 'команда', 'self-hosted'],
  },

  {
    id: 'PeterPawlowski.foobar2000', name: 'foobar2000', shortName: 'foobar2000',
    publisher: 'Peter Pawlowski', group: 'media', icon: 'foobar2000', sizeMb: 10, recommended: false,
    match: ['foobar2000'],
    description: 'Швидкий аудіоплеєр із підтримкою тегів і конвертації.',
    tags: ['музика', 'плеєр', 'foobar2000', 'аудіо'],
  },
  {
    id: 'Jellyfin.JellyfinMediaPlayer', name: 'Jellyfin Media Player', shortName: 'Jellyfin',
    publisher: 'Jellyfin', group: 'media', icon: 'jellyfin', sizeMb: 60, recommended: false,
    match: ['Jellyfin Media Player'],
    description: 'Плеєр для власного медіасервера Jellyfin.',
    tags: ['медіа', 'jellyfin', 'плеєр', 'сервер'],
  },
  {
    id: 'Daum.PotPlayer', name: 'PotPlayer', shortName: 'PotPlayer', publisher: 'Kakao',
    group: 'media', icon: 'potplayer', sizeMb: 30, recommended: false, match: ['PotPlayer'],
    description: 'Плеєр із гнучкими налаштуваннями та підтримкою субтитрів.',
    tags: ['плеєр', 'відео', 'potplayer', 'субтитри'],
  },
  {
    id: 'MoritzBunkus.MKVToolNix', name: 'MKVToolNix', shortName: 'MKVToolNix',
    publisher: 'Moritz Bunkus', group: 'media', icon: 'mkvtoolnix', sizeMb: 40, recommended: false,
    match: ['MKVToolNix'],
    description: 'Робота з контейнерами та доріжками файлів MKV.',
    tags: ['mkv', 'відео', 'доріжки', 'субтитри'],
  },
  {
    id: 'mpv.net', name: 'mpv.net', shortName: 'mpv.net', publisher: 'mpv.net', group: 'media',
    icon: 'mpv', sizeMb: 40, recommended: false, match: ['mpv.net'],
    description: 'Мінімальний відеоплеєр на базі mpv із звичним меню.',
    tags: ['плеєр', 'відео', 'mpv', 'медіа'],
  },

  {
    id: 'RockstarGames.Launcher', name: 'Rockstar Games Launcher', shortName: 'Rockstar',
    publisher: 'Rockstar Games', group: 'gaming', icon: 'rockstar', sizeMb: 20, recommended: false,
    match: ['Rockstar Games Launcher'],
    description: 'Лаунчер ігор Rockstar: GTA і Red Dead.',
    tags: ['ігри', 'rockstar', 'лаунчер', 'gta'],
  },
  {
    id: 'Amazon.Games', name: 'Amazon Games', shortName: 'Amazon Games', publisher: 'Amazon',
    group: 'gaming', icon: 'amazongames', sizeMb: 100, recommended: false, match: ['Amazon Games'],
    description: 'Магазин і бібліотека ігор Amazon, зокрема Prime Gaming.',
    tags: ['ігри', 'amazon', 'магазин', 'лаунчер'],
  },
  {
    id: 'Mojang.MinecraftLauncher', name: 'Minecraft Launcher', shortName: 'Minecraft',
    publisher: 'Mojang', group: 'gaming', icon: 'minecraft', sizeMb: 30, recommended: false,
    match: ['Minecraft Launcher', 'Minecraft'],
    homepage: 'https://www.minecraft.net/en-us/download',
    description: 'Офіційний лаунчер Minecraft із вибором версій.',
    tags: ['minecraft', 'ігри', 'лаунчер', 'mojang'],
  },
  {
    id: 'ItchIo.Itch', name: 'itch', shortName: 'itch', publisher: 'itch.io', group: 'gaming',
    icon: 'itch', sizeMb: 150, recommended: false, match: ['itch'],
    description: 'Магазин інді-ігор із засобом їх оновлення.',
    tags: ['ігри', 'itch', 'інді', 'магазин'],
  },

  {
    id: 'Balena.Etcher', name: 'balenaEtcher', shortName: 'Etcher', publisher: 'Balena',
    group: 'utilities', icon: 'etcher', sizeMb: 120, recommended: false,
    match: ['balenaEtcher', 'Etcher'],
    description: 'Запис образів ОС на SD-карти та USB-носії.',
    tags: ['образ', 'usb', 'sd', 'etcher'],
  },
  {
    id: 'CPUID.CPU-Z', name: 'CPU-Z', shortName: 'CPU-Z', publisher: 'CPUID', group: 'utilities',
    icon: 'cpuz', sizeMb: 5, recommended: false, match: ['CPUID CPU-Z', 'CPU-Z'],
    description: 'Детальна інформація про процесор, пам\'ять і плату.',
    tags: ['процесор', 'cpu', 'залізо', 'cpu-z'],
  },
  {
    id: 'TechPowerUp.GPU-Z', name: 'GPU-Z', shortName: 'GPU-Z', publisher: 'TechPowerUp',
    group: 'utilities', icon: 'gpuz', sizeMb: 10, recommended: false,
    match: ['TechPowerUp GPU-Z', 'GPU-Z'],
    description: 'Детальна інформація про відеокарту та її сенсори.',
    tags: ['відеокарта', 'gpu', 'залізо', 'gpu-z'],
  },
  {
    id: 'Guru3D.Afterburner', name: 'MSI Afterburner', shortName: 'Afterburner', publisher: 'MSI',
    group: 'utilities', icon: 'afterburner', sizeMb: 40, recommended: false,
    match: ['MSI Afterburner'],
    homepage: 'https://www.msi.com/Landing/afterburner/graphics-cards',
    description: 'Розгін і моніторинг температури відеокарти.',
    tags: ['розгін', 'відеокарта', 'gpu', 'afterburner'],
  },
  {
    id: 'Rainmeter.Rainmeter', name: 'Rainmeter', shortName: 'Rainmeter', publisher: 'Rainmeter',
    group: 'utilities', icon: 'rainmeter', sizeMb: 5, recommended: false, match: ['Rainmeter'],
    description: 'Налаштовувані віджети та панелі для робочого столу.',
    tags: ['робочий стіл', 'віджети', 'rainmeter', 'тема'],
  },
  {
    id: 'AutoHotkey.AutoHotkey', name: 'AutoHotkey', shortName: 'AutoHotkey',
    publisher: 'AutoHotkey', group: 'utilities', icon: 'autohotkey', sizeMb: 10, recommended: false,
    match: ['AutoHotkey'],
    homepage: 'https://www.autohotkey.com/',
    description: 'Автоматизація дій і гарячих клавіш за допомогою скриптів.',
    tags: ['скрипти', 'автоматизація', 'клавіші', 'autohotkey'],
  },
  {
    id: 'Flow-Launcher.Flow-Launcher', name: 'Flow Launcher', shortName: 'Flow',
    publisher: 'Flow Launcher', group: 'utilities', icon: 'flowlauncher', sizeMb: 40,
    recommended: false, match: ['Flow Launcher'],
    description: 'Швидкий запуск програм і пошук по системі.',
    tags: ['запуск', 'пошук', 'flow', 'launcher'],
  },
  {
    id: 'FilesCommunity.Files', name: 'Files', shortName: 'Files', publisher: 'Files Community',
    group: 'utilities', icon: 'files', sizeMb: 60, recommended: false,
    match: ['Files - Stable', 'Files'],
    description: 'Сучасний файловий менеджер із вкладками.',
    tags: ['файли', 'менеджер', 'провідник', 'files'],
  },
  {
    id: 'Syncthing.Syncthing', name: 'Syncthing', shortName: 'Syncthing', publisher: 'Syncthing',
    group: 'utilities', icon: 'syncthing', sizeMb: 20, recommended: false, match: ['Syncthing'],
    description: 'Синхронізація файлів між пристроями без хмари.',
    tags: ['синхронізація', 'файли', 'syncthing', 'p2p'],
  },
  {
    id: 'RevoUninstaller.RevoUninstaller', name: 'Revo Uninstaller', shortName: 'Revo',
    publisher: 'Revo Uninstaller', group: 'utilities', icon: 'revo', sizeMb: 10, recommended: false,
    match: ['Revo Uninstaller'],
    description: 'Повне видалення програм разом із залишками.',
    tags: ['видалення', 'uninstall', 'revo', 'чищення'],
  },
  {
    id: 'WireGuard.WireGuard', name: 'WireGuard', shortName: 'WireGuard', publisher: 'WireGuard',
    group: 'utilities', icon: 'wireguard', sizeMb: 10, recommended: false, match: ['WireGuard'],
    description: 'Простий і швидкий VPN-тунель.',
    tags: ['vpn', 'wireguard', 'мережа', 'безпека'],
  },
  {
    id: 'TeamViewer.TeamViewer', name: 'TeamViewer', shortName: 'TeamViewer',
    publisher: 'TeamViewer', group: 'utilities', icon: 'teamviewer', sizeMb: 60, recommended: false,
    match: ['TeamViewer'],
    description: 'Віддалене керування комп\'ютером і підтримка користувачів.',
    tags: ['віддалений доступ', 'teamviewer', 'підтримка', 'remote'],
  },
  {
    id: 'Microsoft.OneDrive', name: 'Microsoft OneDrive', shortName: 'OneDrive',
    publisher: 'Microsoft', group: 'utilities', icon: 'onedrive', sizeMb: 100, recommended: false,
    match: ['Microsoft OneDrive'],
    description: 'Синхронізація файлів із хмарою Microsoft.',
    tags: ['хмара', 'синхронізація', 'onedrive', 'microsoft'],
  },
  {
    id: 'Google.GoogleDrive', name: 'Google Drive', shortName: 'Google Drive', publisher: 'Google',
    group: 'utilities', icon: 'googledrive', sizeMb: 120, recommended: false, match: ['Google Drive'],
    description: 'Синхронізація файлів із Google Диском.',
    tags: ['хмара', 'синхронізація', 'google drive', 'файли'],
  },
  {
    id: 'Dropbox.Dropbox', name: 'Dropbox', shortName: 'Dropbox', publisher: 'Dropbox',
    group: 'utilities', icon: 'dropbox', sizeMb: 130, recommended: false, match: ['Dropbox'],
    description: 'Синхронізація файлів між пристроями та командою.',
    tags: ['хмара', 'синхронізація', 'dropbox', 'файли'],
  },
  {
    id: 'BleachBit.BleachBit', name: 'BleachBit', shortName: 'BleachBit', publisher: 'BleachBit',
    group: 'utilities', icon: 'bleachbit', sizeMb: 20, recommended: false, match: ['BleachBit'],
    description: 'Очищення диска від тимчасових файлів і кешів.',
    tags: ['очищення', 'диск', 'bleachbit', 'приватність'],
  },

  {
    id: 'Anki.Anki', name: 'Anki', shortName: 'Anki', publisher: 'Anki', group: 'office',
    icon: 'anki', sizeMb: 120, recommended: false, match: ['Anki'],
    description: 'Флеш-картки з інтервальними повтореннями для навчання.',
    tags: ['картки', 'навчання', 'anki', 'пам\'ять'],
  },
  {
    id: 'geeksoftwareGmbH.PDF24Creator', name: 'PDF24 Creator', shortName: 'PDF24',
    publisher: 'geeksoftware', group: 'office', icon: 'pdf', sizeMb: 300, recommended: false,
    match: ['PDF24 Creator'],
    description: 'Створення, об\'єднання та стиснення PDF-документів.',
    tags: ['pdf', 'конвертація', 'друк', 'pdf24'],
  },
  {
    id: 'Foxit.FoxitReader', name: 'Foxit PDF Reader', shortName: 'Foxit', publisher: 'Foxit',
    group: 'office', icon: 'foxit', sizeMb: 200, recommended: false,
    match: ['Foxit PDF Reader', 'Foxit Reader'],
    description: 'Швидкий переглядач і коментування PDF-файлів.',
    tags: ['pdf', 'reader', 'foxit', 'документи'],
  },
  {
    id: 'Evernote.Evernote', name: 'Evernote', shortName: 'Evernote', publisher: 'Evernote',
    group: 'office', icon: 'evernote', sizeMb: 250, recommended: false, match: ['Evernote'],
    description: 'Нотатки, знімки екрана та веб-кліпер в одному сервісі.',
    tags: ['нотатки', 'evernote', 'кліпер', 'синхронізація'],
  },

  {
    id: 'Cockos.REAPER', name: 'REAPER', shortName: 'REAPER', publisher: 'Cockos', group: 'creative',
    icon: 'reaper', sizeMb: 20, recommended: false, match: ['REAPER'],
    description: 'Цифрова звукова станція для запису та мікшування.',
    tags: ['звук', 'daw', 'reaper', 'запис'],
  },
  {
    id: 'LMMS.LMMS', name: 'LMMS', shortName: 'LMMS', publisher: 'LMMS', group: 'creative',
    icon: 'lmms', sizeMb: 200, recommended: false, match: ['LMMS'],
    description: 'Створення музики: секвенсор, синтезатори та семпли.',
    tags: ['музика', 'daw', 'lmms', 'синтезатор'],
  },
  {
    id: 'Musescore.Musescore', name: 'MuseScore', shortName: 'MuseScore', publisher: 'MuseScore',
    group: 'creative', icon: 'musescore', sizeMb: 250, recommended: false, match: ['MuseScore'],
    description: 'Нотний редактор із відтворенням партитур.',
    tags: ['ноти', 'музика', 'musescore', 'партитура'],
  },
  {
    id: 'FreeCAD.FreeCAD', name: 'FreeCAD', shortName: 'FreeCAD', publisher: 'FreeCAD',
    group: 'creative', icon: 'freecad', sizeMb: 700, recommended: false, match: ['FreeCAD'],
    description: 'Параметричне 3D-моделювання для інженерії.',
    tags: ['3d', 'cad', 'freecad', 'моделювання'],
  },
  {
    id: 'darktable.darktable', name: 'darktable', shortName: 'darktable', publisher: 'darktable',
    group: 'creative', icon: 'darktable', sizeMb: 150, recommended: false, match: ['darktable'],
    description: 'Обробка RAW-фотографій і каталогізація знімків.',
    tags: ['фото', 'raw', 'darktable', 'обробка'],
  },
  {
    id: 'Canva.Canva', name: 'Canva', shortName: 'Canva', publisher: 'Canva', group: 'creative',
    icon: 'canva', sizeMb: 150, recommended: false, match: ['Canva'],
    homepage: 'https://www.canva.com/download/windows/',
    description: 'Шаблони та графіка для соцмереж, макетів і презентацій.',
    tags: ['дизайн', 'шаблони', 'canva', 'графіка'],
  },

  {
    id: 'KeePassXCTeam.KeePassXC', name: 'KeePassXC', shortName: 'KeePassXC',
    publisher: 'KeePassXC Team', group: 'security', icon: 'keepassxc', sizeMb: 40,
    recommended: false, match: ['KeePassXC'],
    description: 'Офлайн-менеджер паролів у локальному зашифрованому файлі.',
    tags: ['паролі', 'keepassxc', 'безпека', 'офлайн'],
  },
  {
    id: 'Proton.ProtonVPN', name: 'Proton VPN', shortName: 'Proton VPN', publisher: 'Proton',
    group: 'security', icon: 'protonvpn', sizeMb: 100, recommended: false, match: ['Proton VPN'],
    description: 'VPN із шифруванням і заявленою відсутністю логів.',
    tags: ['vpn', 'protonvpn', 'приватність', 'безпека'],
  },
  {
    id: 'MullvadVPN.MullvadVPN', name: 'Mullvad VPN', shortName: 'Mullvad',
    publisher: 'Mullvad VPN', group: 'security', icon: 'mullvad', sizeMb: 40, recommended: false,
    match: ['Mullvad VPN'],
    description: 'VPN без реєстрації та з анонімною оплатою.',
    tags: ['vpn', 'mullvad', 'приватність', 'безпека'],
  },
  {
    id: 'Malwarebytes.AdwCleaner', name: 'AdwCleaner', shortName: 'AdwCleaner',
    publisher: 'Malwarebytes', group: 'security', icon: 'adwcleaner', sizeMb: 10,
    recommended: false, match: ['AdwCleaner'],
    description: 'Видалення adware, панелей браузера та небажаних програм.',
    tags: ['adware', 'очищення', 'adwcleaner', 'безпека'],
  },
  {
    id: 'Insecure.Nmap', name: 'Nmap', shortName: 'Nmap', publisher: 'Nmap Project',
    group: 'security', icon: 'nmap', sizeMb: 30, recommended: false, match: ['Nmap'],
    description: 'Сканування мережі, портів і служб.',
    tags: ['мережа', 'сканування', 'nmap', 'порти'],
  },
  {
    id: 'Microsoft.Sysinternals.Suite', name: 'Sysinternals Suite', shortName: 'Sysinternals',
    publisher: 'Microsoft', group: 'security', icon: 'windows', sizeMb: 60, recommended: false,
    match: ['Sysinternals Suite'],
    description: 'Набір утиліт Microsoft для діагностики Windows.',
    tags: ['sysinternals', 'діагностика', 'windows', 'утиліти'],
  },

  {
    id: 'Codeium.Windsurf', name: 'Windsurf', shortName: 'Windsurf', publisher: 'Codeium',
    group: 'ai', icon: 'windsurf', sizeMb: 400, recommended: false, match: ['Windsurf'],
    description: 'Редактор коду з агентом Cascade для великих проєктів.',
    tags: ['ші', 'агент', 'редактор', 'windsurf', 'код'],
  },

  {
    id: 'Nvidia.PhysX', name: 'NVIDIA PhysX', shortName: 'PhysX', publisher: 'NVIDIA',
    group: 'system', icon: 'nvidia', sizeMb: 90, recommended: false,
    match: ['NVIDIA PhysX System Software', 'NVIDIA PhysX'],
    description: 'Фізичний рушій для старіших ігор, що його потребують.',
    tags: ['nvidia', 'physx', 'фізика', 'ігри', 'сумісність'],
  },
  {
    id: 'CreativeTechnology.OpenAL', name: 'OpenAL', shortName: 'OpenAL',
    publisher: 'Creative Technology', group: 'system', icon: 'openal', sizeMb: 2,
    recommended: false, match: ['OpenAL'],
    description: 'Аудіобібліотека для старіших ігор і програм.',
    tags: ['openal', 'аудіо', 'бібліотеки', 'сумісність'],
  },
  {
    id: 'Microsoft.XNARedist', name: 'Microsoft XNA Framework', shortName: 'XNA',
    publisher: 'Microsoft', group: 'system', icon: 'xna', sizeMb: 6, recommended: false,
    match: ['Microsoft XNA Framework Redistributable Refresh', 'Microsoft XNA Framework'],
    description: 'Бібліотеки XNA для ігор, що їх потребують.',
    tags: ['xna', 'runtime', 'бібліотеки', 'ігри', 'сумісність'],
  },
]

function wingetShow(id) {
  try {
    return execFileSync(
      'cmd.exe',
      ['/c', `chcp 65001>nul && winget show --id ${id} --exact --source winget --accept-source-agreements --disable-interactivity`],
      {encoding: 'utf8', windowsHide: true, maxBuffer: 1 << 26, timeout: 60000},
    )
  } catch {
    return ''
  }
}

function tidy(value) {
  const clean = value.replace(/\s+/g, ' ').trim()
  if (clean.length <= 300) return clean
  const cut = clean.slice(0, 297)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 180 ? cut.slice(0, lastSpace) : cut) + '…'
}

function manifestInfo(output) {
  const single = (label) => {
    const m = output.match(new RegExp(`^${label}:\\s*(.+)$`, 'm'))
    return m ? m[1].replace(/\r/g, '').trim() : ''
  }
  const block = output.match(/\r?\n(?:Short Description|Description):\r?\n((?:[ \t]+[^\r\n]*\r?\n)+)/)
  const description = single('Short Description') || (block ? block[1] : '')
  return {
    descriptionEn: tidy(description),
    homepage: single('Homepage') || single('Publisher Url'),
  }
}

const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'))

const existing = new Set(catalog.items.map((item) => item.id))

if (!catalog.groups.some((group) => group.id === cliGroup.id)) {
  for (const group of catalog.groups) {
    if (group.index >= cliGroup.index) group.index += 1
  }
  catalog.groups.push(cliGroup)
} else {
  for (const group of catalog.groups) {
    if (group.id === cliGroup.id) Object.assign(group, cliGroup)
  }
}
catalog.groups.sort((a, b) => a.index - b.index)

const added = []
const skipped = []
const rejected = []

for (const entry of entries) {
  if (existing.has(entry.id)) {
    skipped.push(entry.id)
    continue
  }

  const output = wingetShow(entry.id)
  if (!output || /No package found|No installed package/i.test(output)) {
    rejected.push(entry.id)
    continue
  }

  const info = manifestInfo(output)
  const item = {
    id: entry.id,
    name: entry.name,
    shortName: entry.shortName,
    publisher: entry.publisher,
    description: entry.description,
    group: entry.group,
    icon: entry.icon,
    tags: entry.tags,
    sizeMb: entry.sizeMb,
    recommended: entry.recommended,
    match: entry.match,
    descriptionEn: entry.descriptionEn || info.descriptionEn,
    homepage: entry.homepage || info.homepage,
  }
  catalog.items.push(item)
  added.push(entry.id)
}

const development = catalog.presets.find((preset) => preset.id === 'development')
if (development) {
  for (const id of ['SST.opencode', 'BurntSushi.ripgrep.MSVC', 'GitHub.cli']) {
    if (added.includes(id) && !development.items.includes(id)) {
      development.items.splice(development.items.indexOf('Microsoft.VCRedist.2015+.x64'), 0, id)
    }
  }
}

catalog.updated = new Date().toISOString().slice(0, 10)

writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8')

console.log(`Додано: ${added.length}`)
console.log(`Пропущено (уже в каталозі): ${skipped.length}${skipped.length ? ' — ' + skipped.join(', ') : ''}`)
console.log(`Відкинуто (немає в winget): ${rejected.length}${rejected.length ? ' — ' + rejected.join(', ') : ''}`)
console.log(`Всього позицій: ${catalog.items.length}, груп: ${catalog.groups.length}, пресетів: ${catalog.presets.length}`)
console.log(`Додано ID: ${added.join(', ')}`)

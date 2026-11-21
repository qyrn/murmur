#!/bin/sh
set -eu

APPIMAGE_URL="https://github.com/qyrn/murmur/releases/latest/download/murmur-x86_64.AppImage"
ICON_URL="https://murmur.qyrn.dev/icon.png"
KDOTOOL_URL="https://github.com/jinliu/kdotool/releases/download/v0.3.0/kdotool-0.3.0-x86_64-unknown-linux-gnu.tar.gz"
KDOTOOL_SHA256="2079cc1d492b6e83e04def4d9376e34fcb36a4e3bdc637c8c2ee6fa547ce90ff"
APP_PATH="$HOME/Applications/murmur-x86_64.AppImage"
DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
UINPUT_RULE="/etc/udev/rules.d/70-murmur-uinput.rules"

case "${LANG:-}" in
  fr*) french=true ;;
  *) french=false ;;
esac

say() {
  if $french; then printf '%s\n' "$1"; else printf '%s\n' "$2"; fi
}

fail() {
  say "$1" "$2" >&2
  exit 1
}

check_system() {
  [ "$(uname -m)" = x86_64 ] || fail "murmur tourne seulement sur les PC x86_64." "murmur only runs on x86_64 PCs."
  [ "$(id -u)" -ne 0 ] || fail "Lance la commande sans sudo, elle te demandera ton mot de passe quand il faut." "Run the command without sudo, it asks for your password when needed."
  command -v sudo >/dev/null || fail "sudo est introuvable, impossible d'installer les outils." "sudo is missing, can't install the tools."
  command -v nvidia-smi >/dev/null || say "Attention : aucun pilote NVIDIA trouvé, la transcription a besoin d'une carte NVIDIA." "Warning: no NVIDIA driver found, transcription needs an NVIDIA card."
  case "${XDG_CURRENT_DESKTOP:-}" in
    *KDE*) ;;
    *) say "Attention : murmur est fait pour KDE Plasma 6, ailleurs certaines choses marcheront pas." "Warning: murmur is made for KDE Plasma 6, some things won't work elsewhere." ;;
  esac
}

install_packages() {
  if command -v wl-copy >/dev/null && command -v ydotool >/dev/null && command -v ffmpeg >/dev/null; then
    return
  fi
  say "Installation de wl-clipboard, ydotool et ffmpeg…" "Installing wl-clipboard, ydotool and ffmpeg…"
  if command -v pacman >/dev/null; then
    sudo pacman -S --needed --noconfirm wl-clipboard ydotool ffmpeg
  elif command -v dnf >/dev/null; then
    sudo dnf install -y wl-clipboard ydotool ffmpeg-free
  elif command -v apt-get >/dev/null; then
    sudo apt-get install -y wl-clipboard ydotool ffmpeg
  else
    fail "Installe wl-clipboard, ydotool et ffmpeg avec ton gestionnaire de paquets, puis relance la commande." "Install wl-clipboard, ydotool and ffmpeg with your package manager, then run the command again."
  fi
}

install_kdotool() {
  if command -v kdotool >/dev/null; then
    return
  fi
  say "Installation de kdotool…" "Installing kdotool…"
  workdir="$(mktemp -d)"
  curl -fsSL -o "$workdir/kdotool.tar.gz" "$KDOTOOL_URL"
  printf '%s  %s\n' "$KDOTOOL_SHA256" "$workdir/kdotool.tar.gz" | sha256sum -c --quiet - \
    || fail "Le téléchargement de kdotool est corrompu, réessaie." "The kdotool download is corrupted, try again."
  tar -xzf "$workdir/kdotool.tar.gz" -C "$workdir" kdotool
  sudo install -m 755 "$workdir/kdotool" /usr/local/bin/kdotool
  rm -rf "$workdir"
}

allow_keyboard_input() {
  if [ ! -e /dev/uinput ]; then
    printf 'uinput\n' | sudo tee /etc/modules-load.d/murmur-uinput.conf >/dev/null
    sudo modprobe uinput
  fi
  if [ ! -w /dev/uinput ]; then
    printf 'KERNEL=="uinput", TAG+="uaccess"\n' | sudo tee "$UINPUT_RULE" >/dev/null
    sudo udevadm control --reload-rules
    sudo udevadm trigger --subsystem-match=misc --sysname-match=uinput
    sudo udevadm settle
  fi
  if systemctl --user cat ydotool.service >/dev/null 2>&1; then
    systemctl --user enable ydotool.service >/dev/null 2>&1
    systemctl --user restart ydotool.service
  else
    say "Attention : pense à lancer ydotoold au démarrage, sinon murmur pourra pas coller le texte." "Warning: make sure ydotoold runs at login, otherwise murmur can't paste the text."
  fi
}

install_app() {
  say "Téléchargement de murmur…" "Downloading murmur…"
  mkdir -p "$(dirname "$APP_PATH")"
  curl -fL --progress-bar -o "$APP_PATH.part" "$APPIMAGE_URL"
  chmod +x "$APP_PATH.part"
  mv -f "$APP_PATH.part" "$APP_PATH"

  mkdir -p "$DATA_HOME/icons/hicolor/512x512/apps" "$DATA_HOME/applications"
  curl -fsSL -o "$DATA_HOME/icons/hicolor/512x512/apps/murmur.png" "$ICON_URL"
  cat >"$DATA_HOME/applications/murmur.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=murmur
Comment=Dictée vocale privée et locale
Exec="$APP_PATH"
Icon=murmur
Terminal=false
Categories=Utility;
EOF
}

launch_app() {
  if pgrep -f "$APP_PATH" >/dev/null 2>&1; then
    say "C'est installé ! murmur tourne déjà, relance-le pour passer sur cette version." "Installed! murmur is already running, restart it to switch to this version."
    return
  fi
  setsid "$APP_PATH" >/dev/null 2>&1 </dev/null &
  say "C'est installé ! murmur se lance dans ta barre système, appuie sur Ctrl+Espace et parle." "Installed! murmur is starting in your system tray, press Ctrl+Space and talk."
}

main() {
  check_system
  install_packages
  install_kdotool
  allow_keyboard_input
  install_app
  launch_app
}

main

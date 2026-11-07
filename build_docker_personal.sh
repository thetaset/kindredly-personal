#!/usr/bin/env bash
# Build the Kindredly Personal images.
#
# The download files the box serves (the Chrome, Firefox and webapp zips) are over
# GitHub's 100 MB file limit, so git does not carry them. They are on the GitHub
# Release named in kindredly-server-personal/data/downloads/RELEASE; this fetches
# any that are missing or changed, checks each against SHA256SUMS, then builds.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

DOWNLOADS=kindredly-server-personal/data/downloads
RELEASES_URL="${KINDREDLY_PERSONAL_RELEASES:-https://github.com/thetaset/kindredly-personal/releases/download}"

sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1
  else shasum -a 256 "$1" | cut -d' ' -f1; fi
}

if [[ -f "$DOWNLOADS/RELEASE" && -f "$DOWNLOADS/SHA256SUMS" ]]; then
  tag="$(tr -d '[:space:]' < "$DOWNLOADS/RELEASE")"
  while read -r sum name; do
    [[ -n "$name" ]] || continue
    if [[ -f "$DOWNLOADS/$name" && "$(sha256_of "$DOWNLOADS/$name")" == "$sum" ]]; then
      continue
    fi
    echo "==> fetching $name ($tag)"
    curl -fL --retry 3 --progress-bar -o "$DOWNLOADS/$name.part" "$RELEASES_URL/$tag/$name"
    if [[ "$(sha256_of "$DOWNLOADS/$name.part")" != "$sum" ]]; then
      rm -f "$DOWNLOADS/$name.part"
      echo "$name from $tag does not match SHA256SUMS — not using it" >&2
      exit 1
    fi
    mv "$DOWNLOADS/$name.part" "$DOWNLOADS/$name"
  done < "$DOWNLOADS/SHA256SUMS"
fi

docker-compose -f docker-compose-personal.yml build

#!/usr/bin/env bash

set -e

npm run build
sudo pacman -U release/what-the-fork-*.pkg.tar.zst

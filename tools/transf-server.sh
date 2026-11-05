#!/bin/sh
# The transfer bridge: serves ~/transf so the Windows VM downloads the .exe.
cd "$HOME/transf" && exec python3 -m http.server 8000 --bind 0.0.0.0

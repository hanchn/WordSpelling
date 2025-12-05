tell application "Terminal"
    do script "cd \"$(dirname \"$(quoted form of POSIX path of (path to me))\")\" && ./start.sh"
    activate
end tell
tell application "Terminal"
    do script "cd \"$(dirname \"$(quoted form of POSIX path of (path to me))\")\" && ./stop.sh"
    activate
end tell
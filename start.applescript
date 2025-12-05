set appPath to POSIX path of (path to me)
set appDir to do shell script "dirname " & quoted form of appPath
tell application "Terminal"
    do script "cd " & quoted form of appDir & " && ./start.sh"
    activate
end tell
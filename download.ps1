# Save the current directory
Push-Location
try {
    # Execute within the directory of the script
    Set-Location -Path $PSScriptRoot

    # Create the logs directory
    $LogPath = ".\logs"
    if (-not (Test-Path $LogPath)) {
        New-Item -Path $LogPath -ItemType Directory
    }

    # Check if yt-dlp is installed
    $ytDlpPath = Get-Command "yt-dlp" -ErrorAction SilentlyContinue
    if ($null -eq $ytDlpPath) {
        Write-Host "yt-dlp must be installed to download videos"
        Read-Host -Prompt "Press Enter to exit"
        exit 1
    }

    # Get the log file name
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $logfile = ".\logs\log_$timestamp.txt"

    # Run yt-dlp and log the output
    Start-Transcript -Path $logfile
    yt-dlp --config-locations config.txt -a urls.txt
    Stop-Transcript

    # Check if Node.js is installed
    $nodePath = Get-Command "node" -ErrorAction SilentlyContinue
    if ($null -eq $nodePath) {
        Write-Host "Install Node.js >=20 to generate play.html and hash files"
        Read-Host -Prompt "Press Enter to exit"
        exit 1
    }

    # Check if Node.js version is sufficient
    $nodeVersion = & node -v
    $majorVersion = $nodeVersion.TrimStart('v').Split('.')[0]
    if ([int]$majorVersion -ge 20) {
        & node generate.js
        & node hash.js
    } else {
        Write-Host "Install Node.js >=20 to generate play.html and hash files"
    }

    Read-Host -Prompt "Press Enter to exit"
}
finally {
    # Restore the original directory
    Pop-Location
}
# Prerequisites
Need to be installed and added to PATH:
- [yt-dlp](https://github.com/yt-dlp/yt-dlp)
- [FFmpeg](https://ffmpeg.org/)
- [Node.js](https://nodejs.org/en) >=20

# Usage
- Clone this repository
- Inside the repository folder create a file named urls.txt and add URLs
- Run either download.ps1 or download.sh
- After downloads finish videos can be watched from play.html

# Benefits
- Provides a simple GUI for watching videos
- No need to configure and run a web server
- Portable

# Limitations
- Not all videos can be played in the browser due to varying codec support (to work around this have your browser open media in VLC)
- Search becomes slow with massive amounts of videos
- Search only uses video title, uploader, and platform
- Playlists are not searchable
const fs = require('fs');
const path = require('path');

// Get all of the individual video directories in ./downloads
const dirs = fs.readdirSync('./downloads', { withFileTypes: true, recursive: true }) // { ...recursive: true } requires Node 20 or later
    .filter(dirent => dirent.isDirectory() && dirent.parentPath !== './downloads'); // Top level parentPath is ./downloads on both Windows and Linux, Windows only uses \\ for paths with children

// Create a list of all video metadata
const info = [];
for (const dir of dirs) {
    // Get all files in the video directory
    const files = fs.readdirSync(path.join(dir.parentPath, dir.name), { withFileTypes: true });
    
    // Find the video file (or audio file)
    const videoDirent = files.find(file => ['.webm', '.mp4', '.mkv', '.mov', '.avi', '.flv', '.mpeg', '.opus', '.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a', '.midi'].includes(path.extname(file.name)));
    if (!videoDirent) continue;
    const videoFilePath = path.join(videoDirent.parentPath, videoDirent.name);

    // Get the video metadata from the file name
    const parts = videoDirent.name.slice(0, -path.extname(videoDirent.name).length).split(' - ');
    let date = parseDate(parts.pop());
    let uploader = parts.pop();
    let title = parts.join(' - ');
    let duration = null;
    const platform = path.basename(dir.parentPath);

    // Get the video metadata from the .info.json file
    const infoJsonDirent = files.find(file => file.name.endsWith('.info.json'));
    if (infoJsonDirent) {
        try {
            const infoJsonFilePath = path.join(infoJsonDirent.parentPath, infoJsonDirent.name);
            const metadata = JSON.parse(fs.readFileSync(infoJsonFilePath));
            if (typeof metadata?.upload_date === 'string') date = parseDate(metadata.upload_date) || date;
            if (typeof metadata?.uploader === 'string') uploader = metadata.uploader || uploader;
            if (typeof metadata?.title === 'string') title = metadata.title || title;
            if (typeof metadata?.duration_string === 'string') duration = metadata.duration_string || duration;
        } catch (err) {
            console.error(`Failed to parse "${infoJsonFilePath}", falling back to file name metadata`);
        }
    }
    
    // Find the thumbnail file
    const thumbnailDirent = files.find(file => ['.jpg', '.webp', '.png', '.bmp', '.gif'].includes(path.extname(file.name)));
    const thumbnailFilePath = thumbnailDirent ? encodeUrl(path.join(thumbnailDirent.parentPath, thumbnailDirent.name)) : null;

    info.push({
        date,
        uploader,
        title,
        platform,
        duration,
        videoFilePath: encodeUrl(videoFilePath),
        thumbnailFilePath,
    });
}
info.sort((a, b) => b.date - a.date);

function parseDate(dateString) {
    try {
        if (dateString.length !== 8) throw new Error('Unexpected length');
        return new Date(parseInt(dateString.substring(0, 4), 10), parseInt(dateString.substring(4, 6), 10), parseInt(dateString.substring(6, 8), 10)).getTime();
    } catch (err) {
        return 0;
    }
}

function encodeUrl(url) {
    return url.split(path.sep).map(component => encodeURIComponent(component)).join(path.sep);
}

// Generate play.html
const html = `
<!DOCTYPE html>
<html>
    <head>
    <style>
        body * {
            box-sizing: border-box;
        }    
    
        body {
            background: #000;
            color: #fff;
            font-family: system-ui,-apple-system,Segoe UI,Roboto,Helvetica Neue,Noto Sans,Liberation Sans,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;
            margin: 0;
        }

        .container {
            width: 100%;
            margin: 0 auto;
            padding: 1rem;
        }

        #search {
            margin: 0 auto;
            width: 100%;
            max-width: 300px;
            display: block;
            background: #333;
            border: 0;
            padding: 0.75rem 1rem;
            border-radius: 9999px;
            color: #fff;
        }

        #video-container {
            display: flex;
            flex-wrap: wrap;
            padding: 0;
        }

        .video {
            width: 100%;
            padding: 1rem;
        }

        .thumbnail-wrapper {
            position: relative;
            display: block;
        }

        .thumbnail {
            width: 100%;
            aspect-ratio: 16/9;
            object-fit: cover;
            border-radius: 0.25rem;
            display: block;
            margin-bottom: 0.25rem;
        }

        .thumbnail.missing {
            background-image: url('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/4QBoRXhpZgAATU0AKgAAAAgABAEaAAUAAAABAAAAPgEbAAUAAAABAAAARgEoAAMAAAABAAIAAAExAAIAAAARAAAATgAAAAAAAABgAAAAAQAAAGAAAAABcGFpbnQubmV0IDQuMi4xMwAA/9sAQwACAQEBAQECAQEBAgICAgIEAwICAgIFBAQDBAYFBgYGBQYGBgcJCAYHCQcGBggLCAkKCgoKCgYICwwLCgwJCgoK/9sAQwECAgICAgIFAwMFCgcGBwoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoK/8AAEQgBlQLQAwEhAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A/TSigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACo7q7tbKBrm9uY4Y1+9JK4VR+JoAw7j4sfCyzk8q7+JXh+Jv7smswKf1ao/wDhcfwi/wCip+G//B5b/wDxdAB/wuP4Rf8ARU/Df/g8t/8A4uj/AIXH8Iv+ip+G/wDweW//AMXQAf8AC4/hF/0VPw3/AODy3/8Ai6P+Fx/CL/oqfhv/AMHlv/8AF0AH/C4/hF/0VPw3/wCDy3/+Lo/4XH8Iv+ip+G//AAeW/wD8XQAf8Lj+EX/RU/Df/g8t/wD4uj/hcfwi/wCip+G//B5b/wDxdAB/wuP4Rf8ARU/Df/g8t/8A4uj/AIXH8Iv+ip+G/wDweW//AMXQAf8AC4/hF/0VPw3/AODy3/8Ai6kt/ix8LLyTyrT4leH5W/ux6zAx/RqANy1u7W9gW5srmOaNvuyROGU/iKkoAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigArN8WeL/DfgfRJvEXivV4bKzh+9LM3U9lUdWY9gASaAPm34pftu+J9Ymk0v4YWK6Za5KjULqNXuJB6hTlY//Hj7jpXi/iDxZ4n8WXf27xP4gvNQmznzLy4aTH0yeB7CgDPooAKKACigAooAKKACigAooA0PD/izxP4Tu/t3hjxBeafNnPmWdw0efrg8j2Ne0fC39t3xPo80el/E+xXU7XIU6haxqlxGPUqMLJ/46fc9KAPpLwn4v8N+ONEh8ReFNXhvbOb7ssLdD3Vh1Vh3BAIrSoAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKAMnxv4z0H4feGLvxb4kuvKtbSPc2PvO3RUUd2J4A/pXxP8YPjF4o+MXiRtY1uZo7WJmGn6ejfu7dP6se7dT7AAAA5GigAooAKKACigAooAKKACigAooAKKAOt+EHxi8U/B7xIusaHOZLWVlGoae7fu7hP6MOzdR7gkH7Z8EeNNB+IPhi18W+G7rzbW7j3Ln7yN/EjDswPBH9KANaigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigD5K/bL+LE3i3xz/wgGmXP/Et0N9syqeJbrHzE/wC4DsHod3rXjFABRQAUUAFFABRQAUUAFFABRQAUUAFFABXs37GnxYm8I+Ov+EC1O6P9m64+2FWPEV1j5CP9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JJqAPtKigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAK84/a2/5N88Qf9un/AKVw0AfFVFABRQAUUAdF4F+K/wARPho8jeCPFVxYrMcywqqyRMcY3FHBXOO+M0eOvix8RfiU8beNvFdxfLHzHCQscSn1EaBVz74zQBztFAHReBfiv8RPho8jeCPFVxYrMcywqqyRMcY3FHBXOO+M0eOvix8RfiU8beNvFdxfLHzHCQscSn1EaBVz74zQBztFAHReBfiv8RPho8jeCPFVxYrMcywqqyRMcY3FHBXOO+M0eOvix8RfiU8beNvFdxfLHzHCQscSn1EaBVz74zQBztFABRQAAkdKcHB60AOooAKKACigAr0b9kz/AJOB8P8A/b1/6STUAfaVFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAV5x+1t/yb54g/wC3T/0rhoA+KqKACigAooAKKACigAooAKKACigAooAKKACigD6I+Gf7MPg74t/ATRfENvcSabrci3Ia+j+ZJttzKqiRCecAAZGD9cYryX4l/Bnx/wDCi9+z+K9GYW7Ntg1C3y8Ev0bHB/2WAPtQBytFABRQAV6N+yZ/ycD4f/7ev/SSagD7SooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACvOP2tv+TfPEH/bp/6Vw0AfFVFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQB9q/sk/8m+eH/8At7/9K5q9B1DTtP1eyk03VbGG5t5l2zQXEYdHX0IPBFAHg/xc/Yo0vU/N1v4U3a2c5yzaTdOTC/8AuPyUPscj3UV86+J/CfiTwXq0mh+KtFuLG6j+9DcJjI9QejD3BINAGfRQAV6N+yZ/ycD4f/7ev/SSagD7SooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACigAooAKKACuK/aL0eTXfgh4ksYl3MunGfH/XJhL/AOyU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QAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAFFABRQAUUAf/9k=');
            background-position: center center;
            background-size: cover;
        }

        .duration {
            background: rgba(0,0,0,0.6);
            bottom: 0.25rem;
            right: 0.25rem;
            pointer-events: none;
            position: absolute;
            padding: 0.05rem 0.25rem 0.15rem;
            line-height: 1;
            border-radius: 0.25rem;
            font-size: 0.85rem;
        }

        a {
            text-decoration: none;
            color: #fff;
        }

        a:hover {
            text-decoration: underline;
        }

        .title {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            overflow: hidden;
            text-overflow: ellipsis;
            word-break: break-word;
            -webkit-box-orient: vertical;
            margin-top: 0;
            margin-bottom: 0.25rem;
            font-weight: bold;
        }

        .uploader,
        .date {
            display: -webkit-box;
            -webkit-line-clamp: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            word-break: break-word;
            -webkit-box-orient: vertical;
            color: #777;
            margin: 0;
            font-size: 0.85rem;
        }

        .uploader a,
        .date a {
            color: #777;
        }

        @media screen and (min-width: 576px) {
            .container {
                max-width: 540px;
            }

            .video {
                width: calc(100% / 2);
            }
        }

        @media screen and (min-width: 768px) {
            .container {
                max-width: 720px;
            }

            .video {
                width: calc(100% / 3);
            }
        }

        @media screen and (min-width: 992px) {
            .container {
                max-width: 992px;
            }

            .video {
                width: calc(100% / 4);
            }
        }

        @media screen and (min-width: 1200px) {
            .container {
                max-width: 1140px;
            }

            .video {
                width: calc(100% / 5);
            }
        }

        @media screen and (min-width: 1400px) {
            .container {
                max-width: 1320px;
            }

            .video {
                width: calc(100% / 6);
            }
        }
    </style>
    </head>
    <body>
        <div class="container">
            <h1><span id="count">${info.length.toLocaleString()}</span> Video<span id="s">${info.length === 1 ? '' : 's'}</span></h1>
            <input id="search" type="text" placeholder="Search">
        </div>
        <div id="video-container" class="container">
        </div>
    </body>
    <script>
        const info = ${JSON.stringify(info)};
        const pageSize = 50;
        const searchElement = document.querySelector('#search');

        let page = 0;

        nextPage();

        function nextPage(clear = true) {
            let filteredInfo = [...info];

            let query = searchElement.value.toLowerCase();
            if (query) filteredInfo = filteredInfo.filter(video =>
                video.title.toLowerCase().includes(query)
                || ('uploader:' + video.uploader.toLowerCase()).includes(query)
                || ('platform:' + video.platform.toLowerCase()).includes(query)
            );

            document.querySelector('#count').textContent = filteredInfo.length.toLocaleString();
            document.querySelector('#s').textContent = filteredInfo.length === 1 ? '' : 's';

            const container = document.querySelector('#video-container');
            if (clear) {
                window.scrollTo(0, 0);
                container.innerHTML = '';
                page = 0;
            }
            for (let i = page * pageSize; i < Math.min((page + 1) * pageSize, filteredInfo.length); i++) {
                const html = \`
                <div class="video">
                    <a class="thumbnail-wrapper" href="\${filteredInfo[i].videoFilePath}" target="_blank">
                        \${
                            filteredInfo[i].thumbnailFilePath === null
                                ? '<div class="thumbnail missing"></div>'
                                : \`<img class="thumbnail" src="\${filteredInfo[i].thumbnailFilePath}" />\`
                        }
                        \${filteredInfo[i].duration ? \`<span class="duration">\${filteredInfo[i].duration}</span>\` : ''}
                    </a>
                    <a class="title" title="\${filteredInfo[i].title}" href="\${filteredInfo[i].videoFilePath}" target="_blank">\${filteredInfo[i].title}</a>
                    <p class="uploader" title="\${filteredInfo[i].uploader}"><a href="#" data-query="uploader:\${filteredInfo[i].uploader}">\${filteredInfo[i].uploader}</a></p>
                    <p class="date"><a href="#" data-query="platform:\${filteredInfo[i].platform}">\${filteredInfo[i].platform}</a> - \${new Date(filteredInfo[i].date).toLocaleDateString()}</p>
                </div>
                \`;
                container.insertAdjacentHTML('beforeend', html);
            }
            page++;
        }

        function search(query) {
            searchElement.value = query;
            nextPage();
        }

        window.addEventListener('scroll', function() {
            const scrollTop = window.scrollY || window.pageYOffset;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const threshold = 300;

            if (scrollTop + windowHeight >= documentHeight - threshold) nextPage(false);
        });

        searchElement.addEventListener('change', function(e) {
            nextPage();
        });

        document.body.addEventListener('click', function(e) {
            if (e.target?.hasAttribute('data-query')) {
                search(e.target.getAttribute('data-query'));
                e.preventDefault();
            }
        });
    </script>
</html>
`;

// Save play.html
fs.writeFileSync('./play.html', html);
console.log('Open play.html to watch downloaded videos');

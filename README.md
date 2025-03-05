# Kindredly Personal Edition

Kindredly Personal Edition is a free, open-source, and self-hosted version of our Kindredly server designed for individuals and families.

![Login](docs/media/login.png)

> **NOTE:** This is a **very** early release. It will have bugs and is difficult to install. Please stay tuned for updates and better documentation.

## Features
- Private space for individuals and families to store and share content
- Built-in parental control system to manage children's web access (requires browser extension or app)
- Share and give access to content in one action
- Add many types of content, including posts, images, links, notes, videos and files.
- End-to-end encryption for all content
- Many clients available (webapp, browser extensions, android, ios)

## Requirements
- docker (https://docs.docker.com/get-docker/)
- docker-compose (https://docs.docker.com/compose/)

## Installation 
1. Clone the repository
1. Run `./build_docker_personal.sh`
1. Run `./start_server_personal.sh` (this will fail, but will setup the database) - press ctrl+c to stop the server
1. Run `./start_server_personal.sh` again
1. Visit to http://localhost:4444 (press ctrl+c to stop the server)


## Browser Extensions Setup
- Install the browser extension from the Chrome Web Store (https://kindredly.ai/download)
- Visit the custom server settings link on the Sign-in page and give IP address and port of the server (http://localhost:4444/api/v2.3)



## Planned Features
 - One click installer
-  Native webview for Windows, Mac and Linux with server management options as well as local webapp access
 - Relay Server for remote access to your server without the need to open ports to your network.
 - Backup and restore features
 - Intergration with Kindredly Published Content
 - Android and IOS app support
 - AI Powered features

 ## Contributing
- We are looking for contributors to help us build this project. If you are interested in contributing, please contact us through github or through http://kindredly.ai/contactUs.
 

# MultiCam Live System

MultiCam Live is a professional, ultra-low latency system designed to transform smartphones (iPhones and Android devices) into high-quality wireless cameras for live broadcasting. Operating entirely over a local network (Wi-Fi), it eliminates the need for cables and capture cards, delivering video directly to broadcasting software such as OBS Studio.

## Architecture and Components

The system is structured into three main modules that operate harmoniously using embedded WebRTC (LiveKit) technology:

1. **Central Hub (Desktop Application):** A desktop application that acts as the core of the operation. It runs an internal background server, managing the connection between all mobile devices and the broadcasting software, ensuring complete offline functionality.
2. **Camera Application (Mobile Web App):** A streamlined interface for the smartphone. It transmits using Simulcast (high resolution for the broadcast, lower resolution for monitoring), supports native lens switching (e.g., Ultra Wide), and allows pinch-to-zoom. It functions in Full Screen mode on iOS via PWA (Progressive Web App).
3. **Monitoring Center:** A 2x2 grid interface within the Desktop Hub where the operator can monitor incoming signals, codecs, frame rates, and control zoom remotely.

## Installation and Execution Guide for End Users

The application is distributed as a standalone executable for both Windows and Linux. Below are the instructions to run the application in each operating system.

### Windows

1. **Download:** Obtain the latest `.exe` installer (e.g., `MultiCam-Desktop-Setup.exe`).
2. **Installation:** Double-click the installer and follow the standard installation prompts.
3. **Execution:** After installation, launch the "MultiCam Desktop" application from the Start Menu or desktop shortcut.
4. **Firewall Permissions:** Upon first execution, Windows Defender or your firewall may prompt for network access. You must allow access for both Private and Public networks to ensure the desktop application can communicate with smartphones on the local Wi-Fi.

### Linux

The application is distributed as an AppImage, a universal package format for Linux.

1. **Download:** Obtain the latest `.AppImage` file (e.g., `MultiCam-Desktop.AppImage`).
2. **Execution Permissions:** Before running the AppImage, you must grant it execution permissions.
   - **Via Graphical Interface:** Right-click the `.AppImage` file, select "Properties", navigate to the "Permissions" tab, and check the box that says "Allow executing file as program".
   - **Via Terminal:** Open a terminal in the folder where the file is located and run:
     `chmod +x MultiCam-Desktop.AppImage`
3. **Execution:** Double-click the file to open it, or run it via terminal:
   `./MultiCam-Desktop.AppImage`
4. **Note on Graphics Integration:** The application is optimized to run smoothly on modern Linux distributions (both Wayland and X11). If you encounter graphics issues, ensure your system is fully updated.

## Compiling from Source

For developers who wish to compile the application from source code.

### Prerequisites
- **Node.js** (Version 18 or higher recommended) and **npm**
- **Git**
- **Base Build Tools** (On Ubuntu/Mint/Debian: `sudo apt update && sudo apt install build-essential curl`)

### Building for Linux

1. Clone the repository and install dependencies:
```bash
git clone https://github.com/kellviny/MulitCam.git
cd MulitCam
npm install
```

2. Compile and generate the installers (.AppImage and .deb):
```bash
cd desktop-app
npm run dist:linux
```
The final installers will be available in the `desktop-app/release/` directory.

### Building for Windows

To build for Windows, ensure you are on a Windows machine or using cross-compilation tools.
```bash
cd desktop-app
npm run dist
```
The `.exe` installer will be available in the `desktop-app/release/` directory.

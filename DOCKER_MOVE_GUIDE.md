# Moving Docker Desktop to D Drive

## Problem
Docker Desktop stores all data on C:\ProgramData\Docker and C:\Users\<username>\AppData\Local\Docker, which can fill up your C drive quickly.

## Solution: Move Docker Data to D Drive

### Step 1: Stop Docker
1. Right-click the Docker Desktop icon in system tray
2. Click "Quit Docker Desktop"
3. Wait for it to fully stop

### Step 2: Open Docker Settings
1. Open Docker Desktop
2. Click the Settings gear icon (⚙)
3. Go to "Resources" → "Advanced"
4. Look for "Disk image location"

### Step 3: Change Data Location
1. Click "Browse"
2. Navigate to: `D:\DockerData`
3. Click "Apply & Restart"

Docker will automatically move all data to D drive.

## Alternative: Manual WSL2 Move (If using WSL2 backend)

If Docker is using WSL2, you need to move the WSL distributions:

```powershell
# 1. Stop Docker and WSL
wsl --shutdown

# 2. Export docker-desktop
wsl --export docker-desktop "D:\wsl-backup\docker-desktop.tar"

# 3. Unregister from C drive
wsl --unregister docker-desktop

# 4. Import to D drive
wsl --import docker-desktop "D:\WSL\docker-desktop" "D:\wsl-backup\docker-desktop.tar" --version 2

# 5. Repeat for docker-desktop-data
wsl --export docker-desktop-data "D:\wsl-backup\docker-desktop-data.tar"
wsl --unregister docker-desktop-data
wsl --import docker-desktop-data "D:\WSL\docker-desktop-data" "D:\wsl-backup\docker-desktop-data.tar" --version 2

# 6. Start Docker Desktop
```

## Quick Cleanup (Before Presentation)

Run the provided cleanup script:
```powershell
cd d:\Z_final_pbl\mini-balancer
.\cleanup_docker.ps1
```

This will free up space by:
- Removing unused Docker images and containers
- Clearing temp files
- Emptying recycle bin

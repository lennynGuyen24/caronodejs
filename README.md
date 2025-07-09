# Online Tic-Tac-Toe Game (Node.js + Socket.io)

A project to build an online Tic-Tac-Toe game using Node.js and Socket.io.

---

## 🛠️ Tools Used:
- Node.js
- Socket.io
- HTML/CSS/JavaScript (Frontend)

## 🚀 Installation Guide

🔗 Step 1: Download and install Node.js
🔗 Go to the official website:
Visit https://nodejs.org
You will see two versions:
LTS (recommended): Stable version.
Current: Latest version, but not guaranteed to be stable.

### Installation:
Run the downloaded installer file (.msi for Windows).
After installation, open Terminal or CMD and type:
    node -v
    npm -v

---
### Create the folder structure:
    caro-game/
    ├── backend/
    │   ├── index.js
    │   ├── package.json
    │   └── package-lock.json
    └── frontend/
        ├── index.html
        ├── script.js
        └── style.css
### Role of package.json:
Manage basic project information. 
This file briefly describes the project and includes information like:
    -Project name (name)
    -Version (version)
    -Short description (description)
    -Author (author)
    -License (license)
Manages dependencies:
#### This file contains information about JavaScript libraries installed via npm. These libraries can be easily reinstalled when moving the project to a different environment.
        "dependencies": {
            "express": "^4.17.1",
            "socket.io": "^4.7.5",
            "cors": "^2.8.5"
        }

Manages scripts (shortcuts for common commands):
#### This file defines common commands in the project:
    "scripts": {
        "start": "node index.js",
        "dev": "nodemon index.js"
    }

Manages exact versions of libraries (package-lock.json)
The package.json works alongside package-lock.json to keep track of the precise version of each library to avoid errors when migrating the project to different environments.

#### Common commands with package.json:
    Commands	                    Meaning
    npm init -y	                    Initialize a default package.json file.
    npm install <library>           Install a library and save it to dependencies.
    npm install	                    Install all libraries listed in dependencies.
    npm uninstall <library>  	    Remove a library from dependencies.

Open Terminal inside VS Code (Ctrl + ~ or Terminal → New Terminal):
    cd backend
    node index.js

Access via URL:    
    http://localhost:3000/index.html

### 1.  Error fix
#### Error: 
      npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system. 
This error occurs because PowerShell has a security policy that prevents external scripts from running (Execution Policy).
#### Fix:
      Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

### 2. Clone the project from GitHub
####
    git clone https://github.com/klakamas/caronodejs.git
    cd backend
    npm init -y
    npm install express socket.io
    node index.js

# How to Install Redis on Windows

Since you are using Windows, you have two main options to install Redis locally.

## Option 1: Memurai (Easiest & Recommended for Windows)
**Memurai** is a fully compatible Redis alternative designed specifically for Windows. It is the easiest way to get "Redis" running on your laptop without complex setup.

1.  **Download:** Go to [https://www.memurai.com/get-memurai](https://www.memurai.com/get-memurai) and download the **Developer Edition** (it's free).
2.  **Install:** Run the `.msi` installer you downloaded.
3.  **Verify:** Open a new terminal (Command Prompt or PowerShell) and type:
    ```powershell
    redis-cli ping
    ```
    If it replies `PONG`, it is working!

## Option 2: Redis via WSL2 (Official Method)
If you have **WSL (Windows Subsystem for Linux)** installed, you can install the official Redis.

1.  Open your Ubuntu/WSL terminal.
2.  Run:
    ```bash
    sudo apt-get update
    sudo apt-get install redis-server
    sudo service redis-server start
    ```

---

## How to Enable Redis in This Project
Once you have installed Redis (or Memurai) and it is running:

1.  Open your `.env` file.
2.  Add or change this line:
    ```ini
    USE_REDIS=true
    ```
3.  Restart your server:
    ```bash
    npm run dev
    ```

Your application will now automatically connect to your local Redis server!

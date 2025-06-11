---

### **Phase 1: AWS EC2 Instance Setup**

1.  **Launch an EC2 Instance:**
    * Log in to your AWS Management Console.
    * Navigate to the **EC2 dashboard**.
    * Click "Launch Instances".
    * **Step 1: Choose an Amazon Machine Image (AMI):** Select **Ubuntu Server 22.04 LTS (HVM), SSD Volume Type**.
    * **Step 2: Choose an Instance Type:** `t2.micro` (free tier eligible) for testing, `t2.small` or `t2.medium` for production.
    * **Step 3-6:** Leave defaults unless you have specific requirements.
    * **Step 7: Configure Security Group:**
        * Create a **new security group** or select an existing one.
        * Add the following Inbound Rules:
            * **SSH:** Type: `SSH` (Port 22), Source: `My IP` (Highly recommended for security).
            * **HTTP:** Type: `HTTP` (Port 80), Source: `Anywhere-IPv4` (`0.0.0.0/0`).
            * **HTTPS:** Type: `HTTPS` (Port 443), Source: `Anywhere-IPv4` (`0.0.0.0/0`) (for future SSL).
            * *(Optional for debugging, not strictly necessary for final deployment)* Custom TCP `3000` (Node.js) and `5000` (Flask): Source `Custom` and select the security group itself.
    * **Review and Launch:** Click "Review and Launch," then "Launch."
    * **Create a New Key Pair:** Download and **save your `.pem` file securely** (e.g., `my-app-key.pem`). You'll need it to connect.

2.  **Connect to Your EC2 Instance via SSH:**
    * Once your instance state shows `running` in the EC2 dashboard, find its **Public IPv4 address** (e.g., `3.92.229.46`).
    * **On your local machine's terminal:**
        * Navigate to the directory where you saved your `.pem` key.
        * Set correct permissions:
            ```bash
            chmod 400 my-app-key.pem
            ```
        * Connect (replace `your-instance-public-ip` with your EC2's actual IP):
            ```bash
            ssh -i my-app-key.pem ubuntu@your-instance-public-ip
            ```
        * You should now be logged into your Ubuntu EC2 instance.

---

### **Phase 2: Install Essential Tools on EC2**

Once connected via SSH, run these commands:

1.  **Update System Packages:**
    ```bash
    sudo apt update -y
    sudo apt upgrade -y
    ```

2.  **Install Git:**
    ```bash
    sudo apt install git -y
    ```

3.  **Install Python3 and pip (for Flask Backend):**
    ```bash
    sudo apt install python3 python3-pip -y
    ```

4.  **Install Node.js and npm (for Frontend) using NVM (Node Version Manager):**
    ```bash
    curl -o- [https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh](https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh) | bash
    source ~/.bashrc # Important: Re-source to make nvm available immediately
    nvm install --lts  # Installs the latest LTS version of Node.js
    nvm use --lts      # Uses the installed LTS version
    ```
    Verify installation: `node -v` and `npm -v`

5.  **Install Nginx (Reverse Proxy):**
    ```bash
    sudo apt install nginx -y
    ```

6.  **Install Certbot (for future HTTPS setup):**
    ```bash
    sudo apt install certbot python3-certbot-nginx -y
    ```

---

### **Phase 3: Deploy Your Project Code**

1.  **Navigate to your home directory:**
    ```bash
    cd /home/ubuntu
    ```

2.  **Clone Your Repository:**
    Replace `<your-repository-url>` with your actual Git repository URL.
    ```bash
    git clone <your-repository-url>
    ```
    This will create the `sample-express-flask-app/` directory.

---

### **Phase 4: Deploy the Backend (Flask with Gunicorn)**

1.  **Navigate to your backend directory:**
    ```bash
    cd /home/ubuntu/sample-express-flask-app/backend
    ```

2.  **Create and Activate a Python Virtual Environment:**
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```
    (Your terminal prompt will change to `(venv) ubuntu@...`.)

3.  **Install Python Dependencies:**
    ```bash
    pip install -r requirements.txt
    pip install gunicorn # Install Gunicorn for production
    ```

4.  **Create a Systemd Service for Flask:**
    This ensures your Flask app runs continuously and automatically restarts.

    Open a new service file:
    ```bash
    sudo nano /etc/systemd/system/flask_backend.service
    ```
    Paste the following content. **Remember to set your actual MongoDB Atlas URI!**

    ```
    [Unit]
    Description=Gunicorn instance to serve Flask backend
    After=network.target

    [Service]
    User=ubuntu
    Group=www-data
    WorkingDirectory=/home/ubuntu/sample-express-flask-app/backend
    Environment="PATH=/home/ubuntu/sample-express-flask-app/backend/venv/bin"
    # IMPORTANT: Replace <your_mongodb_atlas_connection_string> with your actual MongoDB Atlas URI.
    # Example: "mongodb+srv://user:pass@cluster.mongodb.net/mydb?retryWrites=true&w=majority"
    Environment="ATLAS_URI=<your_mongodb_atlas_connection_string>"
    ExecStart=/home/ubuntu/sample-express-flask-app/backend/venv/bin/gunicorn --workers 3 --bind unix:/home/ubuntu/sample-express-flask-app/backend/flask_backend.sock -m 007 app:app
    Restart=always

    [Install]
    WantedBy=multi-user.target
    ```
    Save and exit nano (`Ctrl+S`, then `Ctrl+X`).

5.  **Enable and Start the Flask Backend Service:**
    ```bash
    sudo systemctl daemon-reload # Reload systemd
    sudo systemctl start flask_backend
    sudo systemctl enable flask_backend # Ensure it starts on boot
    sudo systemctl status flask_backend # Check status (should be 'active (running)')
    ```

---

### **Phase 5: Deploy the Frontend (Node.js with PM2)**

1.  **Navigate to your frontend directory:**
    ```bash
    cd /home/ubuntu/sample-express-flask-app/frontend
    ```

2.  **Install Node.js Dependencies:**
    ```bash
    npm install
    ```

3.  **Install PM2 Globally:**
    ```bash
    npm install pm2 -g # IMPORTANT: NO 'sudo' here. NVM handles permissions.
    ```

4.  **CRUCIAL MODIFICATION: Update `frontend/index.js` for Backend Communication:**
    This step is vital for your Node.js server to talk to your Flask backend via Nginx.

    Open `index.js` for editing:
    ```bash
    nano index.js
    ```
    Find the line that looks like this (it might still say `http://backend:5000/submit` or `/api/submit` from previous attempts):
    ```javascript
    const resp = await fetch('http://backend:5000/submit', {
    ```
    **CHANGE IT TO THIS EXACT LINE:**
    ```javascript
    const resp = await fetch('http://localhost/api/submit', { // This is the final correct URL
    ```
    Save and exit nano (`Ctrl+S`, then `Ctrl+X`).

5.  **Start Node.js Application with PM2:**
    ```bash
    pm2 start index.js --name "node_frontend" # Start your Node.js app
    pm2 save # Saves the process list for PM2
    pm2 startup systemd # Generates systemd script for PM2
    ```
    **IMPORTANT:** The `pm2 startup systemd` command will output a specific `sudo` command (e.g., `sudo env PATH=$PATH:/home/ubuntu/.nvm/versions/node/vX.Y.Z/bin ...`). **You MUST copy and paste that ENTIRE output line** (which includes your exact Node.js version) into your terminal and press Enter. This configures PM2 to start automatically on reboot.

6.  **Verify PM2 Status:**
    ```bash
    pm2 status
    ```
    You should see `node_frontend` listed as `online`.

---

### **Phase 6: Configure Nginx as a Reverse Proxy**

Nginx will serve your Node.js frontend and route API requests (`/api/`) to your Flask backend.

1.  **Remove the default Nginx configuration:**
    ```bash
    sudo rm /etc/nginx/sites-enabled/default
    ```

2.  **Create a new Nginx configuration file:**
    ```bash
    sudo nano /etc/nginx/sites-available/my_fullstack_app
    ```
    Paste the following content. Replace `your_ec2_public_ip_or_domain` with your EC2 instance's Public IPv4 DNS (e.g., `ec2-xx-xx-xx-xx.compute-1.amazonaws.com`) or your actual domain name.

    ```nginx
    server {
        listen 80;
        server_name your_ec2_public_ip_or_domain;

        # Frontend (Node.js/Express)
        location / {
            proxy_pass http://localhost:3000; # Node.js app listens on port 3000
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_redirect default;
        }

        # Backend (Flask via Gunicorn)
        # This route handles the http://localhost/api/submit request from your Node.js frontend
        location /api/ {
            # Rewrite the URL: /api/submit becomes /submit when passed to Flask
            rewrite ^/api/(.*)$ /$1 break;
            proxy_pass http://unix:/home/ubuntu/sample-express-flask-app/backend/flask_backend.sock; # Path to Gunicorn Unix socket
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
    ```
    Save and exit nano (`Ctrl+S`, then `Ctrl+X`).

3.  **Enable the Nginx configuration:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/my_fullstack_app /etc/nginx/sites-enabled/
    ```

4.  **Test Nginx configuration and Restart:**
    ```bash
    sudo nginx -t # Should output "syntax is ok" and "test is successful"
    sudo systemctl restart nginx
    sudo systemctl enable nginx # Ensures Nginx starts on system boot
    ```

---

### **Phase 7: Address Permissions for Nginx to Flask Backend (Troubleshooting Fix)**

This step resolves the "Permission denied" error when Nginx tried to access the Gunicorn Unix socket.

1.  **Grant Execute Permissions to Parent Directories:**
    This ensures Nginx (running as `www-data`) can traverse to your socket file.

    ```bash
    # Grant execute permissions to 'others' for your home directory
    chmod o+x /home/ubuntu/

    # Grant execute permissions to 'others' for your main project directory
    chmod o+x /home/ubuntu/sample-express-flask-app/

    # Grant execute permissions to 'others' for your backend directory
    chmod o+x /home/ubuntu/sample-express-flask-app/backend/
    ```

2.  **Restart Flask Backend Service:**
    This ensures the socket is recreated with correct permissions after directory changes.
    ```bash
    sudo systemctl restart flask_backend
    sudo systemctl status flask_backend # Verify it's running
    ```

---

### **Phase 8: Whitelist EC2 IP in MongoDB Atlas (Troubleshooting Fix)**

This step resolves the `SSL handshake failed` error when Flask tried to connect to MongoDB.

1.  **Find your EC2 Instance's Public IPv4 Address:**
    * Go to your AWS EC2 console, select your running instance, and find its "Public IPv4 address".
2.  **Add this IP to MongoDB Atlas Network Access:**
    * Log in to your **MongoDB Atlas dashboard**.
    * Navigate to **"Security" > "Network Access"**.
    * Click **"ADD IP ADDRESS"**.
    * **Manually enter your EC2 instance's Public IPv4 address.**
    * Click **"Confirm"**.
    * (Optional: For temporary testing, you could use `0.0.0.0/0` "Allow Access from Anywhere", but **highly recommend restricting this later for security**).
    * Allow a minute or two for changes to propagate.
3.  **Restart Flask Backend Service (again):**
    To ensure it attempts the MongoDB connection with the new network settings.
    ```bash
    sudo systemctl restart flask_backend
    sudo systemctl status flask_backend # Verify it's running
    ```

---

### **Phase 9: Final Verification**

1.  **Access Your Application:**
    * Open your web browser and navigate to your EC2 instance's Public IPv4 DNS or Public IP (e.g., `http://your-ec2-instance-public-ip/`).
    * You should see your Node.js frontend (the form).

2.  **Test Form Submission:**
    * Fill out the name and email, and submit the form.
    * You should now see the "Data submitted successfully!" message in your browser.
    * Verify the data has been inserted into your MongoDB Atlas dashboard.

---

### **Phase 10: (Optional) Secure with HTTPS (SSL/TLS)**

Once your application is fully functional over HTTP, securing it with HTTPS is highly recommended for production.

1.  **Pre-requisite:** You must have a registered domain name (e.g., `yourdomain.com`) pointing to your EC2 instance's public IP address via an A record.
2.  **Obtain SSL certificate with Certbot:**
    ```bash
    sudo certbot --nginx -d your_domain.com -d www.your_domain.com # Replace with your actual domain(s)
    ```
    Follow the interactive prompts. Certbot will automatically modify your Nginx config, set up SSL, and configure automatic certificate renewals.

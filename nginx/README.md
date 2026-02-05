# Nginx Configuration

## SSL Certificates

For production, you need SSL certificates. Here are your options:

### Option 1: Let's Encrypt (Free, Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate (automatic)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Certificates will be placed in:
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem

# Update nginx.conf to use these paths
```

### Option 2: Self-Signed Certificate (Development Only)

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# ⚠️ WARNING: Self-signed certificates will show browser warnings
# Only use for local development
```

### Option 3: Commercial Certificate

1. Purchase SSL certificate from provider (DigiCert, Comodo, etc.)
2. Place certificate files in `nginx/ssl/`
3. Update nginx.conf paths

## Configuration

1. **Edit nginx.conf:**
   - Replace `your-domain.com` with your actual domain
   - Update SSL certificate paths
   - Adjust rate limiting if needed

2. **Test configuration:**
   ```bash
   docker-compose exec nginx nginx -t
   ```

3. **Reload Nginx:**
   ```bash
   docker-compose exec nginx nginx -s reload
   ```

## Directory Structure

```
nginx/
├── nginx.conf       # Main Nginx configuration
├── ssl/            # SSL certificates directory
│   ├── cert.pem    # SSL certificate (you provide)
│   └── key.pem     # SSL private key (you provide)
└── README.md       # This file
```

## Security Notes

- Never commit SSL private keys to Git (.gitignore already configured)
- Rotate certificates before expiry
- Use strong SSL protocols (TLSv1.2, TLSv1.3)
- Enable HSTS (already configured)

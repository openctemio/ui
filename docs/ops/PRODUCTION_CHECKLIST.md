# Production Deployment Checklist

**Version:** 1.0.0
**Last Updated:** 2025-12-11

Quick reference checklist for deploying to production. Print this and check off items as you go.

---

## Pre-Deployment

### 1. Code Quality ✅

- [ ] All tests passing (`npm test`)
- [ ] Build successful (`npm run build`)
- [ ] No TypeScript errors
- [ ] No ESLint errors (`npm run lint`)
- [ ] Code reviewed and approved
- [ ] No debug code (console.log, debugger, etc.)
- [ ] No commented-out code blocks

### 2. Environment Variables 🔐

- [ ] Created `.env.production` file
- [ ] All required variables set (check .env.example)
- [ ] **CRITICAL:** `SECURE_COOKIES=true`
- [ ] **CRITICAL:** `NODE_ENV=production`
- [ ] **CRITICAL:** `CSRF_SECRET` generated (64+ chars)
  ```bash
  npm run generate-secret
  ```
- [ ] Keycloak URLs are HTTPS
- [ ] Backend API URL is HTTPS
- [ ] App URL is HTTPS
- [ ] No secrets hardcoded in source code
- [ ] Environment variables added to deployment platform

### 3. Keycloak Configuration 🔑

- [ ] Production Keycloak server running
- [ ] HTTPS enabled on Keycloak
- [ ] Realm created for production
- [ ] Client created and configured
- [ ] **Valid Redirect URIs** updated:
  ```
  https://your-app.com/*
  https://your-app.com/auth/callback
  ```
- [ ] **Web Origins** updated:
  ```
  https://your-app.com
  ```
- [ ] **Logout Redirect URIs** updated:
  ```
  https://your-app.com
  ```
- [ ] Client secret secured (in vault/secrets manager)
- [ ] Test user created for verification

### 4. Backend API 🌐

- [ ] Backend API deployed and accessible
- [ ] HTTPS enabled on backend
- [ ] CORS configured to allow frontend domain
- [ ] API endpoints tested and working
- [ ] Authentication headers accepted
- [ ] Rate limiting configured (if applicable)

### 5. Security 🛡️

- [ ] Security headers configured in `next.config.ts`:
  - [ ] X-Frame-Options: DENY
  - [ ] X-Content-Type-Options: nosniff
  - [ ] Referrer-Policy
  - [ ] Content-Security-Policy
  - [ ] Permissions-Policy
- [ ] HTTPS enforced (no HTTP access)
- [ ] HttpOnly cookies enabled
- [ ] Secure cookies enabled (`SECURE_COOKIES=true`)
- [ ] SameSite cookie policy set
- [ ] CSRF protection enabled
- [ ] No sensitive data in client-side code
- [ ] No API keys exposed in frontend
- [ ] Dependencies updated (no critical vulnerabilities)
  ```bash
  npm audit
  ```

---

## Deployment

### 6. Choose Deployment Method

#### Option A: Vercel ✅ (Recommended)

- [ ] Vercel account created
- [ ] Project connected to Git repository
- [ ] Environment variables added in Vercel dashboard
- [ ] Build command: `npm run build`
- [ ] Output directory: `.next`
- [ ] Node version: 20.x
- [ ] Deploy to preview environment first
- [ ] Verify preview works correctly
- [ ] Deploy to production
- [ ] Custom domain configured (if applicable)
- [ ] DNS records updated

#### Option B: Docker 🐳

- [ ] Dockerfile created
- [ ] `.dockerignore` configured
- [ ] `next.config.ts` has `output: 'standalone'`
- [ ] docker-compose.yml configured
- [ ] Environment variables in docker-compose
- [ ] Image built successfully
  ```bash
  docker build -t nextjs-app .
  ```
- [ ] Container runs locally
  ```bash
  docker run -p 3000:3000 nextjs-app
  ```
- [ ] Nginx reverse proxy configured
- [ ] SSL certificates installed
- [ ] Container deployed to production
- [ ] Health check passing

#### Option C: Traditional Server (VPS/EC2) 💻

- [ ] Node.js 20+ installed
- [ ] PM2 installed globally
  ```bash
  npm install -g pm2
  ```
- [ ] Repository cloned to server
- [ ] Dependencies installed
  ```bash
  npm ci
  ```
- [ ] `.env.production` configured
- [ ] Build completed
  ```bash
  npm run build
  ```
- [ ] App started with PM2
  ```bash
  pm2 start npm --name "nextjs-app" -- start
  pm2 save
  pm2 startup
  ```
- [ ] Nginx installed and configured
- [ ] SSL certificate installed (Let's Encrypt)
- [ ] Nginx restarted
  ```bash
  sudo systemctl restart nginx
  ```

---

## Post-Deployment

### 7. Verification ✅

- [ ] Site accessible at production URL
- [ ] HTTPS working (green padlock)
- [ ] No mixed content warnings
- [ ] Security headers present
  ```bash
  curl -I https://your-app.com
  ```
- [ ] Health check endpoint working
  ```
  https://your-app.com/api/health
  ```

### 8. Authentication Flow 🔐

- [ ] Login page accessible
- [ ] Click "Login" redirects to Keycloak
- [ ] Keycloak login page loads
- [ ] Login with test credentials works
- [ ] Redirects back to app successfully
- [ ] User data displays correctly
- [ ] Protected routes work
- [ ] Unauthorized access blocked
- [ ] Logout works correctly
- [ ] Logout clears session
- [ ] Cannot access protected pages after logout

### 9. API Integration 🔌

- [ ] API calls successful
- [ ] Bearer token included in requests
- [ ] API responses correct
- [ ] Error handling works
- [ ] Loading states display
- [ ] Toast notifications work

### 10. Performance 🚀

- [ ] Lighthouse score > 90 (Performance)
- [ ] First Contentful Paint < 1.8s
- [ ] Time to Interactive < 3.9s
- [ ] No console errors in browser
- [ ] Images optimized and loading
- [ ] Fonts loading correctly
- [ ] Page loads in < 3 seconds
- [ ] No layout shifts (CLS < 0.1)

---

## Monitoring & Operations

### 11. Monitoring Setup 📊

- [ ] Error reporting configured (Sentry)
  ```bash
  npm install @sentry/nextjs
  npx @sentry/wizard@latest -i nextjs
  ```
- [ ] Sentry DSN added to environment variables
- [ ] Test error reporting works
- [ ] Uptime monitoring setup (UptimeRobot, Pingdom, etc.)
- [ ] Performance monitoring enabled
- [ ] Log aggregation configured
- [ ] Alerts configured for:
  - [ ] Server down
  - [ ] High error rate
  - [ ] High response time
  - [ ] Memory/CPU usage

### 12. Logging 📝

- [ ] Application logs accessible
  - **PM2:** `pm2 logs nextjs-app`
  - **Docker:** `docker-compose logs -f`
  - **Vercel:** Dashboard logs
- [ ] Log rotation configured
- [ ] Error logs reviewed
- [ ] No sensitive data in logs

### 13. Backup & Recovery 💾

- [ ] Environment variables backed up in secure vault
- [ ] Keycloak configuration exported
- [ ] Deployment scripts documented
- [ ] Rollback procedure documented
- [ ] Database backup configured (if applicable)
- [ ] Recovery tested in staging

---

## Documentation

### 14. Documentation Updates 📚

- [ ] README.md updated with production URL
- [ ] Deployment guide reviewed ([docs/DEPLOYMENT.md](docs/DEPLOYMENT.md))
- [ ] Architecture diagram updated
- [ ] API endpoints documented
- [ ] Environment variables documented
- [ ] Runbook created for operations team
- [ ] Troubleshooting guide updated

---

## Team Communication

### 15. Stakeholder Notification 📢

- [ ] Team notified of deployment schedule
- [ ] Stakeholders informed of go-live
- [ ] Support team briefed
- [ ] Maintenance window communicated (if needed)
- [ ] Post-deployment email sent

---

## Final Checks

### 16. Go-Live Checklist ✅

- [ ] **All above items completed**
- [ ] Staging environment tested successfully
- [ ] Load testing completed (if applicable)
- [ ] Security audit passed
- [ ] No critical bugs in backlog
- [ ] Support team ready
- [ ] Rollback plan ready
- [ ] Database migrations completed (if applicable)
- [ ] CDN configured (if applicable)
- [ ] Rate limiting tested
- [ ] Error pages customized (404, 500)

### 17. Post-Launch (First 24 Hours) ⏰

- [ ] Monitor error rates
- [ ] Monitor response times
- [ ] Monitor server resources
- [ ] Check for memory leaks
- [ ] Review user feedback
- [ ] Address critical issues immediately
- [ ] Document any issues for retrospective

---

## Quick Command Reference

### Build & Test
```bash
npm run build      # Build for production
npm test           # Run tests
npm run lint       # Check code quality
npm audit          # Security audit
```

### Deployment
```bash
# Vercel
vercel --prod

# Docker
docker-compose up -d

# PM2
pm2 start npm --name "nextjs-app" -- start
pm2 logs nextjs-app
```

### Monitoring
```bash
# Check site
curl -I https://your-app.com

# View logs
pm2 logs           # PM2
docker logs -f     # Docker
vercel logs        # Vercel

# Check resources
pm2 monit          # PM2
docker stats       # Docker
```

---

## Support Contacts

**Technical Lead:** [Name] - [email@example.com]
**DevOps:** [Name] - [email@example.com]
**Security:** [Name] - [email@example.com]

---

## Sign-Off

### Deployment Approval

- [ ] **Developer:** _________________ Date: _________
- [ ] **Tech Lead:** _________________ Date: _________
- [ ] **DevOps:** ____________________ Date: _________
- [ ] **Security:** __________________ Date: _________
- [ ] **Product Owner:** _____________ Date: _________

---

**Deployment Date:** ______________
**Deployment Time:** ______________
**Deployed By:** __________________
**Version:** ______________________
**Environment:** Production

---

## Notes

_Add any deployment-specific notes, issues encountered, or special configurations:_

```
[Space for notes]
```

---

**Status:**
- [ ] Deployment Complete
- [ ] Verified Working
- [ ] Team Notified
- [ ] Documentation Updated

---

**🎉 Congratulations on your production deployment!**

For issues or questions, refer to:
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - Full deployment guide
- [docs/auth/TROUBLESHOOTING.md](docs/auth/TROUBLESHOOTING.md) - Common issues
- [RELEASE_READINESS.md](RELEASE_READINESS.md) - Release assessment

---

**Last Updated:** 2025-12-11
**Version:** 1.0.0

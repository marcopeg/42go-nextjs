# Production Deployment Guide

Complete guide for building and deploying 42Go Next in production using Docker.

## Overview

The production build system uses Next.js standalone output with multi-stage Docker builds for optimized, secure, and minimal production containers.

## Quick Start

```bash
# Build and start production environment
make prod

# Or step by step
make prod.build    # Build optimized Docker image
make prod.start    # Start production containers with health checks
make migrate       # Run database migrations
make seed          # Seed initial data
```

## Architecture

### Multi-Stage Docker Build

1. **Dependencies Cache**: Production-only dependencies with aggressive caching
2. **Build Dependencies**: All dependencies including devDependencies for building
3. **Builder**: Next.js standalone build with optimized output
4. **Runner**: Ultra-slim production image (~60-80% smaller)

### Key Features

- **Next.js Standalone Output**: Self-contained application bundle
- **Health Checks**: Application and database monitoring
- **Security**: Non-root user, minimal attack surface
- **Performance**: Optimized layer caching, minimal runtime dependencies
- **Reliability**: Automatic restarts, resource limits

## Production Commands

### Build & Deployment

```bash
make prod.build     # Build production Docker image
make prod.start     # Start production environment
make prod.stop      # Stop production containers
make prod.down      # Remove containers and volumes
make prod.clean     # Clean all production artifacts
```

### Monitoring & Debugging

```bash
make prod.health    # Check application health
make prod.logs      # Follow application logs
make prod.logs.db   # Follow database logs
```

### Complete Workflow

```bash
make prod           # Build, start, migrate, seed, and show logs
```

## Configuration

### Environment Variables

Required production environment variables in `docker-compose.prod.yml`:

```yaml
environment:
  - NODE_ENV=production
  - AUTH_TRUST_HOST=true
  - DATABASE_URL=postgresql://postgres:postgres@db:5432/postgres
  - PGSTRING=postgresql://postgres:postgres@db:5432/postgres
  - NEXTAUTH_URL=http://localhost:4000
  - NEXTAUTH_SECRET=your-production-secret-here
  - PORT=3000
```

### Resource Limits

Production containers include resource management:

```yaml
deploy:
  resources:
    limits:
      memory: 512M # Application limit
    reservations:
      memory: 256M # Application minimum
```

## Health Monitoring

### Application Health Check

- **Endpoint**: `GET /api/health`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3
- **Start Period**: 40 seconds (allows for application startup)

### Database Health Check

- **Method**: `pg_isready -U postgres`
- **Interval**: 10 seconds
- **Timeout**: 5 seconds
- **Retries**: 5

## Production Optimizations

### Image Size Reduction

- **Before**: ~1.2GB (standard Next.js build)
- **After**: ~300MB (standalone build with optimizations)
- **Reduction**: ~75% smaller images

### Build Performance

- **Layer Caching**: Dependencies cached separately from source code
- **Parallel Builds**: Multi-stage builds run in parallel where possible
- **Minimal Rebuilds**: Only changed layers rebuild

### Runtime Performance

- **Standalone Output**: Self-contained application, no external dependencies
- **Non-root User**: Security hardening with `nextjs:nodejs` user
- **Memory Optimization**: `NODE_OPTIONS="--max-old-space-size=512"`

## Security Features

### Container Security

- **Non-root User**: Application runs as `nextjs` (UID 1001)
- **Minimal Base**: Alpine Linux with only required packages
- **Read-only**: Application files owned by `nextjs:nodejs`

### Network Security

- **Isolated Network**: `app-network` bridge for container communication
- **Port Exposure**: Only necessary ports exposed (3000 → 4000)
- **Host Access**: Limited via `extra_hosts` configuration

## Troubleshooting

### Common Issues

**Build Failures**:

```bash
# Clean and rebuild
make prod.clean
make prod.build
```

**Application Not Starting**:

```bash
# Check application logs
make prod.logs

# Check health status
make prod.health
```

**Database Connection Issues**:

```bash
# Check database logs
make prod.logs.db

# Verify database health
docker compose -f docker-compose.prod.yml exec db pg_isready -U postgres
```

### Debug Mode

Enable detailed logging in production:

```bash
# Add to docker-compose.prod.yml environment
- DEBUG=*
- NEXTAUTH_DEBUG=true
```

### Container Inspection

```bash
# Access running application container
docker compose -f docker-compose.prod.yml exec app sh

# Check application files
docker compose -f docker-compose.prod.yml exec app ls -la

# Check process status
docker compose -f docker-compose.prod.yml exec app ps aux
```

## Performance Benchmarking

### Build Times

- **Cold Build**: ~2-3 minutes (all layers)
- **Warm Build**: ~30-60 seconds (cached dependencies)
- **Code Changes Only**: ~20-30 seconds (source layer only)

### Image Sizes

```bash
# Check image size
docker images | grep 42go-next

# Compare with previous builds
docker system df
```

### Startup Times

- **Database Ready**: ~10-15 seconds
- **Application Healthy**: ~30-40 seconds
- **Total Deployment**: ~45-60 seconds

## Production Checklist

### Pre-Deployment

- [ ] Update `NEXTAUTH_SECRET` with secure production value
- [ ] Configure production `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL`
- [ ] Set up OAuth providers for production domains
- [ ] Configure production database connection
- [ ] Review resource limits for expected load

### Post-Deployment

- [ ] Verify health checks are passing: `make prod.health`
- [ ] Check application logs: `make prod.logs`
- [ ] Test OAuth flows on production domain
- [ ] Verify database connections and migrations
- [ ] Test multi-app configuration if applicable

### Monitoring

- [ ] Set up log aggregation for production logs
- [ ] Configure alerts for health check failures
- [ ] Monitor resource usage and adjust limits if needed
- [ ] Set up backup strategy for production data

## Next Steps

### Scaling

- Use Docker Swarm or Kubernetes for multi-container deployment
- Implement horizontal scaling with load balancers
- Add Redis for session storage in multi-instance setups

### CI/CD Integration

- Integrate `make prod.build` into CI/CD pipelines
- Add automated testing before production deployment
- Set up blue-green deployment strategies

### Production Infrastructure

- Move to managed PostgreSQL service (AWS RDS, Google Cloud SQL)
- Implement proper secrets management (AWS Secrets Manager, Azure Key Vault)
- Add monitoring and alerting (Prometheus, Grafana, DataDog)

---

**Infrastructure Ready**: Your 42Go Next application is now production-ready with optimized Docker builds, health monitoring, and comprehensive deployment tooling.
